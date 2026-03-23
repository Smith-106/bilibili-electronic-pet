import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_fixed

from app.schemas import PlatformName
from app.services.hashing import sign_payload
from app.services.platforms import get_platform_config, get_platform_publish_source
from app.services.provider_registry import ProviderRegistry
from app.settings import settings

logger = logging.getLogger(__name__)


class PublisherAdapter(Protocol):
    def publish(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None]:
        ... 


STANDARD_PUBLISH_FAILURE_REASONS = {"timeout", "5xx", "auth", "invalid_response"}

_TIMEOUT_HINTS = ("timeout", "timedout", "readtimeout", "connecttimeout")
_AUTH_HINTS = ("401", "403", "unauthorized", "forbidden", "token", "signature", "auth")


@dataclass
class _CircuitBreakerState:
    consecutive_failures: int = 0
    opened_until: datetime | None = None
    half_open_probe_in_flight: bool = False


_PUBLISH_CIRCUIT_STATE: dict[str, _CircuitBreakerState] = {
    "webhook": _CircuitBreakerState(),
    "real_publish": _CircuitBreakerState(),
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_publish_failure_reason(reason: str | None) -> str:
    normalized = str(reason or "").strip().lower()
    if not normalized:
        return "invalid_response"
    if normalized in STANDARD_PUBLISH_FAILURE_REASONS:
        return normalized
    if any(token in normalized for token in _TIMEOUT_HINTS):
        return "timeout"
    if re.search(r"(?<!\d)5\d\d(?!\d)", normalized):
        return "5xx"
    if any(token in normalized for token in _AUTH_HINTS):
        return "auth"
    return "invalid_response"


def _normalize_exception_reason(exc: Exception) -> str:
    if isinstance(exc, httpx.TimeoutException):
        return "timeout"
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = int(exc.response.status_code) if exc.response is not None else 0
        if 500 <= status_code <= 599:
            return "5xx"
        if status_code in {401, 403}:
            return "auth"
        if status_code == 408:
            return "timeout"
        return "invalid_response"
    if isinstance(exc, httpx.RequestError):
        return normalize_publish_failure_reason(type(exc).__name__)
    return "invalid_response"


def _is_circuit_enabled() -> bool:
    return bool(getattr(settings, "publisher_circuit_breaker_enabled", True))


def _get_circuit_state(channel: str) -> _CircuitBreakerState:
    if channel not in _PUBLISH_CIRCUIT_STATE:
        _PUBLISH_CIRCUIT_STATE[channel] = _CircuitBreakerState()
    return _PUBLISH_CIRCUIT_STATE[channel]


def _check_circuit_before_send(channel: str) -> bool:
    if not _is_circuit_enabled():
        return True

    state = _get_circuit_state(channel)
    now = _utc_now()
    if state.opened_until and now < state.opened_until:
        return False
    if state.opened_until and now >= state.opened_until:
        if state.half_open_probe_in_flight:
            return False
        state.half_open_probe_in_flight = True
        return True
    return True


def _record_circuit_success(channel: str) -> None:
    if not _is_circuit_enabled():
        return
    state = _get_circuit_state(channel)
    state.consecutive_failures = 0
    state.opened_until = None
    state.half_open_probe_in_flight = False


def _record_circuit_failure(channel: str) -> None:
    if not _is_circuit_enabled():
        return

    state = _get_circuit_state(channel)
    threshold = max(1, int(getattr(settings, "publisher_circuit_failure_threshold", 3)))
    open_seconds = max(1, int(getattr(settings, "publisher_circuit_open_seconds", 30)))

    state.consecutive_failures += 1
    state.half_open_probe_in_flight = False
    if state.consecutive_failures >= threshold:
        state.opened_until = _utc_now() + timedelta(seconds=open_seconds)


def _parse_publish_result(data: dict[str, Any], default_reason: str) -> tuple[bool, str]:
    ok = bool(data.get("ok", True))
    published = bool(data.get("published", ok))
    reason = str(data.get("reason", default_reason))
    if not (ok and published):
        reason = normalize_publish_failure_reason(reason)
    return ok and published, reason


class ManualQueuePublisher:
    def publish(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None]:
        _ = comment_id, reply_text, force_publish, trace_id
        return False, "manual_queue", None


class SimulatedPublisher:
    def publish(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None]:
        _ = comment_id, reply_text, trace_id
        if force_publish:
            return True, "approved_simulated_publish", datetime.now(timezone.utc)
        return True, "simulated_auto_publish", datetime.now(timezone.utc)


class WebhookPublisher:
    # ⚡ Perf: Reuse a single httpx.Client across requests to benefit from
    # HTTP keep-alive and connection pooling, avoiding per-request TCP/TLS
    # handshake overhead.
    def __init__(self) -> None:
        self._client: httpx.Client | None = None

    def _get_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(timeout=settings.publisher_timeout_seconds)
        return self._client

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    def _send(self, payload: dict, headers: dict) -> httpx.Response:
        client = self._get_client()
        response = client.post(settings.publisher_webhook_url, json=payload, headers=headers)
        response.raise_for_status()
        return response

    def publish(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None]:
        if not settings.publisher_webhook_url:
            return False, "invalid_response", None
        if not _check_circuit_before_send("webhook"):
            return False, "invalid_response", None

        payload = {
            "comment_id": comment_id,
            "reply_text": reply_text,
            "force_publish": force_publish,
            "source": "bili-pet-bot",
            "ts": int(datetime.now(timezone.utc).timestamp()),
        }
        if trace_id:
            payload["trace_id"] = trace_id
        headers = {"Content-Type": "application/json"}
        if settings.publisher_webhook_token:
            headers["Authorization"] = f"Bearer {settings.publisher_webhook_token}"
        if settings.publisher_hmac_secret:
            headers["X-Signature"] = sign_payload(payload, settings.publisher_hmac_secret)

        try:
            response = self._send(payload, headers)
            data = response.json() if response.content else {}
            published, reason = _parse_publish_result(data, "webhook_response")
            if published:
                _record_circuit_success("webhook")
                return True, reason, _utc_now()
            _record_circuit_failure("webhook")
            return False, reason, None
        except Exception as exc:
            _record_circuit_failure("webhook")
            return False, _normalize_exception_reason(exc), None


class RealPublishPublisher:
    # ⚡ Perf: Reuse a single httpx.Client across requests to benefit from
    # HTTP keep-alive and connection pooling, avoiding per-request TCP/TLS
    # handshake overhead.
    def __init__(self) -> None:
        self._client: httpx.Client | None = None

    def _get_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(timeout=settings.publisher_timeout_seconds)
        return self._client

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    def _send(self, payload: dict, headers: dict) -> httpx.Response:
        client = self._get_client()
        response = client.post(settings.publisher_real_publish_url, json=payload, headers=headers)
        response.raise_for_status()
        return response

    def publish(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None]:
        return self.publish_with_source(
            comment_id=comment_id,
            reply_text=reply_text,
            force_publish=force_publish,
            source="bili-pet-bot",
            trace_id=trace_id,
        )

    def publish_with_source(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        source: str = "bili-pet-bot",
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None]:
        if not settings.publisher_real_publish_url:
            return False, "invalid_response", None
        if not _check_circuit_before_send("real_publish"):
            return False, "invalid_response", None

        payload = {
            "comment_id": comment_id,
            "reply_text": reply_text,
            "force_publish": force_publish,
            "source": source,
            "ts": int(datetime.now(timezone.utc).timestamp()),
        }
        if trace_id:
            payload["trace_id"] = trace_id
        headers = {"Content-Type": "application/json"}
        if settings.publisher_real_publish_token:
            headers["Authorization"] = f"Bearer {settings.publisher_real_publish_token}"
        if settings.publisher_hmac_secret:
            headers["X-Signature"] = sign_payload(payload, settings.publisher_hmac_secret)

        try:
            response = self._send(payload, headers)
            data = response.json() if response.content else {}
            published, reason = _parse_publish_result(data, "real_publish_response")
            if published:
                _record_circuit_success("real_publish")
                return True, reason, _utc_now()
            _record_circuit_failure("real_publish")
            return False, reason, None
        except Exception as exc:
            _record_circuit_failure("real_publish")
            return False, _normalize_exception_reason(exc), None


_PUBLISHER_REGISTRY = ProviderRegistry[PublisherAdapter](default_provider="manual_queue")
_PUBLISHER_REGISTRY.register("manual_queue", ManualQueuePublisher())
_PUBLISHER_REGISTRY.register("simulated", SimulatedPublisher())
_PUBLISHER_REGISTRY.register("webhook", WebhookPublisher())
_PUBLISHER_REGISTRY.register("real_publish", RealPublishPublisher())


# Bilibili publisher session management
_BILIBILI_PUBLISHER_DB: Session | None = None
_BILIBILI_PUBLISHER_INSTANCE: PublisherAdapter | None = None


def _get_bilibili_publisher() -> PublisherAdapter | None:
    """获取 B站发布器（如果启用）

    注意：使用单例模式管理数据库会话，避免连接泄漏
    """
    global _BILIBILI_PUBLISHER_DB, _BILIBILI_PUBLISHER_INSTANCE

    if not (settings.bilibili_enabled and settings.bilibili_publish_enabled):
        return None

    # 如果已有实例且数据库会话有效，直接返回
    if _BILIBILI_PUBLISHER_INSTANCE is not None and _BILIBILI_PUBLISHER_DB is not None:
        try:
            # 检查会话是否有效
            _BILIBILI_PUBLISHER_DB.execute(text("SELECT 1"))
            return _BILIBILI_PUBLISHER_INSTANCE
        except Exception:
            # 会话无效，重新创建
            _BILIBILI_PUBLISHER_INSTANCE = None
            if _BILIBILI_PUBLISHER_DB:
                try:
                    _BILIBILI_PUBLISHER_DB.close()
                except Exception:
                    pass
                _BILIBILI_PUBLISHER_DB = None

    try:
        from app.services.bilibili_publisher import BilibiliPublisherAdapter
        from app.db import SessionLocal

        _BILIBILI_PUBLISHER_DB = SessionLocal()
        _BILIBILI_PUBLISHER_INSTANCE = BilibiliPublisherAdapter(_BILIBILI_PUBLISHER_DB)
        return _BILIBILI_PUBLISHER_INSTANCE
    except ImportError:
        logger.warning("bilibili_publisher_not_available")
        return None
    except Exception as e:
        logger.error(f"bilibili_publisher_init_failed | error={e}")
        return None


def close_bilibili_publisher() -> None:
    """关闭 B站发布器及其数据库连接

    应在应用关闭时调用
    """
    global _BILIBILI_PUBLISHER_DB, _BILIBILI_PUBLISHER_INSTANCE

    if _BILIBILI_PUBLISHER_DB is not None:
        try:
            _BILIBILI_PUBLISHER_DB.close()
        except Exception:
            pass
        _BILIBILI_PUBLISHER_DB = None

    _BILIBILI_PUBLISHER_INSTANCE = None


def _get_publisher() -> PublisherAdapter:
    """
    Resolve the active publisher adapter based on configuration precedence.

    Precedence Rule (highest to lowest priority):
    1. Native Bilibili publisher (if bilibili_enabled=True AND bilibili_publish_enabled=True)
    2. Configured publisher_mode (manual_queue, simulated, webhook, real_publish)
    3. ManualQueuePublisher fallback (for unsupported publisher_mode values)

    Note: When native Bilibili publishing is enabled, it ALWAYS takes precedence over
    publisher_mode. This is intentional design: native platform integration is preferred
    when available. Configure with care when using webhook or real_publish modes.
    """
    # Priority 1: Native Bilibili publisher (highest priority)
    if settings.bilibili_enabled and settings.bilibili_publish_enabled:
        bilibili_publisher = _get_bilibili_publisher()
        if bilibili_publisher:
            logger.info(
                "publisher selection: native_bilibili (bilibili_enabled=True, bilibili_publish_enabled=True, "
                "publisher_mode=%s overridden)",
                settings.publisher_mode
            )
            return bilibili_publisher

    # Priority 2: Configured publisher_mode
    mode = settings.publisher_mode.lower().strip()
    try:
        publisher = _PUBLISHER_REGISTRY.resolve(mode)
        logger.info("publisher selection: %s (mode=%s)", publisher.__class__.__name__, mode)
        return publisher
    except KeyError:
        # Priority 3: ManualQueuePublisher fallback (lowest priority)
        logger.warning(
            "publisher selection: manual_queue (mode=%s not recognized, falling back)",
            mode
        )
        return ManualQueuePublisher()


def get_platform_publisher(platform: PlatformName) -> PublisherAdapter:
    config = get_platform_config(platform)
    enabled = bool(getattr(settings, config["enabled_attr"], False))
    if not enabled:
        return ManualQueuePublisher()
    return RealPublishPublisher()


def publish_reply(
    comment_id: str,
    reply_text: str,
    force_publish: bool = False,
    trace_id: str | None = None,
    **kwargs: object,
) -> tuple[bool, str, datetime | None]:
    publisher = _get_publisher()
    return publisher.publish(
        comment_id=comment_id,
        reply_text=reply_text,
        force_publish=force_publish,
        trace_id=trace_id,
        **kwargs,
    )


def publish_reply_with_result(
    comment_id: str,
    reply_text: str,
    force_publish: bool = False,
    trace_id: str | None = None,
    **kwargs: object,
) -> tuple[bool, str, datetime | None, dict[str, object]]:
    publisher = _get_publisher()
    if hasattr(publisher, "publish_with_result"):
        return publisher.publish_with_result(
            comment_id=comment_id,
            reply_text=reply_text,
            force_publish=force_publish,
            trace_id=trace_id,
            **kwargs,
        )

    ok, reason, published_at = publisher.publish(
        comment_id=comment_id,
        reply_text=reply_text,
        force_publish=force_publish,
        trace_id=trace_id,
        **kwargs,
    )
    return ok, reason, published_at, {}


def publish_gateway_reply(
    comment_id: str,
    reply_text: str,
    force_publish: bool = False,
    source: str = "bili-pet-bot",
    trace_id: str | None = None,
) -> tuple[bool, str, datetime | None]:
    publisher = RealPublishPublisher()
    return publisher.publish_with_source(
        comment_id=comment_id,
        reply_text=reply_text,
        force_publish=force_publish,
        source=source,
        trace_id=trace_id,
    )


def publish_platform_reply(
    platform: PlatformName,
    comment_id: str,
    reply_text: str,
    force_publish: bool = False,
    trace_id: str | None = None,
) -> tuple[bool, str, datetime | None]:
    source = get_platform_publish_source(platform)
    publisher = get_platform_publisher(platform)
    if isinstance(publisher, RealPublishPublisher):
        return publisher.publish_with_source(
            comment_id=comment_id,
            reply_text=reply_text,
            force_publish=force_publish,
            source=source,
            trace_id=trace_id,
        )

    return publisher.publish(
        comment_id=comment_id,
        reply_text=reply_text,
        force_publish=force_publish,
        trace_id=trace_id,
    )
