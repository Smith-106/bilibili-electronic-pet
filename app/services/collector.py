from collections.abc import Callable, Mapping
from typing import Any

from pydantic import ValidationError

from app.schemas import CollectorSource, CommentEvent, PlatformName

_REQUIRED_FIELDS = ("comment_id", "video_id", "user_id", "content")
_SUPPORTED_PLATFORM_SOURCES: dict[PlatformName, CollectorSource] = {
    "bilibili": "bilibili",
    "douyin": "douyin",
    "kuaishou": "kuaishou",
}


def collect_comment_event(
    payload: CommentEvent | Mapping[str, Any],
    *,
    source: CollectorSource = "webhook",
) -> CommentEvent:
    if isinstance(payload, CommentEvent):
        return payload

    if not isinstance(payload, Mapping):
        raise ValueError(f"invalid_{source}_payload: payload_must_be_object")

    mapper = _SOURCE_MAPPERS.get(source)
    if mapper is None:
        raise ValueError(f"unsupported_collector_source: {source}")

    mapped = mapper(payload)
    return _build_comment_event(mapped, source)


def collect_webhook_event(payload: CommentEvent | Mapping[str, Any]) -> CommentEvent:
    return collect_comment_event(payload, source="webhook")


def collect_poller_event(payload: Mapping[str, Any]) -> CommentEvent:
    return collect_comment_event(payload, source="poller")


def collect_official_connector_event(payload: Mapping[str, Any]) -> CommentEvent:
    return collect_comment_event(payload, source="official")


def collect_platform_event(payload: Mapping[str, Any], platform: PlatformName) -> CommentEvent:
    source = _SUPPORTED_PLATFORM_SOURCES.get(platform)
    if source is None:
        raise ValueError(f"unsupported_platform: {platform}")
    return collect_comment_event(payload, source=source)


def _build_comment_event(mapped: dict[str, Any], source: CollectorSource) -> CommentEvent:
    normalized = dict(mapped)
    for field in ("comment_id", "video_id", "user_id", "parent_id", "trace_id"):
        value = normalized.get(field)
        if value is not None and not isinstance(value, str):
            normalized[field] = str(value)

    content = normalized.get("content")
    if content is not None and not isinstance(content, str):
        normalized["content"] = str(content)

    missing_fields = [field for field in _REQUIRED_FIELDS if _is_blank(normalized.get(field))]
    if missing_fields:
        joined = ",".join(missing_fields)
        raise ValueError(f"invalid_{source}_payload: missing_fields={joined}")

    try:
        return CommentEvent.model_validate(normalized)
    except ValidationError as exc:
        raise ValueError(f"invalid_{source}_payload: {_format_validation_error(exc)}") from exc


def _map_webhook_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "comment_id": _pick_first(payload, "comment_id", "commentId"),
        "video_id": _pick_first(payload, "video_id", "videoId"),
        "user_id": _pick_first(payload, "user_id", "userId"),
        "content": _pick_first(payload, "content", "message"),
        "parent_id": _pick_first(payload, "parent_id", "parentId"),
        "trace_id": _pick_first(payload, "trace_id", "traceId", "meta.trace_id", "meta.traceId"),
    }


def _map_poller_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "comment_id": _pick_first(payload, "comment_id", "id", "rpid", "event.comment_id", "event.id", "event.rpid"),
        "video_id": _pick_first(payload, "video_id", "oid", "video_id", "aid", "event.video_id", "event.oid"),
        "user_id": _pick_first(payload, "user_id", "mid", "uid", "event.user_id", "event.mid"),
        "content": _pick_first(
            payload,
            "content",
            "message",
            "text",
            "content.message",
            "event.content",
            "event.message",
            "event.content.message",
        ),
        "parent_id": _pick_first(payload, "parent_id", "root", "parent", "event.parent_id", "event.root"),
        "trace_id": _pick_first(
            payload,
            "trace_id",
            "traceId",
            "event.trace_id",
            "event.traceId",
            "meta.trace_id",
            "meta.traceId",
        ),
    }


def _map_official_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "comment_id": _pick_first(
            payload,
            "comment_id",
            "commentId",
            "data.comment_id",
            "data.commentId",
            "event.comment_id",
            "event.commentId",
        ),
        "video_id": _pick_first(
            payload,
            "video_id",
            "videoId",
            "data.video_id",
            "data.videoId",
            "event.video_id",
            "event.videoId",
        ),
        "user_id": _pick_first(
            payload,
            "user_id",
            "userId",
            "data.user_id",
            "data.userId",
            "event.user_id",
            "event.userId",
        ),
        "content": _pick_first(
            payload,
            "content",
            "message",
            "data.content",
            "data.message",
            "event.content",
            "event.message",
            "event.content.message",
        ),
        "parent_id": _pick_first(
            payload,
            "parent_id",
            "parentId",
            "data.parent_id",
            "data.parentId",
            "event.parent_id",
            "event.parentId",
        ),
        "trace_id": _pick_first(
            payload,
            "trace_id",
            "traceId",
            "data.trace_id",
            "data.traceId",
            "event.trace_id",
            "event.traceId",
            "meta.trace_id",
            "meta.traceId",
        ),
    }


def _map_bilibili_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "comment_id": _pick_first(payload, "comment_id", "commentId", "rpid", "event.comment_id", "event.rpid"),
        "video_id": _pick_first(payload, "video_id", "videoId", "aid", "bvid", "event.video_id", "event.aid"),
        "user_id": _pick_first(payload, "user_id", "userId", "mid", "event.user_id", "event.mid"),
        "content": _pick_first(
            payload,
            "content",
            "message",
            "text",
            "event.content",
            "event.message",
            "event.content.message",
        ),
        "parent_id": _pick_first(payload, "parent_id", "parentId", "root", "event.parent_id", "event.root"),
        "trace_id": _pick_first(payload, "trace_id", "traceId", "event.trace_id", "event.traceId", "meta.trace_id"),
    }


def _map_douyin_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "comment_id": _pick_first(payload, "comment_id", "commentId", "item_id", "event.comment_id", "event.item_id"),
        "video_id": _pick_first(payload, "video_id", "videoId", "aweme_id", "event.video_id", "event.aweme_id"),
        "user_id": _pick_first(payload, "user_id", "userId", "sec_uid", "uid", "event.user_id", "event.sec_uid"),
        "content": _pick_first(
            payload,
            "content",
            "text",
            "message",
            "event.content",
            "event.text",
            "event.message",
        ),
        "parent_id": _pick_first(payload, "parent_id", "parentId", "reply_id", "event.parent_id", "event.reply_id"),
        "trace_id": _pick_first(payload, "trace_id", "traceId", "event.trace_id", "event.traceId", "meta.trace_id"),
    }


def _map_kuaishou_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "comment_id": _pick_first(payload, "comment_id", "commentId", "comment_id_str", "event.comment_id"),
        "video_id": _pick_first(payload, "video_id", "videoId", "photo_id", "event.video_id", "event.photo_id"),
        "user_id": _pick_first(payload, "user_id", "userId", "author_id", "uid", "event.user_id", "event.author_id"),
        "content": _pick_first(
            payload,
            "content",
            "text",
            "message",
            "event.content",
            "event.text",
            "event.message",
        ),
        "parent_id": _pick_first(payload, "parent_id", "parentId", "root_comment_id", "event.parent_id", "event.root_comment_id"),
        "trace_id": _pick_first(payload, "trace_id", "traceId", "event.trace_id", "event.traceId", "meta.trace_id"),
    }


def _pick_first(payload: Mapping[str, Any], *paths: str) -> Any:
    for path in paths:
        value = _read_path(payload, path)
        if value is not None:
            return value
    return None


def _read_path(payload: Mapping[str, Any], path: str) -> Any:
    current: Any = payload
    for part in path.split("."):
        if not isinstance(current, Mapping) or part not in current:
            return None
        current = current[part]
    return current


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _format_validation_error(exc: ValidationError) -> str:
    details = []
    for item in exc.errors():
        location = ".".join(str(part) for part in item.get("loc", []))
        message = str(item.get("msg", "invalid"))
        details.append(f"{location}:{message}")
    return "; ".join(details) if details else "validation_failed"


_SOURCE_MAPPERS: dict[CollectorSource, Callable[[Mapping[str, Any]], dict[str, Any]]] = {
    "webhook": _map_webhook_payload,
    "poller": _map_poller_payload,
    "official": _map_official_payload,
    "bilibili": _map_bilibili_payload,
    "douyin": _map_douyin_payload,
    "kuaishou": _map_kuaishou_payload,
}
