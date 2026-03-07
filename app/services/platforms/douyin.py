from collections.abc import Mapping
from typing import Any

from app.services.collector import collect_platform_event


def collect_douyin_event(payload: Mapping[str, Any]) -> dict[str, Any]:
    event = collect_platform_event(payload, "douyin")
    return event.model_dump()
