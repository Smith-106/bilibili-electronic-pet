from fastapi import Header, HTTPException, Query

from app.settings import settings


def require_api_key(
    x_api_key: str | None = Header(default=None),
    api_key: str | None = Query(default=None),
):
    expected = settings.api_key.strip()
    if not expected:
        return

    provided = (x_api_key or api_key or "").strip()
    if provided != expected:
        raise HTTPException(status_code=401, detail="unauthorized")
