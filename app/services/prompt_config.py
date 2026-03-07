from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml

PromptLengthMode = Literal["short", "medium", "long", "extra_long"]

_DEFAULT_ACTION_POOL = ["(轻轻靠近)", "(小声嘟囔)", "(抬头认真看)"]
_DEFAULT_SKIP_KEYWORDS = ["广告", "vx", "加群", "私聊"]
_DEFAULT_BANNED_WORDS = ["仇恨", "去死", "手机号", "身份证"]
_DEFAULT_LENGTH_MODE: PromptLengthMode = "medium"
_DEFAULT_LENGTH_DISTRIBUTION: dict[PromptLengthMode, float] = {
    "short": 0.0,
    "medium": 0.8,
    "long": 0.15,
    "extra_long": 0.05,
}


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def _load_prompt_config() -> dict:
    config_path = _project_root() / "config" / "prompt_doro.yaml"
    try:
        raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, yaml.YAMLError):
        return {}

    return raw if isinstance(raw, dict) else {}


def _read_str_list(config: dict, key: str, default: list[str]) -> list[str]:
    values = config.get(key)
    if not isinstance(values, list):
        return list(default)

    normalized: list[str] = []
    for item in values:
        value = str(item or "").strip()
        if value and value not in normalized:
            normalized.append(value)
    return normalized or list(default)


def get_prompt_action_pool() -> list[str]:
    return _read_str_list(_load_prompt_config(), "action_pool", _DEFAULT_ACTION_POOL)


def get_prompt_skip_keywords() -> list[str]:
    return _read_str_list(_load_prompt_config(), "skip_keywords", _DEFAULT_SKIP_KEYWORDS)


def get_prompt_banned_words() -> list[str]:
    return _read_str_list(_load_prompt_config(), "banned_words", _DEFAULT_BANNED_WORDS)


def get_prompt_default_length() -> PromptLengthMode:
    raw = str(_load_prompt_config().get("default_length") or "").strip().lower()
    return raw if raw in _DEFAULT_LENGTH_DISTRIBUTION else _DEFAULT_LENGTH_MODE


def get_prompt_length_distribution() -> dict[PromptLengthMode, float]:
    raw = _load_prompt_config().get("length_distribution")
    if not isinstance(raw, dict):
        return dict(_DEFAULT_LENGTH_DISTRIBUTION)

    distribution = dict(_DEFAULT_LENGTH_DISTRIBUTION)
    for key in distribution:
        if key in raw:
            try:
                distribution[key] = max(0.0, float(raw[key]))
            except (TypeError, ValueError):
                continue

    return distribution
