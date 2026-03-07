from dataclasses import dataclass

from app.settings import settings


@dataclass(frozen=True)
class SearchItem:
    title: str
    url: str
    snippet: str
    source: str = "mock"


@dataclass(frozen=True)
class SearchResult:
    items: list[SearchItem]
    provider: str
    used_fallback: bool = False
    error_type: str | None = None
    error_message: str | None = None


def search_web(query: str, *, max_hits: int | None = None) -> SearchResult:
    if not settings.search_enabled:
        return SearchResult(items=[], provider="disabled")

    text = str(query or "").strip()
    if not text:
        return SearchResult(items=[], provider=settings.search_provider)

    if settings.search_provider == "disabled":
        return SearchResult(items=[], provider="disabled")

    if settings.search_provider != "mock":
        return SearchResult(
            items=[],
            provider=settings.search_provider,
            used_fallback=True,
            error_type="search_provider_unsupported",
            error_message=f"unsupported provider: {settings.search_provider}",
        )

    limit = max_hits if max_hits is not None else settings.search_max_hits
    safe_limit = max(1, min(int(limit), 20))
    item = SearchItem(
        title="联网搜索未接入真实 Provider",
        url="",
        snippet=f"mock 搜索结果（query={text}）",
        source="mock",
    )
    return SearchResult(items=[item][:safe_limit], provider="mock")


def build_search_context(items: list[SearchItem]) -> str:
    if not items:
        return ""

    lines = []
    for item in items:
        title = str(item.title or "").strip() or "untitled"
        url = str(item.url or "").strip()
        snippet = str(item.snippet or "").strip()
        if len(snippet) > 220:
            snippet = snippet[:220].rstrip() + "…"
        if url:
            lines.append(f"- {title} ({url}): {snippet}")
        else:
            lines.append(f"- {title}: {snippet}")
    return "\n".join(lines)
