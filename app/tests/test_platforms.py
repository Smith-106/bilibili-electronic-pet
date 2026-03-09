from app.services.platforms import get_platform_collector_source, get_platform_publish_source, is_platform_enabled
from app.settings import settings


def test_get_platform_collector_source_returns_configured_value():
    assert get_platform_collector_source("bilibili") == "bilibili"
    assert get_platform_collector_source("douyin") == "douyin"
    assert get_platform_collector_source("kuaishou") == "kuaishou"


def test_get_platform_publish_source_prefers_setting_value(monkeypatch):
    monkeypatch.setattr(settings, "platform_douyin_publish_source", "douyin-open")

    assert get_platform_publish_source("douyin") == "douyin-open"


def test_get_platform_publish_source_falls_back_to_default_when_blank(monkeypatch):
    monkeypatch.setattr(settings, "platform_kuaishou_publish_source", "")

    assert get_platform_publish_source("kuaishou") == "kuaishou-bot"


def test_is_platform_enabled_reads_enabled_switch(monkeypatch):
    monkeypatch.setattr(settings, "platform_bilibili_enabled", True)
    monkeypatch.setattr(settings, "platform_douyin_enabled", False)

    assert is_platform_enabled("bilibili") is True
    assert is_platform_enabled("douyin") is False
