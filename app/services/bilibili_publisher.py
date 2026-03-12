"""
Bilibili Publisher Service

实现真实发布回复到 B站评论的功能。
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import BilibiliVideo, PublishLog
from app.services.bilibili_client import BilibiliClient
from app.services.hashing import reply_hash
from app.settings import settings

logger = logging.getLogger(__name__)


class BilibiliPublisher:
    """B站真实发布服务"""

    def __init__(self, db: Session):
        self.db = db
        self._client: BilibiliClient | None = None

    @property
    def client(self) -> BilibiliClient:
        if self._client is None:
            self._client = BilibiliClient(self.db)
        return self._client

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

        # 检查凭证
        credential = self.client.get_credential()
        if not credential:
            logger.error("bilibili_publish_no_credential")
            return False, "no_credential", None, None

        # 检查凭证是否即将过期
        is_expiring, remaining_days = self.client.check_credential_expiration()
        if is_expiring:
            logger.warning(
                f"bilibili_credential_expiring | remaining_days={remaining_days}"
            )

        # 获取 oid
        if oid is None:
            if video_bvid:
                # 从数据库获取
                video = (
                    self.db.query(BilibiliVideo)
                    .filter(BilibiliVideo.bvid == video_bvid)
                    .first()
                )
                if video and video.aid:
                    oid = video.aid
                else:
                    # 通过 API 获取
                    oid = self.client.get_video_aid(video_bvid)
                    if oid is None:
                        logger.error(f"bilibili_publish_no_oid | bvid={video_bvid}")
                        return False, "video_not_found", None, None
            else:
                logger.error("bilibili_publish_no_video_info")
                return False, "no_video_info", None, None

        try:
            # 调用 API 发布回复
            success, reason, new_rpid = self.client.reply_comment(
                oid=oid,
                rpid=int(comment_id),
                message=reply_text,
            )

            if success:
                published_at = datetime.now(timezone.utc)

                # 记录发布日志
                hashed = reply_hash(comment_id, reply_text)
                log = PublishLog(
                    comment_id=comment_id,
                    reply_hash=hashed,
                    source="bilibili-api",
                )
                self.db.add(log)
                self.db.commit()

                logger.info(
                    f"bilibili_publish_success | comment_id={comment_id} "
                    f"oid={oid} new_rpid={new_rpid} trace_id={trace_id}"
                )

                return True, "published", published_at, new_rpid
            else:
                logger.error(
                    f"bilibili_publish_failed | comment_id={comment_id} "
                    f"oid={oid} reason={reason} trace_id={trace_id}"
                )
                return False, reason, None, None

        except Exception as e:
            error_msg = str(e)
            logger.error(
                f"bilibili_publish_error | comment_id={comment_id} "
                f"oid={oid} error={error_msg} trace_id={trace_id}"
            )
            return False, error_msg, None, None

    def check_duplicate(
        self,
        comment_id: str,
        reply_text: str,
    ) -> bool:
        """检查是否已经发布过相同的回复"""
        hashed = reply_hash(comment_id, reply_text)
        existing = (
            self.db.query(PublishLog)
            .filter(
                PublishLog.comment_id == comment_id,
                PublishLog.reply_hash == hashed,
            )
            .first()
        )
        return existing is not None


def publish_bilibili_reply(
    comment_id: str,
    reply_text: str,
    video_bvid: str | None = None,
    oid: int | None = None,
    trace_id: str | None = None,
    db: Session | None = None,
) -> tuple[bool, str, datetime | None, int | None]:
    """发布回复到 B站（便捷函数）

    Args:
        comment_id: 要回复的评论 ID
        reply_text: 回复内容
        video_bvid: 视频 BV 号
        oid: 视频 aid
        trace_id: 追踪 ID
        db: 数据库会话（可选）

    Returns:
        tuple: (是否成功, 原因, 发布时间, 新评论 ID)
    """
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
        """发布接口，兼容现有 Publisher 协议"""
        video_bvid = kwargs.get("video_bvid")
        oid = kwargs.get("oid")

        if not self.publisher.is_enabled():
            return False, "disabled", None

        # 检查重复
        if not force_publish and self.publisher.check_duplicate(comment_id, reply_text):
            return False, "duplicate", None

        success, reason, published_at, _ = self.publisher.publish_reply(
            comment_id=comment_id,
            reply_text=reply_text,
            video_bvid=video_bvid,
            oid=oid,
            trace_id=trace_id,
        )

        return success, reason, published_at
