from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, Integer, JSON, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        UniqueConstraint("canonical_comment_id", name="uq_comments_canonical_comment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, default="bilibili", index=True)
    canonical_comment_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)

    comment_id: Mapped[str] = mapped_column(String(64), nullable=False)
    video_id: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class ReplyJob(Base):
    __tablename__ = "reply_jobs"
    __table_args__ = (
        Index("ix_reply_jobs_status_created_at_id", "status", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    comment_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    length_mode: Mapped[str] = mapped_column(String(16), default="medium")
    style_mode: Mapped[str] = mapped_column(String(32), default="doro")
    reply_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_flags: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class UserState(Base):
    __tablename__ = "user_state"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    recent_phrases: Mapped[dict] = mapped_column(JSON, default=dict)
    cooldown_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PublishLog(Base):
    __tablename__ = "publish_logs"
    __table_args__ = (
        UniqueConstraint("canonical_comment_id", "reply_hash", name="uq_publish_logs_canonical_reply"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, default="bilibili", index=True)
    canonical_comment_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    comment_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    reply_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="bili-pet-bot")
    status: Mapped[str] = mapped_column(String(16), default="published")
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class OperationAuditLog(Base):
    __tablename__ = "operation_audit_logs"
    __table_args__ = (
        Index("ix_operation_audit_logs_action_ok_created_at_id", "action", "ok", "created_at", "id"),
        Index("ix_operation_audit_logs_target_id_created_at_id", "target_id", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(32), default="reply_job")
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    ok: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class ObservabilityEvent(Base):
    __tablename__ = "observability_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    comment_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    job_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class KnowledgeEntry(Base):
    __tablename__ = "knowledge_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        index=True,
    )


class RoleCard(Base):
    __tablename__ = "role_cards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tone: Mapped[dict] = mapped_column(JSON, default=dict)
    constraints: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )


class BilibiliCredential(Base):
    """B站 API 凭证存储"""
    __tablename__ = "bilibili_credentials"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sessdata: Mapped[str] = mapped_column(Text, nullable=False)  # 加密存储
    bili_jct: Mapped[str] = mapped_column(String(128), nullable=False)  # 加密存储
    buvid3: Mapped[str] = mapped_column(String(128), nullable=False)
    buvid4: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )


class BilibiliVideo(Base):
    """B站视频监控配置"""
    __tablename__ = "bilibili_videos"
    __table_args__ = (
        UniqueConstraint("bvid", name="uq_bilibili_videos_bvid"),
        Index("ix_bilibili_videos_poll_enabled_last_polled", "poll_enabled", "last_polled_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bvid: Mapped[str] = mapped_column(String(20), nullable=False)
    aid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    owner_mid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    poll_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    last_rpid: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
