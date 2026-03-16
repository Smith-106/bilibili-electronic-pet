from datetime import datetime, timedelta, timezone
import csv
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import require_api_key
from app.db import get_db
from app.models.entities import Comment, OperationAuditLog, ReplyJob
from app.schemas import (
    ApproveJobRequest,
    BatchApproveJobsRequest,
    BatchRetryJobsRequest,
    CommentEvent,
    PlatformName,
    RetryJobRequest,
)
from app.settings import settings
from app.services.collector import (
    collect_official_connector_event,
    collect_platform_event_via_config,
    collect_poller_event,
    collect_webhook_event,
)
from app.services.dedupe import remember_reply_phrase
from app.services.observability import (
    build_log_context,
    ensure_trace_id,
    normalize_status_counts,
    record_observability_event,
)
from app.services.platforms import is_platform_enabled
from app.services.publisher import publish_reply
from app.workers.jobs import enqueue_comment_event, process_comment_event_task

router = APIRouter(prefix="/api", tags=["comments"], dependencies=[Depends(require_api_key)])
logger = logging.getLogger(__name__)
LIST_LIMIT_MAX = 1000
LIST_OFFSET_MAX = 100000


def _log_info(event: str, *, trace_id: str, comment_id: str | None = None, job_id: int | None = None, status: str | None = None, **extra):
    logger.info(
        "%s | %s",
        event,
        build_log_context(trace_id=trace_id, comment_id=comment_id, job_id=job_id, status=status, **extra),
    )


def _log_warning(
    event: str,
    *,
    trace_id: str,
    comment_id: str | None = None,
    job_id: int | None = None,
    status: str | None = None,
    **extra,
):
    logger.warning(
        "%s | %s",
        event,
        build_log_context(trace_id=trace_id, comment_id=comment_id, job_id=job_id, status=status, **extra),
    )


def _job_to_dict(item: ReplyJob, comment_content: str | None = None) -> dict:
    return {
        "id": item.id,
        "comment_id": item.comment_id,
        "status": item.status,
        "length_mode": item.length_mode,
        "style_mode": item.style_mode,
        "reply_text": item.reply_text,
        "comment_content": comment_content,
        "risk_flags": item.risk_flags,
        "attempts": item.attempts,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "published_at": item.published_at.isoformat() if item.published_at else None,
    }


def _write_audit_log(
    db: Session,
    *,
    action: str,
    target_id: int | None,
    ok: bool,
    trace_id: str,
    comment_id: str | None = None,
    status: str | None = None,
    payload: dict,
):
    enriched_payload = {
        **payload,
        "trace_id": trace_id,
    }
    if comment_id is not None:
        enriched_payload["comment_id"] = comment_id
    if status is not None:
        enriched_payload["status"] = status
    db.add(
        OperationAuditLog(
            action=action,
            target_type="reply_job",
            target_id=target_id,
            ok=ok,
            payload=enriched_payload,
        )
    )
    db.commit()


def _ingest_comment_event_core(db: Session, event: CommentEvent, *, source: str) -> dict:
    trace_id = ensure_trace_id(event.trace_id)
    event = event.model_copy(update={"trace_id": trace_id})

    platform: str = str(getattr(event, "platform", None) or "bilibili")
    canonical_comment_id = f"{platform}:{event.comment_id}"

    comment = Comment(
        platform=platform,
        canonical_comment_id=canonical_comment_id,
        comment_id=event.comment_id,
        video_id=event.video_id,
        user_id=event.user_id,
        content=event.content,
        parent_id=event.parent_id,
    )
    db.add(comment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        record_observability_event(
            "comment_ingested",
            trace_id=trace_id,
            comment_id=event.comment_id,
            status="duplicate_ignored",
            metadata={"source": source, "platform": platform},
        )
        _log_info(
            "comment_ingest_duplicate",
            trace_id=trace_id,
            comment_id=event.comment_id,
            status="duplicate_ignored",
            source=source,
        )
        return {"ok": True, "message": "duplicate_ignored", "comment_id": event.comment_id, "trace_id": trace_id}

    record_observability_event(
        "comment_ingested",
        trace_id=trace_id,
        comment_id=event.comment_id,
        status="queued",
        metadata={"source": source, "platform": platform},
    )
    enqueue_comment_event(event.model_copy(update={"platform": platform}))
    _log_info(
        "comment_ingest_queued",
        trace_id=trace_id,
        comment_id=event.comment_id,
        status="queued",
        source=source,
    )
    return {"ok": True, "queued": True, "comment_id": event.comment_id, "trace_id": trace_id}


def _normalize_event_payload(raw_payload: dict, source: str) -> CommentEvent:
    try:
        if source == "poller":
            return collect_poller_event(raw_payload)
        if source == "official":
            return collect_official_connector_event(raw_payload)
        return collect_webhook_event(raw_payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _normalize_platform_event_payload(raw_payload: dict, platform: PlatformName) -> CommentEvent:
    if not is_platform_enabled(platform):
        raise HTTPException(status_code=403, detail=f"platform_disabled: {platform}")
    try:
        return collect_platform_event_via_config(raw_payload, platform)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _approve_job_core(
    db: Session,
    job: ReplyJob,
    *,
    trace_id: str,
    override_reply_text: str | None = None,
) -> dict:
    if job.status not in {"manual_queue", "blocked", "dedupe_skipped"}:
        raise HTTPException(status_code=400, detail=f"job_status_not_approvable: {job.status}")

    comment = db.query(Comment).filter(Comment.canonical_comment_id == f"bilibili:{job.comment_id}").first()
    if not comment:
        raise HTTPException(status_code=404, detail="comment_not_found")

    reply_text = override_reply_text.strip() if override_reply_text else (job.reply_text or "")
    if not reply_text:
        raise HTTPException(status_code=400, detail="empty_reply_text")

    published, publish_reason, published_at = publish_reply(
        job.comment_id,
        reply_text,
        force_publish=True,
        trace_id=trace_id,
    )
    if not published:
        raise HTTPException(status_code=500, detail=f"approve_publish_failed: {publish_reason}")

    job.status = "published"
    job.reply_text = reply_text
    job.risk_flags = {
        **(job.risk_flags or {}),
        "approved": True,
        "publish_reason": publish_reason,
        "gateway_reason": publish_reason,
        "gateway_duplicate": publish_reason == "idempotent_replay",
    }
    job.published_at = published_at
    job.attempts = (job.attempts or 0) + 1
    db.commit()

    remember_reply_phrase(db, comment.user_id, reply_text)

    return {
        "ok": True,
        "job_id": job.id,
        "status": job.status,
        "published_at": job.published_at.isoformat() if job.published_at else None,
        "trace_id": trace_id,
    }


@router.post("/events/comment")
def ingest_comment(payload: dict, db: Session = Depends(get_db)):
    event = _normalize_event_payload(payload, source="webhook")
    return _ingest_comment_event_core(db, event, source="webhook")


@router.post("/events/comment/poller")
def ingest_comment_from_poller(payload: dict, db: Session = Depends(get_db)):
    event = _normalize_event_payload(payload, source="poller")
    return _ingest_comment_event_core(db, event, source="poller")


@router.post("/events/comment/official")
def ingest_comment_from_official(payload: dict, db: Session = Depends(get_db)):
    event = _normalize_event_payload(payload, source="official")
    return _ingest_comment_event_core(db, event, source="official")


@router.post("/events/comment/bilibili")
def ingest_comment_from_bilibili(payload: dict, db: Session = Depends(get_db)):
    event = _normalize_platform_event_payload(payload, platform="bilibili")
    return _ingest_comment_event_core(db, event, source="bilibili")


@router.post("/events/comment/douyin")
def ingest_comment_from_douyin(payload: dict, db: Session = Depends(get_db)):
    event = _normalize_platform_event_payload(payload, platform="douyin")
    return _ingest_comment_event_core(db, event, source="douyin")


@router.post("/events/comment/kuaishou")
def ingest_comment_from_kuaishou(payload: dict, db: Session = Depends(get_db)):
    event = _normalize_platform_event_payload(payload, platform="kuaishou")
    return _ingest_comment_event_core(db, event, source="kuaishou")


@router.post("/jobs/{job_id}/retry")
def retry_job(job_id: int, payload: RetryJobRequest, db: Session = Depends(get_db)):
    trace_id = ensure_trace_id()
    job = db.query(ReplyJob).filter(ReplyJob.id == job_id).first()
    if not job:
        _write_audit_log(
            db,
            action="retry_single",
            target_id=job_id,
            ok=False,
            trace_id=trace_id,
            status="job_not_found",
            payload={"error": "job_not_found", "force_long": payload.force_long},
        )
        _log_warning("job_retry_failed", trace_id=trace_id, job_id=job_id, status="job_not_found")
        raise HTTPException(status_code=404, detail="job_not_found")

    process_comment_event_task.delay(
        {
            "comment_id": job.comment_id,
            "force_long": payload.force_long,
            "style_profile": payload.style_profile,
            "role_profile": payload.role_profile,
            "role_card_key": payload.role_card_key,
            "trace_id": trace_id,
        }
    )
    _write_audit_log(
        db,
        action="retry_single",
        target_id=job_id,
        ok=True,
        trace_id=trace_id,
        comment_id=job.comment_id,
        status="queued",
        payload={
            "comment_id": job.comment_id,
            "force_long": payload.force_long,
            "style_profile": payload.style_profile,
            "role_profile": payload.role_profile,
            "role_card_key": payload.role_card_key,
        },
    )
    _log_info("job_retry_queued", trace_id=trace_id, comment_id=job.comment_id, job_id=job_id, status="queued")
    return {"ok": True, "requeued": True, "job_id": job_id, "trace_id": trace_id}


@router.post("/jobs/{job_id}/approve")
def approve_job(job_id: int, payload: ApproveJobRequest, db: Session = Depends(get_db)):
    trace_id = ensure_trace_id()
    job = db.query(ReplyJob).filter(ReplyJob.id == job_id).first()
    if not job:
        _write_audit_log(
            db,
            action="approve_single",
            target_id=job_id,
            ok=False,
            trace_id=trace_id,
            status="job_not_found",
            payload={"error": "job_not_found"},
        )
        _log_warning("job_approve_failed", trace_id=trace_id, job_id=job_id, status="job_not_found")
        raise HTTPException(status_code=404, detail="job_not_found")

    try:
        result = _approve_job_core(db=db, job=job, trace_id=trace_id, override_reply_text=payload.override_reply_text)
        _write_audit_log(
            db,
            action="approve_single",
            target_id=job_id,
            ok=True,
            trace_id=trace_id,
            comment_id=job.comment_id,
            status=result["status"],
            payload={"status": result["status"]},
        )
        _log_info(
            "job_approve_succeeded",
            trace_id=trace_id,
            comment_id=job.comment_id,
            job_id=job.id,
            status=result["status"],
        )
        return result
    except HTTPException as exc:
        _write_audit_log(
            db,
            action="approve_single",
            target_id=job_id,
            ok=False,
            trace_id=trace_id,
            comment_id=job.comment_id,
            status="approve_failed",
            payload={"error": str(exc.detail)},
        )
        _log_warning(
            "job_approve_failed",
            trace_id=trace_id,
            comment_id=job.comment_id,
            job_id=job.id,
            status="approve_failed",
            detail=str(exc.detail),
        )
        raise


@router.post("/jobs/approve-batch")
def approve_jobs_batch(payload: BatchApproveJobsRequest, db: Session = Depends(get_db)):
    trace_id = ensure_trace_id()
    results: list[dict] = []
    success = 0
    failed = 0

    for job_id in payload.job_ids:
        job = db.query(ReplyJob).filter(ReplyJob.id == job_id).first()
        if not job:
            failed += 1
            results.append({"job_id": job_id, "ok": False, "error": "job_not_found"})
            _log_warning("job_approve_batch_item_failed", trace_id=trace_id, job_id=job_id, status="job_not_found")
            continue

        try:
            result = _approve_job_core(db=db, job=job, trace_id=trace_id)
            success += 1
            results.append({"job_id": job_id, "ok": True, "status": result["status"]})
        except HTTPException as exc:
            failed += 1
            results.append({"job_id": job_id, "ok": False, "error": str(exc.detail)})
            _log_warning(
                "job_approve_batch_item_failed",
                trace_id=trace_id,
                comment_id=job.comment_id,
                job_id=job.id,
                status="approve_failed",
                detail=str(exc.detail),
            )

    summary = {
        "total": len(payload.job_ids),
        "success": success,
        "failed": failed,
    }
    _write_audit_log(
        db,
        action="approve_batch",
        target_id=None,
        ok=failed == 0,
        trace_id=trace_id,
        status="published" if failed == 0 else "partial_failure",
        payload={"job_ids": payload.job_ids, "summary": summary},
    )
    _log_info(
        "job_approve_batch_finished",
        trace_id=trace_id,
        status="published" if failed == 0 else "partial_failure",
        total=summary["total"],
        success=summary["success"],
        failed=summary["failed"],
    )

    return {
        "ok": True,
        "summary": summary,
        "results": results,
        "trace_id": trace_id,
    }


@router.post("/jobs/retry-batch")
def retry_jobs_batch(payload: BatchRetryJobsRequest, db: Session = Depends(get_db)):
    trace_id = ensure_trace_id()
    results: list[dict] = []
    success = 0
    failed = 0

    for job_id in payload.job_ids:
        job = db.query(ReplyJob).filter(ReplyJob.id == job_id).first()
        if not job:
            failed += 1
            results.append({"job_id": job_id, "ok": False, "error": "job_not_found"})
            _log_warning("job_retry_batch_item_failed", trace_id=trace_id, job_id=job_id, status="job_not_found")
            continue

        process_comment_event_task.delay(
            {
                "comment_id": job.comment_id,
                "force_long": payload.force_long,
                "role_profile": settings.role_profile_default,
                "trace_id": trace_id,
            }
        )
        success += 1
        results.append({"job_id": job_id, "ok": True, "requeued": True})

    summary = {
        "total": len(payload.job_ids),
        "success": success,
        "failed": failed,
    }
    _write_audit_log(
        db,
        action="retry_batch",
        target_id=None,
        ok=failed == 0,
        trace_id=trace_id,
        status="queued" if failed == 0 else "partial_failure",
        payload={"job_ids": payload.job_ids, "force_long": payload.force_long, "summary": summary},
    )
    _log_info(
        "job_retry_batch_finished",
        trace_id=trace_id,
        status="queued" if failed == 0 else "partial_failure",
        total=summary["total"],
        success=summary["success"],
        failed=summary["failed"],
    )

    return {
        "ok": True,
        "summary": summary,
        "results": results,
        "trace_id": trace_id,
    }


@router.get("/comments/{comment_id}")
def get_comment(comment_id: str, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="comment_not_found")

    jobs = db.query(ReplyJob).filter(ReplyJob.comment_id == comment_id).order_by(ReplyJob.id.desc()).all()
    return {
        "ok": True,
        "comment": {
            "comment_id": comment.comment_id,
            "video_id": comment.video_id,
            "user_id": comment.user_id,
            "content": comment.content,
            "parent_id": comment.parent_id,
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
        },
        "jobs": [_job_to_dict(item, comment_content=comment.content) for item in jobs],
    }


@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    item = db.query(ReplyJob).filter(ReplyJob.id == job_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="job_not_found")

    comment = db.query(Comment).filter(Comment.comment_id == item.comment_id).first()
    comment_content = comment.content if comment else None
    return {"ok": True, "item": _job_to_dict(item, comment_content=comment_content)}


@router.get("/jobs")
def list_jobs(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=LIST_LIMIT_MAX),
    offset: int = Query(default=0, ge=0, le=LIST_OFFSET_MAX),
    db: Session = Depends(get_db),
):
    query = db.query(ReplyJob)
    if status:
        query = query.filter(ReplyJob.status == status)

    items = query.order_by(ReplyJob.created_at.desc(), ReplyJob.id.desc()).offset(offset).limit(limit).all()
    comment_ids = [item.comment_id for item in items]
    comments = db.query(Comment).filter(Comment.comment_id.in_(comment_ids)).all() if comment_ids else []
    content_map = {comment.comment_id: comment.content for comment in comments}

    return {
        "ok": True,
        "items": [_job_to_dict(item, comment_content=content_map.get(item.comment_id)) for item in items],
    }


@router.get("/export/jobs.csv")
def export_jobs_csv(
    status: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    query = db.query(ReplyJob)
    if status:
        query = query.filter(ReplyJob.status == status)

    items = query.order_by(ReplyJob.created_at.desc(), ReplyJob.id.desc()).limit(limit).all()
    comment_ids = [item.comment_id for item in items]
    comments = db.query(Comment).filter(Comment.comment_id.in_(comment_ids)).all() if comment_ids else []
    content_map = {comment.comment_id: comment.content for comment in comments}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "job_id",
            "comment_id",
            "status",
            "style_mode",
            "length_mode",
            "attempts",
            "created_at",
            "published_at",
            "comment_content",
            "reply_text",
            "risk_flags",
        ]
    )

    for item in items:
        writer.writerow(
            [
                item.id,
                item.comment_id,
                item.status,
                item.style_mode,
                item.length_mode,
                item.attempts,
                item.created_at.isoformat() if item.created_at else "",
                item.published_at.isoformat() if item.published_at else "",
                content_map.get(item.comment_id) or "",
                item.reply_text or "",
                str(item.risk_flags or {}),
            ]
        )

    csv_body = output.getvalue()
    output.close()

    filename = f"jobs_export_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.csv"
    response = StreamingResponse(iter([csv_body]), media_type="text/csv; charset=utf-8")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@router.get("/audit-logs")
def list_audit_logs(
    action: str | None = Query(default=None),
    ok: bool | None = Query(default=None),
    target_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    trace_id: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=LIST_LIMIT_MAX),
    offset: int = Query(default=0, ge=0, le=LIST_OFFSET_MAX),
    db: Session = Depends(get_db),
):
    query = db.query(OperationAuditLog)
    if action:
        query = query.filter(OperationAuditLog.action == action)
    if ok is not None:
        query = query.filter(OperationAuditLog.ok == ok)
    if target_id is not None:
        query = query.filter(OperationAuditLog.target_id == target_id)
    if status:
        query = query.filter(OperationAuditLog.payload["status"].as_string() == status)
    if trace_id:
        query = query.filter(OperationAuditLog.payload["trace_id"].as_string() == trace_id)

    total = query.count()
    items = query.order_by(OperationAuditLog.created_at.desc(), OperationAuditLog.id.desc()).offset(offset).limit(limit).all()
    return {
        "ok": True,
        "summary": {
            "total": total,
            "returned": len(items),
            "limit": limit,
        },
        "items": [
            {
                "id": item.id,
                "action": item.action,
                "target_type": item.target_type,
                "target_id": item.target_id,
                "ok": item.ok,
                "payload": item.payload,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
    }


@router.get("/export/audit-logs.csv")
def export_audit_logs_csv(
    action: str | None = Query(default=None),
    ok: bool | None = Query(default=None),
    target_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    trace_id: str | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    query = db.query(OperationAuditLog)
    if action:
        query = query.filter(OperationAuditLog.action == action)
    if ok is not None:
        query = query.filter(OperationAuditLog.ok == ok)
    if target_id is not None:
        query = query.filter(OperationAuditLog.target_id == target_id)
    if status:
        query = query.filter(OperationAuditLog.payload["status"].as_string() == status)
    if trace_id:
        query = query.filter(OperationAuditLog.payload["trace_id"].as_string() == trace_id)

    items = query.order_by(OperationAuditLog.created_at.desc(), OperationAuditLog.id.desc()).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "action", "target_type", "target_id", "ok", "status", "trace_id", "payload", "created_at"])

    for item in items:
        payload = item.payload or {}
        writer.writerow(
            [
                item.id,
                item.action,
                item.target_type,
                item.target_id if item.target_id is not None else "",
                item.ok,
                str(payload.get("status", "")),
                str(payload.get("trace_id", "")),
                str(payload),
                item.created_at.isoformat() if item.created_at else "",
            ]
        )

    csv_body = output.getvalue()
    output.close()

    filename = f"audit_logs_export_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.csv"
    response = StreamingResponse(iter([csv_body]), media_type="text/csv; charset=utf-8")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@router.get("/audit-logs/summary")
def summarize_audit_logs(
    days: int = Query(default=7, ge=1, le=90),
    action: str | None = Query(default=None),
    ok: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    start_utc = datetime.now(timezone.utc) - timedelta(days=days)
    query = db.query(OperationAuditLog).filter(OperationAuditLog.created_at >= start_utc)
    if action:
        query = query.filter(OperationAuditLog.action == action)
    if ok is not None:
        query = query.filter(OperationAuditLog.ok == ok)

    items = query.all()
    by_action: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_result = {"ok": 0, "failed": 0}

    for item in items:
        by_action[item.action] = by_action.get(item.action, 0) + 1
        payload = item.payload or {}
        status_value = str(payload.get("status") or "").strip()
        if status_value:
            by_status[status_value] = by_status.get(status_value, 0) + 1
        if item.ok:
            by_result["ok"] += 1
        else:
            by_result["failed"] += 1

    return {
        "ok": True,
        "days": days,
        "totals": {"audit_logs": len(items)},
        "by_action": dict(sorted(by_action.items())),
        "by_status": dict(sorted(by_status.items())),
        "by_result": by_result,
    }


@router.get("/metrics/overview")
def metrics_overview(db: Session = Depends(get_db)):
    total_jobs = db.query(func.count(ReplyJob.id)).scalar() or 0
    total_comments = db.query(func.count(Comment.id)).scalar() or 0

    by_status_rows = db.query(ReplyJob.status, func.count(ReplyJob.id)).group_by(ReplyJob.status).all()
    by_status = normalize_status_counts({status: count for status, count in by_status_rows})

    audit_rows = (
        db.query(OperationAuditLog.action, OperationAuditLog.ok, func.count(OperationAuditLog.id))
        .group_by(OperationAuditLog.action, OperationAuditLog.ok)
        .all()
    )
    audit_by_action: dict[str, int] = {}
    audit_by_action_result: dict[str, dict[str, int]] = {}
    audit_by_result = {"ok": 0, "failed": 0}
    for action, audit_ok, count in audit_rows:
        action_key = str(action)
        count_value = int(count or 0)
        audit_by_action[action_key] = audit_by_action.get(action_key, 0) + count_value

        row = audit_by_action_result.setdefault(action_key, {"ok": 0, "failed": 0})
        if audit_ok:
            row["ok"] += count_value
            audit_by_result["ok"] += count_value
        else:
            row["failed"] += count_value
            audit_by_result["failed"] += count_value

    return {
        "ok": True,
        "totals": {
            "comments": total_comments,
            "jobs": total_jobs,
            "audit_logs": audit_by_result["ok"] + audit_by_result["failed"],
        },
        "by_status": by_status,
        "audit": {
            "by_action": dict(sorted(audit_by_action.items())),
            "by_action_result": dict(sorted(audit_by_action_result.items())),
            "by_result": audit_by_result,
        },
    }


@router.get("/metrics/daily")
def metrics_daily(
    days: int = Query(default=7, ge=1, le=60),
    db: Session = Depends(get_db),
):
    start_utc = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            func.date(ReplyJob.created_at).label("day"),
            ReplyJob.status,
            func.count(ReplyJob.id).label("count"),
        )
        .filter(ReplyJob.created_at >= start_utc)
        .group_by(func.date(ReplyJob.created_at), ReplyJob.status)
        .order_by(func.date(ReplyJob.created_at).asc())
        .all()
    )

    grouped: dict[str, dict[str, int]] = {}
    totals_by_status: dict[str, int] = {}
    for day, status, count in rows:
        day_key = str(day)
        if day_key not in grouped:
            grouped[day_key] = {}
        count_value = int(count or 0)
        grouped[day_key][status] = count_value
        totals_by_status[status] = totals_by_status.get(status, 0) + count_value

    items = []
    for day_key in sorted(grouped.keys()):
        status_map = grouped[day_key]
        normalized_status_map = normalize_status_counts(status_map)
        items.append(
            {
                "date": day_key,
                "queued": normalized_status_map.get("queued", 0),
                "published": normalized_status_map.get("published", 0),
                "manual_queue": normalized_status_map.get("manual_queue", 0),
                "blocked": normalized_status_map.get("blocked", 0),
                "dedupe_skipped": normalized_status_map.get("dedupe_skipped", 0),
                "skipped": normalized_status_map.get("skipped", 0),
                "status_breakdown": dict(sorted(normalized_status_map.items())),
                "total": sum(status_map.values()),
            }
        )

    return {
        "ok": True,
        "days": days,
        "totals_by_status": dict(sorted(normalize_status_counts(totals_by_status).items())),
        "items": items,
    }
