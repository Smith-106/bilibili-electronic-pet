from typing import Literal

from pydantic import BaseModel, Field


CollectorSource = Literal["webhook", "poller", "official", "bilibili", "douyin", "kuaishou"]
PlatformName = Literal["bilibili", "douyin", "kuaishou"]

LengthMode = Literal["short", "medium", "long"]
StyleMode = Literal["empathy", "meme", "normal"]
StyleProfile = Literal["auto", "empathy", "meme", "normal"]
RoleProfile = Literal["auto", "default", "comfort", "playful"]


class CommentEvent(BaseModel):
    comment_id: str = Field(min_length=1, max_length=64)
    video_id: str = Field(min_length=1, max_length=64)
    user_id: str = Field(min_length=1, max_length=64)
    content: str = Field(min_length=1)
    parent_id: str | None = None
    platform: PlatformName | None = None
    trace_id: str | None = Field(default=None, min_length=1, max_length=64)
    force_long: bool = False
    style_profile: StyleProfile = "auto"
    role_profile: RoleProfile = "auto"
    role_card_key: str | None = Field(default=None, min_length=1, max_length=64)


class RetryJobRequest(BaseModel):
    force_long: bool = False
    style_profile: StyleProfile = "auto"
    role_profile: RoleProfile = "auto"
    role_card_key: str | None = Field(default=None, min_length=1, max_length=64)


class ApproveJobRequest(BaseModel):
    override_reply_text: str | None = None


class BatchApproveJobsRequest(BaseModel):
    job_ids: list[int] = Field(min_length=1, max_length=100)


class BatchRetryJobsRequest(BaseModel):
    job_ids: list[int] = Field(min_length=1, max_length=100)
    force_long: bool = False


class PublishWebhookRequest(BaseModel):
    comment_id: str = Field(min_length=1, max_length=64)
    reply_text: str = Field(min_length=1)
    force_publish: bool = False
    source: str = Field(default="bili-pet-bot")
    trace_id: str | None = Field(default=None, min_length=1, max_length=64)
