from typing import Any, Literal

from app.schemas import CommentEvent, LengthMode, StyleMode

SHORT_COMMENT_MAX_CHARS = 12
LONG_COMMENT_MIN_CHARS = 81
SafetyDecision = Literal["allow", "manual_queue", "blocked"]


def classify_style(comment_text: str) -> StyleMode:
    text = comment_text.lower()
    if any(keyword in text for keyword in ["难受", "崩溃", "想哭", "失恋", "委屈"]):
        return "empathy"
    if any(keyword in text for keyword in ["哈哈", "笑死", "梗", "离谱"]):
        return "meme"
    return "normal"


def decide_length(comment_text: str, *, force_long: bool = False) -> LengthMode:
    if force_long:
        return "long"

    text_len = len(comment_text.strip())
    if text_len <= SHORT_COMMENT_MAX_CHARS:
        return "short"
    if text_len >= LONG_COMMENT_MIN_CHARS:
        return "long"
    return "medium"


def should_reply(event: CommentEvent) -> tuple[bool, StyleMode, LengthMode]:
    style = classify_style(event.content)
    length_mode = decide_length(event.content, force_long=event.force_long)

    skip_keywords = ["广告", "vx", "加群", "私聊"]
    if any(word in event.content.lower() for word in skip_keywords):
        return False, style, length_mode

    return True, style, length_mode


def decide_safety_action(safe: bool, risk_flags: dict[str, Any] | None) -> SafetyDecision:
    if safe:
        return "allow"

    decision = str((risk_flags or {}).get("decision", "")).strip().lower()
    if decision == "blocked":
        return "blocked"
    if decision == "manual_queue":
        return "manual_queue"

    reason = str((risk_flags or {}).get("reason", "")).strip().lower()
    if reason == "contains_pii":
        return "manual_queue"

    return "blocked"
