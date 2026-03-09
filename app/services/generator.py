import random
from dataclasses import dataclass
from typing import Callable, Protocol

import httpx
from tenacity import Retrying, retry_if_exception_type, stop_after_attempt, wait_fixed

from app.services.prompt_config import (
    get_prompt_action_pool,
    get_prompt_banned_words,
    get_prompt_default_length,
    get_prompt_length_distribution,
)
from app.services.provider_registry import ProviderRegistry
from app.settings import settings


@dataclass(frozen=True)
class GenerationRequest:
    content: str
    style_mode: str
    length_mode: str
    knowledge_context: str = ""
    search_context: str = ""
    role_profile: str = "auto"
    role_card_key: str | None = None
    role_card_system_prompt: str = ""
    role_card_tone: dict | None = None
    role_card_constraints: dict | None = None


@dataclass(frozen=True)
class GenerationResult:
    reply_text: str
    provider: str
    used_fallback: bool = False
    error_type: str | None = None
    error_message: str | None = None
    resolved_role_profile: str = "auto"
    resolved_role_card_key: str | None = None


class GeneratorProvider(Protocol):
    name: str

    def generate(self, request: GenerationRequest) -> GenerationResult:
        ...


def _normalize_role_card_payload(role_card: dict | None) -> dict | None:
    if not isinstance(role_card, dict):
        return None

    key = str(role_card.get("key") or "").strip().lower()
    if not key:
        return None

    enabled = role_card.get("enabled")
    if enabled is False:
        return None

    return {
        "key": key,
        "system_prompt": str(role_card.get("system_prompt") or "").strip(),
        "tone": role_card.get("tone") if isinstance(role_card.get("tone"), dict) else {},
        "constraints": role_card.get("constraints") if isinstance(role_card.get("constraints"), dict) else {},
    }


def _resolve_role_context(
    *,
    role_profile: str,
    role_card: dict | None,
    active_role_card: dict | None,
) -> tuple[str, str | None, str, dict, dict]:
    normalized_profile = str(role_profile or "auto").strip().lower() or "auto"
    explicit_card = _normalize_role_card_payload(role_card)
    active_card = _normalize_role_card_payload(active_role_card)

    selected = explicit_card or active_card
    if selected:
        return (
            "auto",
            str(selected["key"]),
            str(selected.get("system_prompt") or ""),
            selected.get("tone") or {},
            selected.get("constraints") or {},
        )

    return normalized_profile, None, "", {}, {}


def _pick_action(index: int) -> str:
    pool = get_prompt_action_pool()
    return pool[index % len(pool)] if pool else ""


def _normalize_length_mode(length_mode: str) -> str:
    mode = str(length_mode or "").strip().lower()
    if mode in {"short", "medium", "long"}:
        return mode

    default_mode = get_prompt_default_length()
    if default_mode == "extra_long":
        distribution = get_prompt_length_distribution()
        return "long" if distribution.get("long", 0.0) >= distribution.get("medium", 0.0) else "medium"
    if default_mode in {"short", "medium", "long"}:
        return default_mode
    return "medium"


def _build_length_hint(length_mode: str) -> str:
    mode = _normalize_length_mode(length_mode)
    if mode == "short":
        return "回复长度偏短（1-2句），保持温柔和在场感。"
    if mode == "long":
        return "回复长度偏长（3-5句），允许更完整的安抚与陪伴表达。"
    return "回复长度中等（2-3句），简洁且有温度。"


def _build_banned_words_hint() -> str:
    words = get_prompt_banned_words()
    if not words:
        return ""
    return f"禁用词: {', '.join(words)}。"


def _should_expand_long_reply(length_mode: str) -> bool:
    if _normalize_length_mode(length_mode) != "long":
        return False

    distribution = get_prompt_length_distribution()
    long_probability = max(0.0, float(distribution.get("long", 0.0)))
    extra_long_probability = max(0.0, float(distribution.get("extra_long", 0.0)))
    threshold = min(1.0, long_probability + extra_long_probability)

    return random.random() < threshold


def _mock_reply(
    content: str,
    style_mode: str,
    length_mode: str,
    role_profile: str = "auto",
    role_card_key: str | None = None,
) -> str:
    quote = content[:16]

    role_hints = {
        "auto": "",
        "default": "",
        "comfort": "(更关注安抚情绪，避免夸张段子)",
        "playful": "(更活泼，允许轻松玩梗但不冒犯)",
    }
    role_hint = role_hints.get(role_profile, "")
    if role_card_key:
        role_hint = f"(角色卡: {role_card_key})"

    if style_mode == "empathy":
        body = (
            f"[Doro_Doro] {role_hint} {_pick_action(0)} 我看到你说“{quote}”，心里也跟着酸酸的。"
            "你不是一个人扛着，先慢一点、喘口气也没关系。"
            "如果你愿意，把今天最难受的那一刻告诉我，我们一起把它揉小一点。"
        )
    elif style_mode == "meme":
        body = (
            f"[Doro_Doro] {role_hint} {_pick_action(1)} “{quote}”这句太有画面感啦。"
            "Doro 已经在地上打滚三圈了，今天这条评论先记作一颗快乐欧润吉。"
            "再投喂我一个关键词，我给你续上下一段离谱小剧场。"
        )
    else:
        body = (
            f"[Doro_Doro] {role_hint} {_pick_action(2)} 我看到“{quote}”了。"
            "谢谢你认真留言，这种被看见的连接很珍贵。"
            "你要是愿意，我会一直在评论区和你慢慢聊。"
        )

    if not role_card_key:
        if role_profile == "comfort":
            body += " 先照顾好自己最重要，我会用更温柔的方式陪你。"
        elif role_profile == "playful":
            body += " 今天继续营业开心小剧场，给你加一颗星！"

    if _should_expand_long_reply(length_mode):
        body += (
            "\n\n有时候一句话背后，可能是好多天没说出口的情绪。"
            "你能写下来，就已经很勇敢了。先别急着给自己下结论，"
            "我们今天只做一件小事：好好吃一顿饭，或者早点睡。"
            "等你回来，Doro 还在。"
        )

    return body


def _build_messages(
    content: str,
    style_mode: str,
    length_mode: str,
    knowledge_context: str = "",
    search_context: str = "",
    role_profile: str = "auto",
    role_card_key: str | None = None,
    role_card_system_prompt: str = "",
    role_card_tone: dict | None = None,
    role_card_constraints: dict | None = None,
) -> list[dict[str, str]]:
    system_prompt = (
        "你在B站评论区扮演 Doro_Doro。"
        "回复要温柔、有在场感，默认中等长度，偶尔长文。"
        "必须引用用户评论中的短句。"
        "禁止引战、辱骂、隐私泄露。"
        "输出只包含最终回复文本。"
    )
    system_prompt += _build_length_hint(length_mode)
    system_prompt += _build_banned_words_hint()
    if role_card_key:
        system_prompt += f"当前角色卡为 {role_card_key}。"
        if role_card_system_prompt:
            system_prompt += role_card_system_prompt
        if role_card_tone:
            system_prompt += f"语气偏好: {role_card_tone}。"
        if role_card_constraints:
            system_prompt += f"约束: {role_card_constraints}。"
    else:
        if role_profile == "comfort":
            system_prompt += "当前角色卡为 comfort：优先安抚与陪伴，避免过于跳脱的段子。"
        elif role_profile == "playful":
            system_prompt += "当前角色卡为 playful：保持友善前提下更活泼俏皮，可轻度玩梗。"
        elif role_profile == "default":
            system_prompt += "当前角色卡为 default：平衡温柔与日常互动语气。"

    if knowledge_context:
        system_prompt += f"可参考知识库:\n{knowledge_context}\n"
    if search_context:
        system_prompt += f"可参考联网检索摘要:\n{search_context}\n"

    user_prompt = (
        f"评论内容: {content}\n"
        f"风格模式: {style_mode}\n"
        f"长度模式: {length_mode}\n"
        f"角色设定: {role_card_key or role_profile}\n"
        "请生成一条可直接发布的评论回复。"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _fallback_reply(
    content: str,
    style_mode: str,
    length_mode: str,
    role_profile: str = "auto",
    role_card_key: str | None = None,
) -> str:
    if settings.llm_fallback_to_mock:
        return _mock_reply(content, style_mode, length_mode, role_profile=role_profile, role_card_key=role_card_key)
    quote = content[:16]
    return f"[Doro_Doro] (轻轻点头) 我看到你说“{quote}”，先给你一个抱抱，我们慢慢聊。"


def _fallback_result(
    request: GenerationRequest,
    *,
    provider: str,
    error_type: str,
    error_message: str,
) -> GenerationResult:
    return GenerationResult(
        reply_text=_fallback_reply(
            request.content,
            request.style_mode,
            request.length_mode,
            role_profile=request.role_profile,
            role_card_key=request.role_card_key,
        ),
        provider=provider,
        used_fallback=True,
        error_type=error_type,
        error_message=error_message,
        resolved_role_profile=request.role_profile,
        resolved_role_card_key=request.role_card_key,
    )


def _with_request_context(result: GenerationResult, request: GenerationRequest) -> GenerationResult:
    return GenerationResult(
        reply_text=result.reply_text,
        provider=result.provider,
        used_fallback=result.used_fallback,
        error_type=result.error_type,
        error_message=result.error_message,
        resolved_role_profile=request.role_profile,
        resolved_role_card_key=request.role_card_key,
    )


class MockProvider:
    name = "mock"

    def generate(self, request: GenerationRequest) -> GenerationResult:
        return GenerationResult(
            reply_text=_mock_reply(
                request.content,
                request.style_mode,
                request.length_mode,
                role_profile=request.role_profile,
                role_card_key=request.role_card_key,
            ),
            provider=self.name,
        )


class OpenAICompatibleProvider:
    name = "openai_compatible"
    _retryable_exceptions = (httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError)

    def _chat_completions(self, payload: dict, headers: dict) -> dict:
        retrying = Retrying(
            stop=stop_after_attempt(max(1, settings.llm_retry_attempts)),
            wait=wait_fixed(max(0.0, float(settings.llm_retry_wait_seconds))),
            retry=retry_if_exception_type(self._retryable_exceptions),
            reraise=True,
        )

        for attempt in retrying:
            with attempt:
                with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
                    response = client.post(f"{settings.llm_base_url}/chat/completions", json=payload, headers=headers)
                    response.raise_for_status()
                    return response.json()

        raise RuntimeError("chat completion retry exhausted")

    def generate(self, request: GenerationRequest) -> GenerationResult:
        if not settings.llm_api_key:
            return _fallback_result(
                request,
                provider=self.name,
                error_type="llm_api_key_missing",
                error_message="LLM API key is empty.",
            )

        payload = {
            "model": settings.llm_model,
            "messages": _build_messages(
                request.content,
                request.style_mode,
                request.length_mode,
                request.knowledge_context,
                request.search_context,
                request.role_profile,
                request.role_card_key,
                request.role_card_system_prompt,
                request.role_card_tone,
                request.role_card_constraints,
            ),
            "temperature": 0.85,
        }
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }

        try:
            data = self._chat_completions(payload, headers)
            reply_text = str(data["choices"][0]["message"]["content"]).strip()
            if reply_text:
                return GenerationResult(reply_text=reply_text, provider=self.name)
            return _fallback_result(
                request,
                provider=self.name,
                error_type="llm_empty_reply",
                error_message="LLM returned empty reply content.",
            )
        except httpx.TimeoutException as exc:
            return _fallback_result(
                request,
                provider=self.name,
                error_type="llm_timeout",
                error_message=str(exc),
            )
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response else "unknown"
            return _fallback_result(
                request,
                provider=self.name,
                error_type=f"llm_http_{status_code}",
                error_message=str(exc),
            )
        except httpx.RequestError as exc:
            return _fallback_result(
                request,
                provider=self.name,
                error_type="llm_network_error",
                error_message=str(exc),
            )
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            return _fallback_result(
                request,
                provider=self.name,
                error_type="llm_response_parse_error",
                error_message=str(exc),
            )
        except Exception as exc:
            return _fallback_result(
                request,
                provider=self.name,
                error_type=f"llm_unexpected_{type(exc).__name__}",
                error_message=str(exc),
            )


ProviderFactory = Callable[[], GeneratorProvider]
_PROVIDER_REGISTRY = ProviderRegistry[ProviderFactory](default_provider="mock")
_PROVIDER_REGISTRY.register("mock", MockProvider)
_PROVIDER_REGISTRY.register("openai", OpenAICompatibleProvider)
_PROVIDER_REGISTRY.register("openai_compatible", OpenAICompatibleProvider)


def register_generator_provider(name: str, factory: ProviderFactory) -> None:
    _PROVIDER_REGISTRY.register(name, factory)


def _get_provider(provider_name: str) -> GeneratorProvider:
    try:
        factory = _PROVIDER_REGISTRY.resolve(provider_name)
    except KeyError:
        factory = MockProvider
    return factory()


def generate_reply_with_meta(
    content: str,
    style_mode: str,
    length_mode: str,
    knowledge_context: str = "",
    search_context: str = "",
    role_profile: str = "auto",
    role_card: dict | None = None,
    active_role_card: dict | None = None,
) -> GenerationResult:
    resolved_role_profile, resolved_role_card_key, resolved_system_prompt, resolved_tone, resolved_constraints = _resolve_role_context(
        role_profile=role_profile,
        role_card=role_card,
        active_role_card=active_role_card,
    )

    request = GenerationRequest(
        content=content,
        style_mode=style_mode,
        length_mode=length_mode,
        knowledge_context=knowledge_context,
        search_context=search_context,
        role_profile=resolved_role_profile,
        role_card_key=resolved_role_card_key,
        role_card_system_prompt=resolved_system_prompt,
        role_card_tone=resolved_tone,
        role_card_constraints=resolved_constraints,
    )
    provider = _get_provider(settings.llm_provider)
    result = provider.generate(request)
    if result.reply_text.strip():
        return _with_request_context(result, request)

    fallback = _fallback_result(
        request,
        provider=result.provider,
        error_type=result.error_type or "llm_empty_reply",
        error_message=result.error_message or "Provider returned empty text.",
    )
    return _with_request_context(fallback, request)


def generate_reply(
    content: str,
    style_mode: str,
    length_mode: str,
    knowledge_context: str = "",
    search_context: str = "",
    role_profile: str = "auto",
    role_card: dict | None = None,
    active_role_card: dict | None = None,
) -> str:
    return generate_reply_with_meta(
        content,
        style_mode,
        length_mode,
        knowledge_context=knowledge_context,
        search_context=search_context,
        role_profile=role_profile,
        role_card=role_card,
        active_role_card=active_role_card,
    ).reply_text
