from datetime import datetime
import logging

from celery import Celery
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.entities import Comment, ReplyJob
from app.services.dedupe import is_recent_duplicate, remember_reply_phrase
from app.services.decider import decide_safety_action, should_reply
from app.services.generator import generate_reply_with_meta
from app.services.observability import build_log_context, ensure_trace_id
from app.services.publisher import publish_reply
from app.services.safety import safety_check
from app.settings import settings
from app.schemas import CommentEvent

celery_app = Celery(
    "bili_pet_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
logger = logging.getLogger(__name__)


def enqueue_comment_event(event: CommentEvent) -> None:
    process_comment_event_task.delay(event.model_dump())


@celery_app.task(name="process_comment_event_task")
def process_comment_event_task(event_payload: dict):
    trace_id = ensure_trace_id(event_payload.get("trace_id") if isinstance(event_payload, dict) else None)
    comment_id = event_payload.get("comment_id") if isinstance(event_payload, dict) else None
    if settings.kill_switch:
        logger.warning(
            "worker_kill_switch_enabled | %s",
            build_log_context(trace_id=trace_id, comment_id=comment_id, status="kill_switch_enabled"),
        )
        return {"ok": False, "reason": "kill_switch_enabled", "trace_id": trace_id}

    db: Session = SessionLocal()
    try:
        force_long = event_payload.get("force_long", False)
        comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
        if not comment:
            logger.warning(
                "worker_comment_not_found | %s",
                build_log_context(trace_id=trace_id, comment_id=comment_id, status="comment_not_found"),
            )
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
            force_long=force_long,
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
            return {"ok": True, "status": "skipped", "trace_id": trace_id}

        generation = generate_reply_with_meta(comment.content, style_mode=style_mode, length_mode=length_mode)
        reply_text = generation.reply_text
        generation_flags = {
            "llm_provider": generation.provider,
            "llm_fallback": generation.used_fallback,
        }
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
            return {"ok": True, "status": safety_action, "risk_flags": risk_flags, "trace_id": trace_id}

        published, publish_reason, published_at = publish_reply(comment.comment_id, reply_text, trace_id=trace_id)
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

        if published:
            remember_reply_phrase(db, comment.user_id, reply_text)

        return {
            "ok": True,
            "status": status,
            "published_at": published_at.isoformat() if isinstance(published_at, datetime) else None,
            "trace_id": trace_id,
        }
    except Exception:
        db.rollback()
        logger.exception(
            "worker_process_failed | %s",
            build_log_context(trace_id=trace_id, comment_id=comment_id, status="failed"),
        )
        raise
    finally:
        db.close()
