import httpx

from app.services import generator
from app.services.generator import GenerationResult
from app.settings import settings


def test_build_messages_includes_knowledge_context():
    messages = generator._build_messages("你好", "normal", "medium", "- [faq] 标题: 内容")

    assert len(messages) == 2
    assert "可参考知识库" in messages[0]["content"]
    assert "[faq]" in messages[0]["content"]


def test_build_messages_includes_search_context():
    messages = generator._build_messages("你好", "normal", "medium", "", "- 标题 (https://example.com): 摘要")

    assert len(messages) == 2
    assert "可参考联网检索摘要" in messages[0]["content"]
    assert "example.com" in messages[0]["content"]


def test_build_messages_includes_length_hint_and_banned_words(monkeypatch):
    monkeypatch.setattr(generator, "get_prompt_banned_words", lambda: ["禁词A", "禁词B"])

    messages = generator._build_messages("你好", "normal", "short")

    assert "回复长度偏短" in messages[0]["content"]
    assert "禁用词: 禁词A, 禁词B" in messages[0]["content"]


def test_build_messages_includes_role_profile_prompting():
    messages = generator._build_messages("你好", "normal", "medium", "", "", "comfort")

    assert len(messages) == 2
    assert "comfort" in messages[0]["content"]
    assert "角色设定: comfort" in messages[1]["content"]


def test_build_messages_prefers_role_card_context():
    messages = generator._build_messages(
        "你好",
        "normal",
        "medium",
        "",
        "",
        "comfort",
        "comfort_plus",
        "请优先温柔陪伴",
        {"warm": 1},
        {"no_sarcasm": True},
    )

    assert len(messages) == 2
    assert "当前角色卡为 comfort_plus" in messages[0]["content"]
    assert "请优先温柔陪伴" in messages[0]["content"]
    assert "语气偏好" in messages[0]["content"]
    assert "角色设定: comfort_plus" in messages[1]["content"]


def test_mock_reply_differs_by_role_profile(monkeypatch):
    monkeypatch.setattr(generator, "get_prompt_action_pool", lambda: ["(A)", "(B)", "(C)"])
    text = "今天有点累"
    comfort = generator._mock_reply(text, "normal", "medium", role_profile="comfort")
    playful = generator._mock_reply(text, "normal", "medium", role_profile="playful")

    assert comfort != playful
    assert "温柔" in comfort
    assert "小剧场" in playful


def test_mock_reply_uses_prompt_config_action_pool(monkeypatch):
    monkeypatch.setattr(generator, "get_prompt_action_pool", lambda: ["(动作甲)", "(动作乙)", "(动作丙)"])

    empathy = generator._mock_reply("你好", "empathy", "medium")
    meme = generator._mock_reply("你好", "meme", "medium")
    normal = generator._mock_reply("你好", "normal", "medium")

    assert "(动作甲)" in empathy
    assert "(动作乙)" in meme
    assert "(动作丙)" in normal


def test_normalize_length_mode_uses_prompt_default(monkeypatch):
    monkeypatch.setattr(generator, "get_prompt_default_length", lambda: "short")
    assert generator._normalize_length_mode("unknown") == "short"


def test_normalize_length_mode_maps_extra_long_to_long_when_distribution_prefers_long(monkeypatch):
    monkeypatch.setattr(generator, "get_prompt_default_length", lambda: "extra_long")
    monkeypatch.setattr(generator, "get_prompt_length_distribution", lambda: {"short": 0.0, "medium": 0.1, "long": 0.9, "extra_long": 0.0})
    assert generator._normalize_length_mode("unknown") == "long"


def test_generate_reply_with_meta_resolves_explicit_role_card_first(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "mock")

    result = generator.generate_reply_with_meta(
        "今天有点难受",
        "empathy",
        "medium",
        role_profile="playful",
        role_card={
            "key": "comfort_plus",
            "enabled": True,
            "system_prompt": "请优先安抚",
            "tone": {"warm": 1},
            "constraints": {"no_sarcasm": True},
        },
        active_role_card={
            "key": "playful_active",
            "enabled": True,
            "system_prompt": "活泼模式",
        },
    )

    assert result.resolved_role_card_key == "comfort_plus"
    assert result.resolved_role_profile == "auto"


def test_generate_reply_with_meta_falls_back_to_active_role_card(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "mock")

    result = generator.generate_reply_with_meta(
        "今天有点难受",
        "empathy",
        "medium",
        role_profile="playful",
        role_card=None,
        active_role_card={
            "key": "comfort_active",
            "enabled": True,
            "system_prompt": "激活角色卡",
        },
    )

    assert result.resolved_role_card_key == "comfort_active"
    assert result.resolved_role_profile == "auto"


def test_generate_reply_with_meta_falls_back_to_role_profile_when_no_role_card(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "mock")

    result = generator.generate_reply_with_meta(
        "今天有点难受",
        "empathy",
        "medium",
        role_profile="comfort",
        role_card=None,
        active_role_card=None,
    )

    assert result.resolved_role_card_key is None
    assert result.resolved_role_profile == "comfort"


def test_generate_reply_with_meta_uses_mock_provider(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "mock")

    result = generator.generate_reply_with_meta("今天有点难受", "empathy", "medium")

    assert result.provider == "mock"
    assert result.reply_text
    assert result.used_fallback is False


def test_generate_reply_with_meta_supports_custom_provider(monkeypatch):
    class CustomProvider:
        name = "custom"

        def generate(self, request):
            _ = request
            return GenerationResult(reply_text="custom-reply", provider=self.name)

    generator.register_generator_provider("custom", CustomProvider)
    monkeypatch.setattr(settings, "llm_provider", "custom")

    result = generator.generate_reply_with_meta("hello", "normal", "medium")

    assert result.provider == "custom"
    assert result.reply_text == "custom-reply"


def test_openai_provider_missing_key_falls_back(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "llm_api_key", "")

    result = generator.generate_reply_with_meta("想哭", "empathy", "medium")

    assert result.provider == "openai_compatible"
    assert result.used_fallback is True
    assert result.error_type == "llm_api_key_missing"
    assert result.reply_text


def test_openai_provider_timeout_retries_and_fallback(monkeypatch):
    request = httpx.Request("POST", "https://example.com/chat/completions")
    attempts = {"count": 0}

    class TimeoutClient:
        def __init__(self, *args, **kwargs):
            _ = args, kwargs

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            _ = exc_type, exc, tb
            return False

        def post(self, *args, **kwargs):
            _ = args, kwargs
            attempts["count"] += 1
            raise httpx.TimeoutException("timeout", request=request)

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    monkeypatch.setattr(settings, "llm_retry_attempts", 2)
    monkeypatch.setattr(settings, "llm_retry_wait_seconds", 0)
    monkeypatch.setattr(generator.httpx, "Client", TimeoutClient)

    result = generator.generate_reply_with_meta("压力好大", "empathy", "medium")

    assert attempts["count"] == 2
    assert result.used_fallback is True
    assert result.error_type == "llm_timeout"
    assert result.reply_text


def test_openai_provider_success_returns_reply(monkeypatch):
    class SuccessResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "  成功回复  "}}]}

    class SuccessClient:
        def __init__(self, *args, **kwargs):
            _ = args, kwargs

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            _ = exc_type, exc, tb
            return False

        def post(self, *args, **kwargs):
            _ = args, kwargs
            return SuccessResponse()

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    monkeypatch.setattr(settings, "llm_retry_attempts", 1)
    monkeypatch.setattr(settings, "llm_retry_wait_seconds", 0)
    monkeypatch.setattr(generator.httpx, "Client", SuccessClient)

    result = generator.generate_reply_with_meta("你好", "normal", "medium")

    assert result.provider == "openai_compatible"
    assert result.used_fallback is False
    assert result.reply_text == "成功回复"
