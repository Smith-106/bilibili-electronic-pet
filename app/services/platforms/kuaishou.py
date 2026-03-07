from collections.abc import Mapping
from typing import Any

from app.services.collector import collect_platform_event


def collect_kuaishou_event(payload: Mapping[str, Any]) -> dict[str, Any]:
    event = collect_platform_event(payload, "kuaishou")
    return event.model_dump()
