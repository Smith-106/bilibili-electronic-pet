from app.schemas import CommentEvent
from app.services.decider import LONG_COMMENT_MIN_CHARS, SHORT_COMMENT_MAX_CHARS, decide_length, should_reply


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
