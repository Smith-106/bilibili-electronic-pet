from app.schemas import CommentEvent
from app.services.decider import LONG_COMMENT_MIN_CHARS, SHORT_COMMENT_MAX_CHARS, decide_length, should_reply
from app.settings import settings


def test_decide_length_boundaries():
    assert decide_length("a" * SHORT_COMMENT_MAX_CHARS) == "short"
    assert decide_length("a" * (SHORT_COMMENT_MAX_CHARS + 1)) == "medium"
    assert decide_length("a" * (LONG_COMMENT_MIN_CHARS - 1)) == "medium"
    assert decide_length("a" * LONG_COMMENT_MIN_CHARS) == "long"


def test_decide_length_force_long_priority():
    assert decide_length("短", force_long=True) == "long"


def test_should_reply_skip_keyword_keep_decision_output():
    event = CommentEvent(
        comment_id="c-1",
        video_id="v-1",
        user_id="u-1",
        content="加群私聊了解一下",
        force_long=True,
    )

    should, style_mode, length_mode = should_reply(event)

    assert should is False
    assert style_mode == "normal"
    assert length_mode == "long"


def test_should_reply_uses_requested_style_profile_override():
    event = CommentEvent(
        comment_id="c-2",
        video_id="v-1",
        user_id="u-1",
        content="今天很开心哈哈",
        force_long=False,
        style_profile="empathy",
    )

    should, style_mode, _ = should_reply(event)

    assert should is True
    assert style_mode == "empathy"


def test_should_reply_uses_configured_style_profile_when_request_auto(monkeypatch):
    original = settings.style_profile_default
    monkeypatch.setattr(settings, "style_profile_default", "meme")
    try:
        event = CommentEvent(
            comment_id="c-3",
            video_id="v-1",
            user_id="u-1",
            content="我最近有点委屈",
            force_long=False,
            style_profile="auto",
        )

        should, style_mode, _ = should_reply(event)

        assert should is True
        assert style_mode == "meme"
    finally:
        monkeypatch.setattr(settings, "style_profile_default", original)
