from sqlalchemy.orm import Session

from app.models.entities import UserState


def _normalize_reply(reply_text: str) -> str:
    return "".join(reply_text.strip().lower().split())[:120]


def is_recent_duplicate(db: Session, user_id: str, reply_text: str) -> bool:
    normalized = _normalize_reply(reply_text)
    state = db.query(UserState).filter(UserState.user_id == user_id).first()
    if not state or not state.recent_phrases:
        return False

    recent = state.recent_phrases.get("recent", [])
    return normalized in recent


def remember_reply_phrase(db: Session, user_id: str, reply_text: str, max_keep: int = 20) -> None:
    normalized = _normalize_reply(reply_text)
    state = db.query(UserState).filter(UserState.user_id == user_id).first()

    if not state:
        state = UserState(user_id=user_id, recent_phrases={"recent": [normalized]})
        db.add(state)
        db.commit()
        return

    recent = state.recent_phrases.get("recent", [])
    recent = [item for item in recent if item != normalized]
    recent.insert(0, normalized)
    state.recent_phrases = {"recent": recent[:max_keep]}
    db.commit()
