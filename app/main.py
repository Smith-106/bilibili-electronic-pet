from fastapi import FastAPI

from app.api.admin import router as admin_router
from app.api.comments import router as comments_router
from app.api.gateway import router as gateway_router
from app.db import run_migrations

app = FastAPI(title="Bilibili Electronic Pet Reply Bot", version="0.1.0")


@app.on_event("startup")
def on_startup():
    try:
        run_migrations()
    except Exception as exc:
        raise RuntimeError("数据库迁移失败，已阻止服务启动") from exc


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(comments_router)
app.include_router(gateway_router)
app.include_router(admin_router)
