from collections.abc import Mapping
from typing import Any

from app.services.collector import collect_platform_event_via_config


def collect_kuaishou_event(payload: Mapping[str, Any]) -> dict[str, Any]:
    event = collect_platform_event_via_config(payload, "kuaishou")
    return event.model_dump()
