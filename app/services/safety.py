import re
from typing import Any, Callable

from app.services.provider_registry import ProviderRegistry
from app.settings import settings


def _max_reply_chars() -> int:
    try:
        return max(int(settings.safety_max_reply_chars), 1)
    except (TypeError, ValueError):
        return 900


def _base_risk_flags(reply_text: str) -> dict[str, Any]:
    return {
        "decision": "allow",
        "reason": "",
        "blocked_words": [],
        "pii_matches": [],
        "triggered_rules": [],
        "max_length": _max_reply_chars(),
        "actual_length": len(reply_text),
    }


def _collect_blocked_words(reply_text: str) -> list[str]:
    blocked_words = settings.safety_keyword_blacklist if settings.safety_enable_keyword_blocklist else []
    return [word for word in blocked_words if word and word in reply_text]


def _collect_pii_matches(reply_text: str) -> list[dict[str, str]]:
    matches: list[dict[str, str]] = []

    if not settings.safety_enable_pii_detection:
        return matches

    for pii_type, pattern in settings.safety_pii_patterns.items():
        try:
            findings = re.findall(pattern, reply_text, flags=re.IGNORECASE)
        except re.error:
            continue

        for finding in findings:
            value = finding
            if isinstance(finding, tuple):
                value = "".join(str(part) for part in finding if part)
            rendered = str(value).strip()
            if rendered:
                matches.append({"type": pii_type, "value": rendered})

    deduped: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for item in matches:
        key = (item["type"], item["value"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


SafetyRule = Callable[[str, dict[str, Any]], tuple[bool, dict[str, Any]]]


def _keyword_blacklist_rule(reply_text: str, risk_flags: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    blocked_words = _collect_blocked_words(reply_text)
    if blocked_words:
        risk_flags["blocked_words"] = blocked_words
        risk_flags["triggered_rules"].append("keyword_blacklist")
        risk_flags["decision"] = "blocked"
        risk_flags["reason"] = "contains_blocked_words"
        return False, risk_flags
    return True, risk_flags


def _pii_detection_rule(reply_text: str, risk_flags: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    pii_matches = _collect_pii_matches(reply_text)
    if pii_matches:
        risk_flags["pii_matches"] = pii_matches
        risk_flags["triggered_rules"].append("pii_detection")
        risk_flags["decision"] = settings.safety_pii_action if settings.safety_pii_action in {"manual_queue", "blocked"} else "manual_queue"
        risk_flags["reason"] = "contains_pii"
        return False, risk_flags
    return True, risk_flags


def _length_limit_rule(reply_text: str, risk_flags: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    if len(reply_text) > risk_flags["max_length"]:
        risk_flags["triggered_rules"].append("length_limit")
        risk_flags["decision"] = "blocked"
        risk_flags["reason"] = "too_long"
        return False, risk_flags
    return True, risk_flags


_SAFETY_RULE_REGISTRY = ProviderRegistry[SafetyRule]()
_SAFETY_RULE_REGISTRY.register("keyword_blacklist", _keyword_blacklist_rule)
_SAFETY_RULE_REGISTRY.register("pii_detection", _pii_detection_rule)
_SAFETY_RULE_REGISTRY.register("length_limit", _length_limit_rule)


def safety_check(reply_text: str) -> tuple[bool, dict[str, Any]]:
    risk_flags = _base_risk_flags(reply_text)

    for rule_name in ("keyword_blacklist", "pii_detection", "length_limit"):
        rule = _SAFETY_RULE_REGISTRY.get(rule_name)
        if rule is None:
            continue
        safe, risk_flags = rule(reply_text, risk_flags)
        if not safe:
            return False, risk_flags

    return True, risk_flags
