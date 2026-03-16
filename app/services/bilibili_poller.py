"""
Bilibili Comment Poller Service

主动轮询指定视频的评论，并注入到现有的评论处理流程中。
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.entities import BilibiliVideo, Comment
from app.services.bilibili_client import BilibiliClient, BilibiliComment
from app.schemas import CommentEvent
from app.services.collector import collect_comment_event
from app.settings import settings

logger = logging.getLogger(__name__)

# 重试配置
MAX_RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 5


class BilibiliPoller:
    """B站评论轮询服务"""

    def __init__(self, db: Session):
        self.db = db
        self._client: BilibiliClient | None = None

    @property
    def client(self) -> BilibiliClient:
        if self._client is None:
            self._client = BilibiliClient(self.db)
        return self._client

    def is_enabled(self) -> bool:
        """检查轮询功能是否启用"""
        return settings.bilibili_enabled and settings.bilibili_poll_enabled

    def poll_video_comments(
        self,
        video: BilibiliVideo,
        max_pages: int = 5,
        only_new: bool = True,
        retry_attempts: int = MAX_RETRY_ATTEMPTS,
    ) -> list[CommentEvent]:
        """轮询单个视频的评论

        Args:
            video: 视频记录
            max_pages: 最大页数
            only_new: 是否只获取新评论
            retry_attempts: 重试次数

        Returns:
            新评论事件列表
        """
        if not video.aid:
            # 如果没有 aid，尝试获取
            aid = self.client.get_video_aid(video.bvid)
            if aid:
                video.aid = aid
                self.db.commit()
            else:
                logger.warning(f"bilibili_poll_no_aid | bvid={video.bvid}")
                return []

        last_rpid = video.last_rpid if only_new else 0
        all_comments: list[BilibiliComment] = []
        has_more = True
        page = 1

        while has_more and page <= max_pages:
            # 带重试的评论获取
            comments = self._get_comments_with_retry(video.aid, page, retry_attempts)
            if comments is None:
                # 重试耗尽，跳过此页
                break

            if not comments:
                has_more = False
                break

            # 如果只要新评论，检查是否已达到上次最后评论
            if only_new and last_rpid > 0:
                new_comments = [c for c in comments if c.rpid > last_rpid]
                if new_comments:
                    all_comments.extend(new_comments)
                else:
                    # 已经到达旧评论
                    has_more = False
                    break

                # 检查是否有比 last_rpid 更早的评论
                if any(c.rpid <= last_rpid for c in comments):
                    has_more = False
            else:
                all_comments.extend(comments)

            page += 1

        # 更新最后轮询时间和 rpid
        if all_comments:
            max_rpid = max(c.rpid for c in all_comments)
            self.client.update_video_last_polled(video, max_rpid)

        # 转换为 CommentEvent
        events = []
        for c in all_comments:
            event = self._to_comment_event(c, video.bvid)
            if event:
                events.append(event)

        logger.info(
            f"bilibili_poll_complete | bvid={video.bvid} "
            f"total_comments={len(all_comments)} new_events={len(events)}"
        )

        return events

    def _get_comments_with_retry(
        self, oid: int, page: int, max_attempts: int
    ) -> list[BilibiliComment] | None:
        """带重试的评论获取

        Args:
            oid: 视频 aid
            page: 页码
            max_attempts: 最大重试次数

        Returns:
            评论列表，如果重试耗尽返回 None
        """
        last_error: Exception | None = None

        for attempt in range(max_attempts):
            try:
                return self.client.get_comments(oid, page=page)
            except Exception as e:
                last_error = e
                logger.warning(
                    f"bilibili_poll_retry | oid={oid} page={page} "
                    f"attempt={attempt + 1}/{max_attempts} error={e}"
                )
                if attempt < max_attempts - 1:
                    time.sleep(RETRY_DELAY_SECONDS)

        logger.error(
            f"bilibili_poll_retry_exhausted | oid={oid} page={page} "
            f"attempts={max_attempts} error={last_error}"
        )
        return None

    def _to_comment_event(self, comment: BilibiliComment, bvid: str) -> CommentEvent | None:
        """将 B站评论转换为 CommentEvent"""
        try:
            return CommentEvent(
                comment_id=str(comment.rpid),
                video_id=bvid,
                user_id=str(comment.mid),
                content=comment.content,
                parent_id=str(comment.parent_rpid) if comment.parent_rpid else None,
                trace_id=f"bilibili_poll_{comment.rpid}",
            )
        except Exception as e:
            logger.error(f"bilibili_poll_event_error | rpid={comment.rpid} error={e}")
            return None

    def poll_all_videos(self) -> dict[str, Any]:
        """轮询所有启用的视频

        Returns:
            轮询统计信息
        """
        if not self.is_enabled():
            logger.info("bilibili_poll_disabled")
            return {"status": "disabled", "videos": 0, "comments": 0}

        videos = self.client.get_enabled_videos()

        if not videos:
            logger.info("bilibili_poll_no_videos")
            return {"status": "no_videos", "videos": 0, "comments": 0}

        total_comments = 0
        total_events = 0
        results = []

        for video in videos:
            try:
                events = self.poll_video_comments(video)
                total_comments += len(events)

                # 注入到现有的评论处理流程
                for event in events:
                    self._inject_comment(event)
                    total_events += 1

                results.append({
                    "bvid": video.bvid,
                    "comments": len(events),
                    "status": "success",
                })
            except Exception as e:
                logger.error(f"bilibili_poll_video_error | bvid={video.bvid} error={e}")
                results.append({
                    "bvid": video.bvid,
                    "comments": 0,
                    "status": "error",
                    "error": str(e),
                })

        return {
            "status": "completed",
            "videos": len(videos),
            "comments": total_comments,
            "events_injected": total_events,
            "details": results,
        }

    def _inject_comment(self, event: CommentEvent) -> bool:
        """将评论注入到处理流程

        1. 检查是否已存在
        2. 存入数据库
        3. 触发处理任务
        """
        platform = str(getattr(event, "platform", None) or "bilibili").strip().lower() or "bilibili"
        canonical_comment_id = f"{platform}:{event.comment_id}"

        # 存入数据库（insert-first），并发重复时由唯一约束兜底
        comment = Comment(
            platform=platform,
            canonical_comment_id=canonical_comment_id,
            comment_id=event.comment_id,
            video_id=event.video_id,
            user_id=event.user_id,
            content=event.content,
            parent_id=event.parent_id,
        )
        self.db.add(comment)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            logger.debug(f"bilibili_poll_comment_exists | comment_id={event.comment_id}")
            return False

        # 触发处理任务
        from app.workers.jobs import enqueue_comment_event

        enqueue_comment_event(event.model_copy(update={"platform": platform}))

        logger.info(
            f"bilibili_poll_comment_injected | comment_id={event.comment_id} "
            f"video_id={event.video_id} user_id={event.user_id}"
        )

        return True

    def add_video_to_poll(self, bvid: str, sync_info: bool = True) -> BilibiliVideo | None:
        """添加视频到轮询列表

        Args:
            bvid: 视频 BV 号
            sync_info: 是否同步视频信息

        Returns:
            视频记录
        """
        # 检查是否已存在
        existing = (
            self.db.query(BilibiliVideo)
            .filter(BilibiliVideo.bvid == bvid)
            .first()
        )

        if existing:
            # 更新为启用状态
            existing.poll_enabled = True
            self.db.commit()
            return existing

        if sync_info:
            return self.client.sync_video_info(bvid, poll_enabled=True)
        else:
            video = BilibiliVideo(bvid=bvid, poll_enabled=True, last_rpid=0)
            self.db.add(video)
            self.db.commit()
            return video

    def remove_video_from_poll(self, bvid: str) -> bool:
        """从轮询列表移除视频"""
        video = (
            self.db.query(BilibiliVideo)
            .filter(BilibiliVideo.bvid == bvid)
            .first()
        )

        if video:
            video.poll_enabled = False
            self.db.commit()
            return True

        return False

    def get_poll_status(self) -> dict[str, Any]:
        """获取轮询状态"""
        videos = self.client.get_enabled_videos()

        return {
            "enabled": self.is_enabled(),
            "poll_interval_seconds": settings.bilibili_poll_interval_seconds,
            "rate_limit_per_minute": settings.bilibili_rate_limit_per_minute,
            "videos": [
                {
                    "bvid": v.bvid,
                    "aid": v.aid,
                    "title": v.title,
                    "poll_enabled": v.poll_enabled,
                    "last_polled_at": v.last_polled_at.isoformat() if v.last_polled_at else None,
                    "last_rpid": v.last_rpid,
                }
                for v in videos
            ],
        }


def poll_bilibili_comments_task() -> dict[str, Any]:
    """Celery 任务入口：轮询 B站评论"""
    db = SessionLocal()
    try:
        poller = BilibiliPoller(db)
        return poller.poll_all_videos()
    except Exception as e:
        logger.error(f"bilibili_poll_task_error | error={e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
