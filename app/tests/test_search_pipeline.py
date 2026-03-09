from app.services.search_provider import SearchItem, _dedupe_items, _expand_queries, _rerank_items


def test_expand_queries_includes_original_and_tokens():
    queries = _expand_queries("热点 新闻 速报")
    assert queries[0] == "热点 新闻 速报"
    assert "热点" in queries
    assert "新闻" in queries


def test_dedupe_items_removes_duplicates():
    items = [
        SearchItem(title="A", url="", snippet="x", source="mock"),
        SearchItem(title="A", url="", snippet="x", source="mock"),
        SearchItem(title="B", url="", snippet="y", source="mock"),
    ]
    deduped = _dedupe_items(items)
    assert len(deduped) == 2


def test_rerank_items_prefers_token_hits():
    items = [
        SearchItem(title="普通", url="", snippet="无关内容", source="mock"),
        SearchItem(title="热点快讯", url="", snippet="今天热点来了", source="mock"),
    ]
    ranked = _rerank_items(items, "热点")
    assert ranked[0].title == "热点快讯"
