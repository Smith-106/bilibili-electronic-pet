from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.admin import router as admin_router
from app.api.comments import router as comments_router
from app.api.gateway import router as gateway_router
from app.settings import settings

@asynccontextmanager
async def lifespan(_: FastAPI):
    # 配置 B站 评论轮询定时任务
    if settings.bilibili_enabled and settings.bilibili_poll_enabled:
        from app.workers.jobs import schedule_bilibili_polling
        schedule_bilibili_polling()
    yield


app = FastAPI(title="Bilibili Electronic Pet Reply Bot", version="0.1.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(comments_router)
app.include_router(gateway_router)
app.include_router(admin_router)
