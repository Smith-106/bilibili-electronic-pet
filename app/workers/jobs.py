from datetime import datetime
import time
import logging

from celery import Celery
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.entities import Comment, ReplyJob, RoleCard
from app.services.dedupe import is_recent_duplicate, remember_reply_phrase
from app.services.decider import decide_safety_action, should_reply
from app.services.generator import generate_reply_with_meta
from app.services.knowledge import build_knowledge_context, search_knowledge
from app.services.observability import (
    build_log_context,
    ensure_trace_id,
    record_observability_event,
)
from app.services.publisher import publish_reply
from app.services.safety import safety_check
from app.services.search_provider import build_search_context, search_web
from app.settings import settings
from app.schemas import CommentEvent

celery_app = Celery(
    "bili_pet_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
logger = logging.getLogger(__name__)


class NonRetryableWorkerError(Exception):
    """输入载荷或上下文不可恢复错误，不应重试。"""


class RetryableWorkerError(Exception):
    """短暂性错误，可通过重试恢复。"""


def _build_failure_metadata(exc: Exception, *, retryable: bool) -> dict[str, object]:
    return {
        "error_type": type(exc).__name__,
        "error_message": str(exc),
        "retryable": retryable,
    }


def enqueue_comment_event(event: CommentEvent) -> None:
    process_comment_event_task.delay(event.model_dump())


@celery_app.task(
    name="process_comment_event_task",
    bind=True,
    autoretry_for=(RetryableWorkerError,),
    dont_autoretry_for=(NonRetryableWorkerError,),
    retry_backoff=settings.worker_retry_backoff,
    retry_jitter=settings.worker_retry_jitter,
    max_retries=settings.worker_max_retries,
    retry_kwargs={"max_retries": settings.worker_max_retries},
)
def process_comment_event_task(self, event_payload: dict):
    trace_id = ensure_trace_id(event_payload.get("trace_id") if isinstance(event_payload, dict) else None)
    comment_id = None
    if isinstance(event_payload, dict):
        normalized_comment_id = str(event_payload.get("comment_id") or "").strip()
        comment_id = normalized_comment_id or None
    started_at = time.perf_counter()

    def finish_observability(status: str, *, job_id: int | None = None, metadata: dict[str, object] | None = None) -> None:
        duration_ms = max(0, int((time.perf_counter() - started_at) * 1000))
        record_observability_event(
            "job_finished",
            trace_id=trace_id,
            comment_id=comment_id,
            job_id=job_id,
            status=status,
            duration_ms=duration_ms,
            metadata=metadata,
        )

    if settings.kill_switch:
        logger.warning(
            "worker_kill_switch_enabled | %s",
            build_log_context(trace_id=trace_id, comment_id=comment_id, status="kill_switch_enabled"),
        )
        finish_observability("kill_switch_enabled")
        return {"ok": False, "reason": "kill_switch_enabled", "trace_id": trace_id}

    db: Session = SessionLocal()
    try:
        if not isinstance(event_payload, dict):
            raise NonRetryableWorkerError("event_payload_must_be_dict")
        if not comment_id:
            raise NonRetryableWorkerError("comment_id_missing")

        raw_force_long = event_payload.get("force_long", False)
        requested_style_profile = str(event_payload.get("style_profile") or "auto").strip().lower()
        requested_role_profile = str(event_payload.get("role_profile") or "auto").strip().lower()
        requested_role_card_key = str(event_payload.get("role_card_key") or "").strip().lower()
        comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
        if not comment:
            logger.warning(
                "worker_comment_not_found | %s",
                build_log_context(trace_id=trace_id, comment_id=comment_id, status="comment_not_found"),
            )
            finish_observability("comment_not_found")
            return {"ok": False, "reason": "comment_not_found", "trace_id": trace_id}

        logger.info(
            "worker_process_started | %s",
            build_log_context(trace_id=trace_id, comment_id=comment.comment_id, status="processing"),
        )

        event = CommentEvent(
            comment_id=comment.comment_id,
            video_id=comment.video_id,
            user_id=comment.user_id,
            content=comment.content,
            parent_id=comment.parent_id,
            trace_id=trace_id,
            force_long=raw_force_long,
            style_profile=requested_style_profile,
            role_profile=requested_role_profile,
            role_card_key=requested_role_card_key or None,
        )
        record_observability_event(
            "job_started",
            trace_id=trace_id,
            comment_id=comment.comment_id,
            metadata={"force_long": bool(event.force_long)},
        )

        should, style_mode, length_mode = should_reply(event)
        if not should:
            job = ReplyJob(comment_id=comment.comment_id, status="skipped", style_mode=style_mode, length_mode=length_mode)
            db.add(job)
            db.commit()
            logger.info(
                "worker_job_finished | %s",
                build_log_context(
                    trace_id=trace_id,
                    comment_id=comment.comment_id,
                    job_id=job.id,
                    status=job.status,
                    style_mode=style_mode,
                    length_mode=length_mode,
                ),
            )
            finish_observability("skipped", job_id=job.id, metadata={"style_mode": style_mode, "length_mode": length_mode})
            return {"ok": True, "status": "skipped", "trace_id": trace_id}

        knowledge_entries = []
        knowledge_context = ""
        knowledge_error: str | None = None
        try:
            knowledge_entries = search_knowledge(db, comment.content)
            knowledge_context = build_knowledge_context(knowledge_entries)
        except Exception as exc:
            knowledge_entries = []
            knowledge_context = ""
            knowledge_error = f"{type(exc).__name__}: {exc}"

        search_items = []
        search_context = ""
        search_error: str | None = None
        try:
            search_result = search_web(comment.content)
            search_items = search_result.items
            search_context = build_search_context(search_items)
            if search_result.error_type:
                search_error = f"{search_result.error_type}: {search_result.error_message or ''}".strip()
        except Exception as exc:
            search_items = []
            search_context = ""
            search_error = f"{type(exc).__name__}: {exc}"

        explicit_role_card = None
        if event.role_card_key:
            explicit_role_card_item = (
                db.query(RoleCard)
                .filter(RoleCard.key == event.role_card_key, RoleCard.enabled.is_(True))
                .first()
            )
            if explicit_role_card_item:
                explicit_role_card = {
                    "key": explicit_role_card_item.key,
                    "enabled": bool(explicit_role_card_item.enabled),
                    "system_prompt": explicit_role_card_item.system_prompt,
                    "tone": explicit_role_card_item.tone or {},
                    "constraints": explicit_role_card_item.constraints or {},
                }

        active_role_card_item = (
            db.query(RoleCard)
            .filter(RoleCard.is_active.is_(True), RoleCard.enabled.is_(True))
            .order_by(RoleCard.updated_at.desc(), RoleCard.id.desc())
            .first()
        )
        active_role_card = None
        if active_role_card_item:
            active_role_card = {
                "key": active_role_card_item.key,
                "enabled": bool(active_role_card_item.enabled),
                "system_prompt": active_role_card_item.system_prompt,
                "tone": active_role_card_item.tone or {},
                "constraints": active_role_card_item.constraints or {},
            }

        generation = generate_reply_with_meta(
            comment.content,
            style_mode=style_mode,
            length_mode=length_mode,
            knowledge_context=knowledge_context,
            search_context=search_context,
            role_profile=event.role_profile if event.role_profile != "auto" else settings.role_profile_default,
            role_card=explicit_role_card,
            active_role_card=active_role_card,
        )
        reply_text = generation.reply_text
        generation_flags = {
            "llm_provider": generation.provider,
            "llm_fallback": generation.used_fallback,
            "knowledge_hit": bool(knowledge_entries),
            "knowledge_categories": [entry.category for entry in knowledge_entries],
            "search_hit": bool(search_items),
            "search_sources": [item.source for item in search_items],
            "role_profile": generation.resolved_role_profile,
            "role_card_key": generation.resolved_role_card_key,
        }
        if knowledge_error:
            generation_flags["knowledge_error"] = knowledge_error
        if search_error:
            generation_flags["search_error"] = search_error
        if generation.error_type:
            generation_flags["llm_error_type"] = generation.error_type
        if generation.error_message:
            generation_flags["llm_error_message"] = generation.error_message

        if is_recent_duplicate(db, comment.user_id, reply_text):
            job = ReplyJob(
                comment_id=comment.comment_id,
                status="dedupe_skipped",
                style_mode=style_mode,
                length_mode=length_mode,
                reply_text=reply_text,
                risk_flags={**generation_flags, "reason": "recent_phrase_duplicate"},
                attempts=1,
            )
            db.add(job)
            db.commit()
            logger.info(
                "worker_job_finished | %s",
                build_log_context(
                    trace_id=trace_id,
                    comment_id=comment.comment_id,
                    job_id=job.id,
                    status=job.status,
                    style_mode=style_mode,
                    length_mode=length_mode,
                ),
            )
            finish_observability(
                "dedupe_skipped",
                job_id=job.id,
                metadata={"style_mode": style_mode, "length_mode": length_mode, "reason": "recent_phrase_duplicate"},
            )
            return {"ok": True, "status": "dedupe_skipped", "trace_id": trace_id}

        safe, risk_flags = safety_check(reply_text)
        safety_action = decide_safety_action(safe, risk_flags)

        if safety_action in {"blocked", "manual_queue"}:
            job = ReplyJob(
                comment_id=comment.comment_id,
                status=safety_action,
                style_mode=style_mode,
                length_mode=length_mode,
                reply_text=reply_text,
                risk_flags={**generation_flags, **risk_flags},
                attempts=1,
            )
            db.add(job)
            db.commit()
            logger.info(
                "worker_job_finished | %s",
                build_log_context(
                    trace_id=trace_id,
                    comment_id=comment.comment_id,
                    job_id=job.id,
                    status=job.status,
                    style_mode=style_mode,
                    length_mode=length_mode,
                ),
            )
            finish_observability(
                safety_action,
                job_id=job.id,
                metadata={"style_mode": style_mode, "length_mode": length_mode, "decision": risk_flags.get("decision")},
            )
            return {"ok": True, "status": safety_action, "risk_flags": risk_flags, "trace_id": trace_id}

        published, publish_reason, published_at = publish_reply(comment.comment_id, reply_text, trace_id=trace_id)
        record_observability_event(
            "publish_result",
            trace_id=trace_id,
            comment_id=comment.comment_id,
            status="published" if published else "failed",
            metadata={"reason": publish_reason},
        )
        status = "published" if published else "manual_queue"

        job = ReplyJob(
            comment_id=comment.comment_id,
            status=status,
            style_mode=style_mode,
            length_mode=length_mode,
            reply_text=reply_text,
            risk_flags={
                **generation_flags,
                "publish_reason": publish_reason,
                "gateway_reason": publish_reason,
                "gateway_duplicate": publish_reason == "idempotent_replay",
            },
            attempts=1,
            published_at=published_at if published_at else None,
        )
        db.add(job)
        db.commit()
        logger.info(
            "worker_job_finished | %s",
            build_log_context(
                trace_id=trace_id,
                comment_id=comment.comment_id,
                job_id=job.id,
                status=job.status,
                style_mode=style_mode,
                length_mode=length_mode,
                publish_reason=publish_reason,
            ),
        )
        finish_observability(
            status,
            job_id=job.id,
            metadata={"style_mode": style_mode, "length_mode": length_mode, "publish_reason": publish_reason},
        )

        if published:
            remember_reply_phrase(db, comment.user_id, reply_text)

        return {
            "ok": True,
            "status": status,
            "published_at": published_at.isoformat() if isinstance(published_at, datetime) else None,
            "trace_id": trace_id,
        }
    except NonRetryableWorkerError as exc:
        db.rollback()
        failure_metadata = _build_failure_metadata(exc, retryable=False)
        finish_observability("failed_non_retryable", metadata=failure_metadata)
        record_observability_event(
            "job_failed",
            trace_id=trace_id,
            comment_id=comment_id,
            status="failed_non_retryable",
            metadata=failure_metadata,
        )
        logger.warning(
            "worker_process_non_retryable_failure | %s",
            build_log_context(
                trace_id=trace_id,
                comment_id=comment_id,
                status="failed_non_retryable",
                error_type=failure_metadata["error_type"],
                error_message=failure_metadata["error_message"],
            ),
        )
        raise
    except RetryableWorkerError as exc:
        db.rollback()
        failure_metadata = _build_failure_metadata(exc, retryable=True)
        finish_observability("failed_retryable", metadata=failure_metadata)
        record_observability_event(
            "job_failed",
            trace_id=trace_id,
            comment_id=comment_id,
            status="failed_retryable",
            metadata=failure_metadata,
        )
        logger.exception(
            "worker_process_retryable_failure | %s",
            build_log_context(
                trace_id=trace_id,
                comment_id=comment_id,
                status="failed_retryable",
                error_type=failure_metadata["error_type"],
                error_message=failure_metadata["error_message"],
            ),
        )
        raise
    except Exception as exc:
        db.rollback()
        failure_metadata = _build_failure_metadata(exc, retryable=True)
        finish_observability("failed_retryable", metadata=failure_metadata)
        record_observability_event(
            "job_failed",
            trace_id=trace_id,
            comment_id=comment_id,
            status="failed_retryable",
            metadata=failure_metadata,
        )
        logger.exception(
            "worker_process_retryable_failure | %s",
            build_log_context(
                trace_id=trace_id,
                comment_id=comment_id,
                status="failed_retryable",
                error_type=failure_metadata["error_type"],
                error_message=failure_metadata["error_message"],
            ),
        )
        raise RetryableWorkerError(str(exc)) from exc
    finally:
        db.close()


# ==================== Bilibili Polling Tasks ====================

@celery_app.task(
    name="poll_bilibili_comments_task",
    bind=True,
)
def poll_bilibili_comments_task(self) -> dict:
    """定时轮询 B站视频评论"""
    from app.services.bilibili_poller import poll_bilibili_comments_task as _poll

    logger.info("bilibili_poll_task_started")
    result = _poll()
    logger.info(f"bilibili_poll_task_completed | result={result}")
    return result


def schedule_bilibili_polling() -> None:
    """配置 B站评论轮询定时任务"""
    if not (settings.bilibili_enabled and settings.bilibili_poll_enabled):
        logger.info("bilibili_polling_not_configured")
        return

    interval_seconds = max(60, settings.bilibili_poll_interval_seconds)

    celery_app.conf.beat_schedule = {
        **getattr(celery_app.conf, "beat_schedule", {}),
        "poll-bilibili-comments": {
            "task": "poll_bilibili_comments_task",
            "schedule": interval_seconds,
        },
    }

    logger.info(f"bilibili_polling_scheduled | interval_seconds={interval_seconds}")
