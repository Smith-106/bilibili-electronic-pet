import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import require_api_key
from app.db import get_db
from app.models.entities import PublishLog
from app.schemas import PlatformName, PublishWebhookRequest
from app.services.hashing import reply_hash, verify_payload_signature
from app.services.observability import build_log_context, ensure_trace_id
from app.services.platforms import is_platform_enabled
from app.services.publisher import publish_gateway_reply, publish_platform_reply
from app.settings import settings

router = APIRouter(prefix="/gateway", tags=["gateway"], dependencies=[Depends(require_api_key)])
logger = logging.getLogger(__name__)


def _normalize_failed_reason(reason: str) -> str:
    normalized = (reason or "").strip()
    if normalized:
        return normalized
    return "real_publish_failed:unknown"


def _publish_core(
    payload: PublishWebhookRequest,
    *,
    authorization: str | None,
    x_signature: str | None,
    x_trace_id: str | None,
    db: Session,
    platform: PlatformName | None = None,
):
    trace_id = ensure_trace_id(payload.trace_id or x_trace_id)
    expected_token = settings.gateway_token.strip()
    if expected_token:
        expected_header = f"Bearer {expected_token}"
        if authorization != expected_header:
            logger.warning(
                "gateway_publish_rejected | %s",
                build_log_context(
                    trace_id=trace_id,
                    comment_id=payload.comment_id,
                    status="unauthorized",
                ),
            )
            raise HTTPException(status_code=401, detail="unauthorized")

    hmac_secret = settings.gateway_hmac_secret.strip()
    if hmac_secret:
        if not x_signature:
            logger.warning(
                "gateway_publish_rejected | %s",
                build_log_context(
                    trace_id=trace_id,
                    comment_id=payload.comment_id,
                    status="missing_signature",
                ),
            )
            raise HTTPException(status_code=401, detail="missing_signature")
        if not verify_payload_signature(payload.model_dump(exclude_none=True), hmac_secret, x_signature):
            logger.warning(
                "gateway_publish_rejected | %s",
                build_log_context(
                    trace_id=trace_id,
                    comment_id=payload.comment_id,
                    status="invalid_signature",
                ),
            )
            raise HTTPException(status_code=401, detail="invalid_signature")

    hashed = reply_hash(payload.comment_id, payload.reply_text)
    existing = (
        db.query(PublishLog)
        .filter(PublishLog.comment_id == payload.comment_id, PublishLog.reply_hash == hashed)
        .first()
    )
    if existing:
        logger.info(
            "gateway_publish_duplicate | %s",
            build_log_context(
                trace_id=trace_id,
                comment_id=payload.comment_id,
                status="idempotent_replay",
                publish_log_id=existing.id,
            ),
        )
        return {
            "ok": True,
            "published": False,
            "duplicate": True,
            "reason": "idempotent_replay",
            "trace_id": trace_id,
        }

    if platform:
        published, publish_reason, published_at = publish_platform_reply(
            platform=platform,
            comment_id=payload.comment_id,
            reply_text=payload.reply_text,
            force_publish=payload.force_publish,
            trace_id=trace_id,
        )
    else:
        published, publish_reason, published_at = publish_gateway_reply(
            comment_id=payload.comment_id,
            reply_text=payload.reply_text,
            force_publish=payload.force_publish,
            source=payload.source,
            trace_id=trace_id,
        )
    if not published:
        normalized_reason = _normalize_failed_reason(publish_reason)
        logger.warning(
            "gateway_publish_failed | %s",
            build_log_context(
                trace_id=trace_id,
                comment_id=payload.comment_id,
                status=normalized_reason,
            ),
        )
        return {
            "ok": False,
            "published": False,
            "reason": normalized_reason,
            "comment_id": payload.comment_id,
            "trace_id": trace_id,
        }

    source_value = payload.source
    if platform == "bilibili":
        source_value = settings.platform_bilibili_publish_source
    elif platform == "douyin":
        source_value = settings.platform_douyin_publish_source
    elif platform == "kuaishou":
        source_value = settings.platform_kuaishou_publish_source

    log = PublishLog(comment_id=payload.comment_id, reply_hash=hashed, source=source_value)
    db.add(log)
    db.commit()
    logger.info(
        "gateway_publish_recorded | %s",
        build_log_context(
            trace_id=trace_id,
            comment_id=payload.comment_id,
            status=publish_reason,
            publish_log_id=log.id,
        ),
    )

    return {
        "ok": True,
        "published": True,
        "reason": publish_reason,
        "comment_id": payload.comment_id,
        "published_at": published_at.isoformat() if published_at else None,
        "trace_id": trace_id,
    }


@router.post("/publish")
def publish_gateway(
    payload: PublishWebhookRequest,
    authorization: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
    x_trace_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    return _publish_core(
        payload,
        authorization=authorization,
        x_signature=x_signature,
        x_trace_id=x_trace_id,
        db=db,
        platform=None,
    )


def _publish_for_platform(
    platform: PlatformName,
    payload: PublishWebhookRequest,
    authorization: str | None,
    x_signature: str | None,
    x_trace_id: str | None,
    db: Session,
):
    if not is_platform_enabled(platform):
        raise HTTPException(status_code=403, detail=f"platform_disabled: {platform}")
    return _publish_core(
        payload,
        authorization=authorization,
        x_signature=x_signature,
        x_trace_id=x_trace_id,
        db=db,
        platform=platform,
    )


@router.post("/publish/bilibili")
def publish_gateway_bilibili(
    payload: PublishWebhookRequest,
    authorization: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
    x_trace_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    return _publish_for_platform("bilibili", payload, authorization, x_signature, x_trace_id, db)


@router.post("/publish/douyin")
def publish_gateway_douyin(
    payload: PublishWebhookRequest,
    authorization: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
    x_trace_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    return _publish_for_platform("douyin", payload, authorization, x_signature, x_trace_id, db)


@router.post("/publish/kuaishou")
def publish_gateway_kuaishou(
    payload: PublishWebhookRequest,
    authorization: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
    x_trace_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    return _publish_for_platform("kuaishou", payload, authorization, x_signature, x_trace_id, db)


@router.get("/publish-logs")
def list_publish_logs(
    comment_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(PublishLog)
    if comment_id:
        query = query.filter(PublishLog.comment_id == comment_id)

    items = query.order_by(PublishLog.id.desc()).limit(limit).all()
    return {
        "ok": True,
        "items": [
            {
                "id": item.id,
                "comment_id": item.comment_id,
                "reply_hash": item.reply_hash,
                "source": item.source,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
    }
