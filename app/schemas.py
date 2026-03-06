from typing import Literal

from pydantic import BaseModel, Field


CollectorSource = Literal["webhook", "poller", "official"]

LengthMode = Literal["short", "medium", "long"]
StyleMode = Literal["empathy", "meme", "normal"]


class CommentEvent(BaseModel):
    comment_id: str = Field(min_length=1, max_length=64)
    video_id: str = Field(min_length=1, max_length=64)
    user_id: str = Field(min_length=1, max_length=64)
    content: str = Field(min_length=1)
    parent_id: str | None = None
    trace_id: str | None = Field(default=None, min_length=1, max_length=64)
    force_long: bool = False


class RetryJobRequest(BaseModel):
    force_long: bool = False


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
