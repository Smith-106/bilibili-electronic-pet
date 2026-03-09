import pytest

from app.services import collector as collector_service
from app.services.collector import (
    collect_official_connector_event,
    collect_platform_event,
    collect_poller_event,
    collect_webhook_event,
    get_platform_collector,
)


def test_collect_webhook_event_maps_standard_fields():
    event = collect_webhook_event(
        {
            "comment_id": "c-webhook-1",
            "video_id": "v-1",
            "user_id": "u-1",
            "content": "hello webhook",
            "parent_id": "p-1",
        }
    )

    assert event.comment_id == "c-webhook-1"
    assert event.video_id == "v-1"
    assert event.user_id == "u-1"
    assert event.content == "hello webhook"
    assert event.parent_id == "p-1"


def test_collect_poller_event_maps_source_fields():
    event = collect_poller_event(
        {
            "id": "c-poller-1",
            "oid": "v-2",
            "mid": 10086,
            "message": "hello poller",
            "root": "p-2",
        }
    )

    assert event.comment_id == "c-poller-1"
    assert event.video_id == "v-2"
    assert event.user_id == "10086"
    assert event.content == "hello poller"
    assert event.parent_id == "p-2"


def test_collect_official_event_maps_nested_fields():
    event = collect_official_connector_event(
        {
            "data": {
                "commentId": "c-official-1",
                "videoId": "v-3",
                "userId": "u-3",
                "message": "hello official",
                "parentId": "p-3",
            }
        }
    )

    assert event.comment_id == "c-official-1"
    assert event.video_id == "v-3"
    assert event.user_id == "u-3"
    assert event.content == "hello official"
    assert event.parent_id == "p-3"


def test_collect_bilibili_platform_event_maps_fields():
    event = collect_platform_event(
        {
            "rpid": "c-bili-1",
            "aid": "v-bili-1",
            "mid": 9527,
            "message": "hello bilibili",
            "root": "p-bili-1",
        },
        "bilibili",
    )

    assert event.comment_id == "c-bili-1"
    assert event.video_id == "v-bili-1"
    assert event.user_id == "9527"
    assert event.content == "hello bilibili"
    assert event.parent_id == "p-bili-1"


def test_collect_douyin_platform_event_maps_fields():
    event = collect_platform_event(
        {
            "item_id": "c-douyin-1",
            "aweme_id": "v-douyin-1",
            "sec_uid": "u-douyin-1",
            "text": "hello douyin",
            "reply_id": "p-douyin-1",
        },
        "douyin",
    )

    assert event.comment_id == "c-douyin-1"
    assert event.video_id == "v-douyin-1"
    assert event.user_id == "u-douyin-1"
    assert event.content == "hello douyin"
    assert event.parent_id == "p-douyin-1"


def test_collect_kuaishou_platform_event_maps_fields():
    event = collect_platform_event(
        {
            "comment_id_str": "c-ks-1",
            "photo_id": "v-ks-1",
            "author_id": "u-ks-1",
            "message": "hello kuaishou",
            "root_comment_id": "p-ks-1",
        },
        "kuaishou",
    )

    assert event.comment_id == "c-ks-1"
    assert event.video_id == "v-ks-1"
    assert event.user_id == "u-ks-1"
    assert event.content == "hello kuaishou"
    assert event.parent_id == "p-ks-1"


def test_collect_poller_event_missing_required_fields():
    with pytest.raises(ValueError) as exc_info:
        collect_poller_event({"id": "c-missing-1", "oid": "v-9", "mid": "u-9"})

    assert "invalid_poller_payload" in str(exc_info.value)
    assert "missing_fields=content" in str(exc_info.value)


def test_collect_platform_event_uses_platform_collector_adapter(monkeypatch):
    calls: list[dict] = []
    adapter = get_platform_collector("bilibili")
    original = adapter.collect

    def fake_collect(payload):
        calls.append(payload)
        return original(payload)

    monkeypatch.setattr(adapter, "collect", fake_collect)

    event = collect_platform_event(
        {
            "rpid": "c-bili-adapter-1",
            "aid": "v-bili-adapter-1",
            "mid": 13579,
            "message": "hello adapter",
        },
        "bilibili",
    )

    assert event.comment_id == "c-bili-adapter-1"
    assert len(calls) == 1
    assert calls[0]["rpid"] == "c-bili-adapter-1"


def test_get_platform_collector_source_reads_platform_config(monkeypatch):
    monkeypatch.setattr(
        collector_service,
        "get_platform_config",
        lambda platform: {
            "enabled_attr": "platform_bilibili_enabled",
            "source_attr": "platform_bilibili_publish_source",
            "default_source": "bilibili-bot",
            "collector_source": "bilibili",
        },
    )

    assert collector_service.get_platform_collector_source("bilibili") == "bilibili"


def test_get_platform_collector_source_invalid_platform_raises_value_error(monkeypatch):
    def fake_get_platform_config(platform):
        raise KeyError(platform)

    monkeypatch.setattr(collector_service, "get_platform_config", fake_get_platform_config)

    with pytest.raises(ValueError) as exc_info:
        collector_service.get_platform_collector_source("unknown")

    assert str(exc_info.value) == "unsupported_platform: unknown"
