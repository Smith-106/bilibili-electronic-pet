from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.admin import build_bilibili_diagnostics, router as admin_router
from app.api.comments import router as comments_router
from app.api.gateway import router as gateway_router
from app.db import SessionLocal, check_database_connection
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
    def add_blocker(target: list[str], message: str) -> None:
        if message and message not in target:
            target.append(message)

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

    foundation_blockers: list[str] = []
    if not db_status.get("connected", False):
        add_blocker(foundation_blockers, f"database:{db_status.get('error') or 'unavailable'}")
    if not redis_status.get("connected", False):
        add_blocker(foundation_blockers, f"redis:{redis_status.get('error') or 'unavailable'}")
    foundation_ready = not foundation_blockers

    bilibili_diagnostics: dict[str, object] = {
        "ready": False,
        "blocking_reasons": [],
        "effective_publish_mode": settings.publisher_mode.strip().lower(),
        "signals": {
            "raw_publish_mode": settings.publisher_mode.strip().lower(),
            "effective_publish_mode": settings.publisher_mode.strip().lower(),
            "native_publish_enabled": settings.bilibili_enabled and settings.bilibili_publish_enabled,
            "polling_worker_enabled": settings.bilibili_enabled and settings.bilibili_poll_enabled,
            "credential_present": False,
            "credential_complete": False,
            "publish_mode_config_ready": True,
        },
    }
    if db_status.get("connected", False):
        try:
            with SessionLocal() as db:
                bilibili_diagnostics = build_bilibili_diagnostics(db=db)
        except Exception as e:
            bilibili_diagnostics = {
                **bilibili_diagnostics,
                "ready": False,
                "blocking_reasons": [f"dependency:{str(e)}"],
            }

    polling_requested = settings.bilibili_enabled and settings.bilibili_poll_enabled
    delivery_signals = {
        "kill_switch_enabled": settings.kill_switch,
        "polling_requested": polling_requested,
        "poll_interval_seconds": settings.bilibili_poll_interval_seconds,
        "worker_schedule_configured": polling_requested and settings.bilibili_poll_interval_seconds >= 60,
        "bilibili_diagnostics_ready": bool(bilibili_diagnostics.get("ready", False)),
        "raw_publish_mode": settings.publisher_mode.strip().lower(),
        "effective_publish_mode": str(
            bilibili_diagnostics.get("effective_publish_mode") or settings.publisher_mode.strip().lower()
        ),
    }

    delivery_blockers = list(foundation_blockers)
    if settings.kill_switch:
        add_blocker(delivery_blockers, "control:kill_switch_enabled")
    if polling_requested and not redis_status.get("connected", False):
        add_blocker(delivery_blockers, "worker:redis_unavailable_for_polling")

    diagnostics_blockers = bilibili_diagnostics.get("blocking_reasons")
    if isinstance(diagnostics_blockers, list):
        for reason in diagnostics_blockers:
            add_blocker(delivery_blockers, f"bilibili:{reason}")

    if not bilibili_diagnostics.get("ready", False):
        add_blocker(delivery_blockers, "bilibili:delivery_diagnostics_not_ready")

    delivery_ready = not delivery_blockers

    return {
        # Keep "ready" behavior backward compatible for dependency probes.
        "ready": foundation_ready,
        "database": db_status,
        "redis": redis_status,
        "config": config_status["config"],
        "publish": config_status["publish"],
        "kill_switch": config_status["kill_switch"],
        "foundation_ready": foundation_ready,
        "delivery_ready": delivery_ready,
        "foundation_blockers": foundation_blockers,
        "delivery_blockers": delivery_blockers,
        "blocking_reasons": delivery_blockers,
        "delivery_signals": delivery_signals,
        "bilibili_diagnostics": bilibili_diagnostics,
    }


app.include_router(comments_router)
app.include_router(gateway_router)
app.include_router(admin_router)
