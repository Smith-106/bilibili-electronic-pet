from dataclasses import dataclass
from typing import Protocol

from app.services.provider_registry import ProviderRegistry
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


class SearchProvider(Protocol):
    name: str

    def search(self, query: str, *, max_hits: int | None = None) -> SearchResult:
        ...


class MockSearchProvider:
    name = "mock"

    def search(self, query: str, *, max_hits: int | None = None) -> SearchResult:
        limit = max_hits if max_hits is not None else settings.search_max_hits
        safe_limit = max(1, min(int(limit), 20))
        item = SearchItem(
            title="联网搜索未接入真实 Provider",
            url="",
            snippet=f"mock 搜索结果（query={query}）",
            source="mock",
        )
        return SearchResult(items=[item][:safe_limit], provider=self.name)


class DisabledSearchProvider:
    name = "disabled"

    def search(self, query: str, *, max_hits: int | None = None) -> SearchResult:
        _ = query, max_hits
        return SearchResult(items=[], provider=self.name)


_SEARCH_PROVIDER_REGISTRY = ProviderRegistry[SearchProvider](default_provider="disabled")
_SEARCH_PROVIDER_REGISTRY.register("mock", MockSearchProvider())
_SEARCH_PROVIDER_REGISTRY.register("pipeline_v1", MockSearchProvider())


def _clean_query(query: str) -> str:
    return str(query or "").strip()


def _expand_queries(query: str) -> list[str]:
    tokens = [token for token in query.replace("，", " ").replace(",", " ").split() if token]
    expanded = [query]
    if len(tokens) >= 2:
        expanded.extend(tokens[:2])

    deduped: list[str] = []
    seen: set[str] = set()
    for item in expanded:
        value = item.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


def _rerank_items(items: list[SearchItem], query: str) -> list[SearchItem]:
    query_tokens = [token for token in query.lower().split() if token]

    def _score(item: SearchItem) -> tuple[int, int]:
        text = f"{item.title} {item.snippet}".lower()
        hit_count = sum(1 for token in query_tokens if token in text)
        return hit_count, -len(item.snippet or "")

    return sorted(items, key=_score, reverse=True)


def _dedupe_items(items: list[SearchItem]) -> list[SearchItem]:
    deduped: list[SearchItem] = []
    seen: set[tuple[str, str, str]] = set()
    for item in items:
        key = (
            str(item.title or "").strip().lower(),
            str(item.url or "").strip().lower(),
            str(item.snippet or "").strip().lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def search_web(query: str, *, max_hits: int | None = None) -> SearchResult:
    if not settings.search_enabled:
        return SearchResult(items=[], provider="disabled")

    provider_name = str(settings.search_provider or "").strip().lower()
    clean_query = _clean_query(query)
    if not clean_query:
        return SearchResult(items=[], provider=provider_name)

    provider = _SEARCH_PROVIDER_REGISTRY.get(provider_name)
    if provider is None:
        return SearchResult(
            items=[],
            provider=provider_name,
            used_fallback=True,
            error_type="search_provider_unsupported",
            error_message=f"unsupported provider: {settings.search_provider}",
        )

    limit = max_hits if max_hits is not None else settings.search_max_hits
    safe_limit = max(1, min(int(limit), 20))

    stage_queries = _expand_queries(clean_query)
    collected: list[SearchItem] = []
    for stage_query in stage_queries:
        stage_result = provider.search(stage_query, max_hits=safe_limit)
        if stage_result.error_type:
            return SearchResult(
                items=[],
                provider=stage_result.provider,
                used_fallback=stage_result.used_fallback,
                error_type=stage_result.error_type,
                error_message=stage_result.error_message,
            )
        collected.extend(stage_result.items)

    deduped = _dedupe_items(collected)
    reranked = _rerank_items(deduped, clean_query)
    return SearchResult(items=reranked[:safe_limit], provider=provider_name)


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

