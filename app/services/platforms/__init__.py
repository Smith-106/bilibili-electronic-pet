from typing import TypedDict

from app.schemas import CollectorSource, PlatformName
from app.settings import settings


class PlatformConfig(TypedDict):
    enabled_attr: str
    source_attr: str
    default_source: str
    collector_source: CollectorSource


_PLATFORM_CONFIGS: dict[PlatformName, PlatformConfig] = {
    "bilibili": {
        "enabled_attr": "platform_bilibili_enabled",
        "source_attr": "platform_bilibili_publish_source",
        "default_source": "bilibili-bot",
        "collector_source": "bilibili",
    },
    "douyin": {
        "enabled_attr": "platform_douyin_enabled",
        "source_attr": "platform_douyin_publish_source",
        "default_source": "douyin-bot",
        "collector_source": "douyin",
    },
    "kuaishou": {
        "enabled_attr": "platform_kuaishou_enabled",
        "source_attr": "platform_kuaishou_publish_source",
        "default_source": "kuaishou-bot",
        "collector_source": "kuaishou",
    },
}


def get_platform_config(platform: PlatformName) -> PlatformConfig:
    return _PLATFORM_CONFIGS[platform]


def get_supported_platforms() -> tuple[PlatformName, ...]:
    return tuple(_PLATFORM_CONFIGS.keys())


def is_platform_enabled(platform: PlatformName) -> bool:
    config = get_platform_config(platform)
    return bool(getattr(settings, config["enabled_attr"], False))


def get_platform_collector_source(platform: PlatformName) -> CollectorSource:
    config = get_platform_config(platform)
    return config["collector_source"]


def get_platform_publish_source(platform: PlatformName) -> str:
    config = get_platform_config(platform)
    value = str(getattr(settings, config["source_attr"], "") or "").strip()
    return value or config["default_source"]
