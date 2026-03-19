from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.admin import router as admin_router
from app.api.comments import router as comments_router
from app.api.gateway import router as gateway_router
from app.db import check_database_connection
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


@app.get("/readiness")
def readiness():
    """Dependency-aware readiness probe for deployment verification."""
    # Check database
    db_status = check_database_connection()

    # Check Redis (Celery broker)
    redis_status = {"connected": False, "error": "not_checked"}
    try:
        import redis
        redis_client = redis.from_url(settings.celery_broker_url, socket_connect_timeout=2)
        redis_client.ping()
        redis_status = {"connected": True}
        redis_client.close()
    except Exception as e:
        redis_status = {"connected": False, "error": str(e)}

    # Get settings summary
    config_status = settings.build_readiness_summary()

    # Determine overall readiness
    all_healthy = db_status.get("connected", False) and redis_status.get("connected", False)

    return {
        "ready": all_healthy,
        "database": db_status,
        "redis": redis_status,
        "config": config_status["config"],
        "publish": config_status["publish"],
        "kill_switch": config_status["kill_switch"],
    }


app.include_router(comments_router)
app.include_router(gateway_router)
app.include_router(admin_router)
