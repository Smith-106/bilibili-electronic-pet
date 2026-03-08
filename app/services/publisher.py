from datetime import datetime, timezone
from typing import Any, Protocol

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.schemas import PlatformName
from app.services.hashing import sign_payload
from app.services.platforms import get_platform_config, get_platform_publish_source
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


def _parse_publish_result(data: dict[str, Any], default_reason: str) -> tuple[bool, str]:
    ok = bool(data.get("ok", True))
    published = bool(data.get("published", ok))
    reason = str(data.get("reason", default_reason))
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
            return False, "webhook_url_missing", None

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
                return True, reason, datetime.now(timezone.utc)
            return False, reason, None
        except Exception as exc:
            return False, f"webhook_error:{type(exc).__name__}", None


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
            return False, "real_publish_url_missing", None

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
                return True, reason, datetime.now(timezone.utc)
            return False, reason, None
        except Exception as exc:
            return False, f"real_publish_error:{type(exc).__name__}", None


def _get_publisher() -> PublisherAdapter:
    mode = settings.publisher_mode.lower().strip()
    if mode == "simulated":
        return SimulatedPublisher()
    if mode == "webhook":
        return WebhookPublisher()
    if mode == "real_publish":
        return RealPublishPublisher()
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
