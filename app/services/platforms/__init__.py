from app.schemas import PlatformName
from app.settings import settings


def is_platform_enabled(platform: PlatformName) -> bool:
    if platform == "bilibili":
        return settings.platform_bilibili_enabled
    if platform == "douyin":
        return settings.platform_douyin_enabled
    if platform == "kuaishou":
        return settings.platform_kuaishou_enabled
    return False


def get_platform_publish_source(platform: PlatformName) -> str:
    if platform == "bilibili":
        return settings.platform_bilibili_publish_source or "bilibili-bot"
    if platform == "douyin":
        return settings.platform_douyin_publish_source or "douyin-bot"
    if platform == "kuaishou":
        return settings.platform_kuaishou_publish_source or "kuaishou-bot"
    return "bili-pet-bot"
