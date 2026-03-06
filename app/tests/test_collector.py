import pytest

from app.services.collector import collect_official_connector_event, collect_poller_event, collect_webhook_event


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


def test_collect_poller_event_missing_required_fields():
    with pytest.raises(ValueError) as exc_info:
        collect_poller_event({"id": "c-missing-1", "oid": "v-9", "mid": "u-9"})

    assert "invalid_poller_payload" in str(exc_info.value)
    assert "missing_fields=content" in str(exc_info.value)
