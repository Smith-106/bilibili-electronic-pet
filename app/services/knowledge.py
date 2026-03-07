from sqlalchemy.orm import Session

from app.models.entities import KnowledgeEntry
from app.settings import settings


def search_knowledge(db: Session, content: str, *, max_hits: int | None = None) -> list[KnowledgeEntry]:
    if not settings.knowledge_enabled:
        return []

    text = str(content or "").strip()
    if not text:
        return []

    hits = max_hits if max_hits is not None else settings.knowledge_max_hits
    limit = max(1, min(int(hits), 20))

    q = db.query(KnowledgeEntry).filter(KnowledgeEntry.enabled.is_(True))
    like = f"%{text}%"
    rows = (
        q.filter((KnowledgeEntry.content.ilike(like)) | (KnowledgeEntry.title.ilike(like)))
        .order_by(KnowledgeEntry.updated_at.desc(), KnowledgeEntry.id.desc())
        .limit(limit)
        .all()
    )
    if rows:
        return rows

    keywords = [w for w in text.split() if w]
    for kw in keywords[:5]:
        kw_like = f"%{kw}%"
        rows = (
            q.filter((KnowledgeEntry.content.ilike(kw_like)) | (KnowledgeEntry.title.ilike(kw_like)))
            .order_by(KnowledgeEntry.updated_at.desc(), KnowledgeEntry.id.desc())
            .limit(limit)
            .all()
        )
        if rows:
            return rows
    return []


def build_knowledge_context(entries: list[KnowledgeEntry]) -> str:
    if not entries:
        return ""

    lines: list[str] = []
    for item in entries:
        category = str(item.category or "general").strip() or "general"
        title = str(item.title or "").strip()
        snippet = str(item.content or "").strip()
        if len(snippet) > 220:
            snippet = snippet[:220].rstrip() + "…"
        if title:
            lines.append(f"- [{category}] {title}: {snippet}")
        else:
            lines.append(f"- [{category}] {snippet}")
    return "\n".join(lines)
