from functools import lru_cache
from pathlib import Path

import yaml

_DEFAULT_ACTION_POOL = ["(轻轻靠近)", "(小声嘟囔)", "(抬头认真看)"]
_DEFAULT_SKIP_KEYWORDS = ["广告", "vx", "加群", "私聊"]


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
