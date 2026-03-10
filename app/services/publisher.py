import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.schemas import PlatformName
from app.services.hashing import sign_payload
from app.services.platforms import get_platform_config, get_platform_publish_source
from app.services.provider_registry import ProviderRegistry
from app.settings import settings


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
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    def _send(self, payload: dict, headers: dict) -> httpx.Response:
        with httpx.Client(timeout=settings.publisher_timeout_seconds) as client:
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
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    def _send(self, payload: dict, headers: dict) -> httpx.Response:
        with httpx.Client(timeout=settings.publisher_timeout_seconds) as client:
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


def _get_publisher() -> PublisherAdapter:
    mode = settings.publisher_mode.lower().strip()
    try:
        return _PUBLISHER_REGISTRY.resolve(mode)
    except KeyError:
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
) -> tuple[bool, str, datetime | None]:
    publisher = _get_publisher()
    return publisher.publish(
        comment_id=comment_id,
        reply_text=reply_text,
        force_publish=force_publish,
        trace_id=trace_id,
    )


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
