"""
Bilibili Publisher Service

实现真实发布回复到 B站评论的功能。
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.entities import BilibiliVideo, PublishLog
from app.services.hashing import reply_hash
from app.services.publisher import normalize_publish_failure_reason
from app.settings import settings

logger = logging.getLogger(__name__)


class BilibiliPublisher:
    """B站真实发布服务"""

    def __init__(self, db: Session):
        self.db = db

    def is_enabled(self) -> bool:
        """检查发布功能是否启用"""
        return settings.bilibili_enabled and settings.bilibili_publish_enabled

    def publish_reply(
        self,
        comment_id: str,
        reply_text: str,
        video_bvid: str | None = None,
        oid: int | None = None,
        trace_id: str | None = None,
    ) -> tuple[bool, str, datetime | None, int | None]:
        """发布回复到 B站评论

        Args:
            comment_id: 要回复的评论 ID (rpid)
            reply_text: 回复内容
            video_bvid: 视频 BV 号（用于获取 oid）
            oid: 视频的 aid（如果已知可直接传入）
            trace_id: 追踪 ID

        Returns:
            tuple: (是否成功, 原因, 发布时间, 新评论 ID)
        """
        if not self.is_enabled():
            logger.warning("bilibili_publish_disabled")
            return False, "disabled", None, None

        if oid is None:
            if video_bvid:
                video = self.db.query(BilibiliVideo).filter(BilibiliVideo.bvid == video_bvid).first()
                if video and video.aid:
                    oid = video.aid
                else:
                    logger.error(f"bilibili_publish_no_oid | bvid={video_bvid}")
                    return False, "video_not_found", None, None
            else:
                logger.error("bilibili_publish_no_video_info")
                return False, "no_video_info", None, None

        canonical_comment_id = f"bilibili:{comment_id}"
        hashed = reply_hash(comment_id, reply_text)

        reserved = PublishLog(
            platform="bilibili",
            canonical_comment_id=canonical_comment_id,
            comment_id=comment_id,
            reply_hash=hashed,
            source="bilibili-api",
            status="reserved",
        )
        self.db.add(reserved)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            logger.info(f"bilibili_publish_duplicate | comment_id={comment_id} trace_id={trace_id}")
            return False, "duplicate", None, None

        try:
            from app.services.bilibili_client import BilibiliClient

            client = BilibiliClient(self.db)

            credential = client.get_credential()
            if not credential:
                reserved.status = "failed"
                reserved.failure_reason = "auth"
                self.db.commit()
                logger.error("bilibili_publish_no_credential")
                return False, "auth", None, None

            is_expiring, remaining_days = client.check_credential_expiration()
            if is_expiring:
                logger.warning(f"bilibili_credential_expiring | remaining_days={remaining_days}")

            success, reason, new_rpid = client.reply_comment(
                oid=oid,
                rpid=int(comment_id),
                message=reply_text,
            )

            if not success:
                reserved.status = "failed"
                failure_reason = normalize_publish_failure_reason(reason)
                reserved.failure_reason = failure_reason
                self.db.commit()
                logger.error(
                    f"bilibili_publish_failed | comment_id={comment_id} oid={oid} reason={reason} trace_id={trace_id}"
                )
                return False, failure_reason, None, None

            published_at = datetime.now(timezone.utc)
            reserved.status = "published"
            reserved.published_at = published_at
            reserved.failure_reason = None
            self.db.commit()

            logger.info(
                f"bilibili_publish_success | comment_id={comment_id} oid={oid} new_rpid={new_rpid} trace_id={trace_id}"
            )
            return True, "published", published_at, new_rpid

        except Exception as e:
            error_msg = str(e)
            reserved.status = "failed"
            failure_reason = normalize_publish_failure_reason(error_msg)
            reserved.failure_reason = failure_reason
            self.db.commit()
            logger.error(
                f"bilibili_publish_error | comment_id={comment_id} oid={oid} error={error_msg} trace_id={trace_id}"
            )
            return False, failure_reason, None, None


def publish_bilibili_reply(
    comment_id: str,
    reply_text: str,
    video_bvid: str | None = None,
    oid: int | None = None,
    trace_id: str | None = None,
    db: Session | None = None,
) -> tuple[bool, str, datetime | None, int | None]:
    """发布回复到 B站（便捷函数）"""
    from app.db import SessionLocal

    _db = db or SessionLocal()
    _should_close = db is None

    try:
        publisher = BilibiliPublisher(_db)
        return publisher.publish_reply(
            comment_id=comment_id,
            reply_text=reply_text,
            video_bvid=video_bvid,
            oid=oid,
            trace_id=trace_id,
        )
    finally:
        if _should_close:
            _db.close()


class BilibiliPublisherAdapter:
    """适配器类，用于集成到现有 Publisher 流程"""

    def __init__(self, db: Session):
        self.db = db
        self._publisher: BilibiliPublisher | None = None

    @property
    def publisher(self) -> BilibiliPublisher:
        if self._publisher is None:
            self._publisher = BilibiliPublisher(self.db)
        return self._publisher

    def publish(
        self,
        comment_id: str,
        reply_text: str,
        force_publish: bool = False,
        trace_id: str | None = None,
        **kwargs: Any,
    ) -> tuple[bool, str, datetime | None]:
        video_bvid = kwargs.get("video_bvid")
        oid = kwargs.get("oid")

        if not self.publisher.is_enabled():
            return False, "disabled", None

        if force_publish:
            # 强幂等要求：不允许通过 force_publish 绕过 reserve-first；需要真正强制发布应走 gateway
            return False, "force_publish_ignored", None

        success, reason, published_at, _ = self.publisher.publish_reply(
            comment_id=comment_id,
            reply_text=reply_text,
            video_bvid=video_bvid,
            oid=oid,
            trace_id=trace_id,
        )

        return success, reason, published_at

    def publish_with_result(
        self,
        comment_id: str,
        reply_text: str,
        *,
        force_publish: bool = False,
        trace_id: str | None = None,
        **kwargs: Any,
    ) -> tuple[bool, str, datetime | None, dict[str, object]]:
        video_bvid = kwargs.get("video_bvid")
        oid = kwargs.get("oid")

        if not self.publisher.is_enabled():
            return False, "disabled", None, {}

        if force_publish:
            return False, "force_publish_ignored", None, {}

        success, reason, published_at, new_rpid = self.publisher.publish_reply(
            comment_id=comment_id,
            reply_text=reply_text,
            video_bvid=video_bvid,
            oid=oid,
            trace_id=trace_id,
        )

        result: dict[str, object] = {}
        if new_rpid is not None:
            result["new_rpid"] = int(new_rpid)

        return success, reason, published_at, result
