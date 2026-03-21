"""
Bilibili API Client Wrapper

封装 bilibili-api 库，提供：
- 认证管理
- 评论获取和回复
- 视频信息获取
- 用户信息获取
- 频率限制
"""

import asyncio
import base64
import hashlib
import logging
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, TYPE_CHECKING

from sqlalchemy.orm import Session

from app.models.entities import BilibiliCredential, BilibiliVideo
from app.settings import settings

logger = logging.getLogger(__name__)

# 延迟导入 bilibili_api，避免未安装时报错
try:
    from bilibili_api import Credential, video, comment, user, sync
    BILIBILI_API_AVAILABLE = True
except ImportError:
    BILIBILI_API_AVAILABLE = False
    Credential = None
    video = None
    comment = None
    user = None
    sync = None

# 类型检查时使用的类型别名
if TYPE_CHECKING:
    from bilibili_api import Credential as CredentialType
else:
    CredentialType = Any


@dataclass
class BilibiliComment:
    """B站评论数据结构"""
    rpid: int
    oid: int
    mid: int
    content: str
    parent_rpid: int | None
    ctime: int
    like_count: int
    member_name: str
    member_avatar: str


@dataclass
class BilibiliVideoInfo:
    """B站视频信息数据结构"""
    bvid: str
    aid: int
    title: str
    description: str
    owner_mid: int
    owner_name: str
    view_count: int
    like_count: int
    comment_count: int
    pubdate: int


class RateLimiter:
    """简单的频率限制器"""

    def __init__(self, max_calls: int, period_seconds: int = 60):
        self.max_calls = max_calls
        self.period_seconds = period_seconds
        # This limiter runs before every Bilibili API call, so expired entries
        # need O(1) eviction instead of rebuilding the full list each time.
        self.calls: deque[float] = deque()

    def _prune_expired_calls(self, now: float) -> None:
        while self.calls and now - self.calls[0] >= self.period_seconds:
            self.calls.popleft()

    def acquire(self) -> bool:
        """尝试获取调用许可"""
        now = time.time()
        self._prune_expired_calls(now)

        if len(self.calls) >= self.max_calls:
            return False

        self.calls.append(now)
        return True

    def wait_time(self) -> float:
        """计算需要等待的时间"""
        now = time.time()
        self._prune_expired_calls(now)
        if not self.calls:
            return 0.0

        wait = self.period_seconds - (now - self.calls[0])
        return max(0.0, wait)


class CredentialEncryptionError(Exception):
    """Raised when credential encryption prerequisites are not met."""
    pass


class CredentialEncryption:
    """凭证加密工具 - 使用 Fernet 对称加密

    生产环境强制使用 cryptography 库进行安全加密。
    当加密前置条件不满足时立即失败，不回退到弱加密方案。
    """

    def __init__(self, key: str):
        if not key:
            raise CredentialEncryptionError(
                "BILIBILI_COOKIE_ENCRYPTION_KEY is required for credential encryption. "
                "Set the environment variable or settings.bilibili_cookie_encryption_key."
            )
        self._key = key
        self._fernet: Any = None

    def _get_fernet(self) -> Any:
        """获取 Fernet 实例，延迟初始化"""
        if self._fernet is not None:
            return self._fernet

        try:
            from cryptography.fernet import Fernet
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

            # 使用 PBKDF2 派生密钥
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'bilibili_credential_v1',  # 固定盐值，可配置化
                iterations=480000,
            )
            key_bytes = base64.urlsafe_b64encode(kdf.derive(self._key.encode()))
            self._fernet = Fernet(key_bytes)
            return self._fernet
        except ImportError as e:
            raise CredentialEncryptionError(
                "cryptography library is required for secure credential encryption. "
                "Install with: pip install cryptography"
            ) from e

    def encrypt(self, plaintext: str) -> str:
        """加密敏感数据

        Raises:
            CredentialEncryptionError: 当加密前置条件不满足时
        """
        if not plaintext:
            return ""

        fernet = self._get_fernet()
        encrypted = fernet.encrypt(plaintext.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, ciphertext: str) -> str:
        """解密敏感数据

        Raises:
            CredentialEncryptionError: 当解密失败时
        """
        if not ciphertext:
            return ""

        fernet = self._get_fernet()
        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode())
            decrypted = fernet.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            raise CredentialEncryptionError(
                f"Failed to decrypt credential data. The data may be corrupted or "
                f"encrypted with a different key: {e}"
            ) from e


class BilibiliClient:
    """B站 API 客户端"""

    def __init__(self, db: Session, credential_id: int | None = None):
        self.db = db
        self.credential_id = credential_id or settings.bilibili_credential_id
        self._credential: Any = None
        self._credential_entity: BilibiliCredential | None = None
        self._rate_limiter = RateLimiter(settings.bilibili_rate_limit_per_minute)
        self._encryption = CredentialEncryption(settings.bilibili_cookie_encryption_key)

    def _check_api_available(self) -> None:
        """检查 bilibili_api 是否可用"""
        if not BILIBILI_API_AVAILABLE:
            raise RuntimeError(
                "bilibili-api-python 未安装，请运行: pip install bilibili-api-python"
            )

    def _load_credential_from_db(self) -> BilibiliCredential | None:
        """从数据库加载凭证"""
        return (
            self.db.query(BilibiliCredential)
            .filter(BilibiliCredential.id == self.credential_id, BilibiliCredential.is_active.is_(True))
            .first()
        )

    def _load_credential_from_settings(self) -> Any:
        """从配置文件加载凭证"""
        if not BILIBILI_API_AVAILABLE:
            return None

        sessdata = settings.bilibili_sessdata
        bili_jct = settings.bilibili_bili_jct
        buvid3 = settings.bilibili_buvid3

        if not all([sessdata, bili_jct, buvid3]):
            return None

        return Credential(
            sessdata=sessdata,
            bili_jct=bili_jct,
            buvid3=buvid3,
            buvid4=settings.bilibili_buvid4 or None,
        )

    def get_credential(self) -> Any:
        """获取凭证对象"""
        self._check_api_available()

        # 优先从数据库加载
        entity = self._load_credential_from_db()
        if entity:
            self._credential_entity = entity
            # 解密凭证
            sessdata = self._encryption.decrypt(entity.sessdata)
            bili_jct = self._encryption.decrypt(entity.bili_jct)

            self._credential = Credential(
                sessdata=sessdata,
                bili_jct=bili_jct,
                buvid3=entity.buvid3,
                buvid4=entity.buvid4,
            )
            return self._credential

        # 回退到配置文件
        self._credential = self._load_credential_from_settings()
        return self._credential

    def update_last_used(self) -> None:
        """更新最后使用时间"""
        if self._credential_entity:
            self._credential_entity.last_used_at = datetime.now(timezone.utc)
            self.db.commit()

    def check_credential_expiration(self) -> tuple[bool, int]:
        """检查凭证是否即将过期

        Returns:
            tuple: (是否即将过期, 剩余天数)
        """
        if not self._credential_entity or not self._credential_entity.expires_at:
            return False, -1  # 未设置过期时间

        now = datetime.now(timezone.utc)
        expires_at = self._credential_entity.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        remaining = expires_at - now
        remaining_days = remaining.days

        # 少于7天视为即将过期
        return remaining_days < 7, max(0, remaining_days)

    def _wait_for_rate_limit(self) -> None:
        """等待频率限制"""
        if not self._rate_limiter.acquire():
            wait_time = self._rate_limiter.wait_time()
            if wait_time > 0:
                logger.info(f"bilibili_rate_limit_wait | wait_seconds={wait_time:.2f}")
                time.sleep(wait_time)
                self._rate_limiter.acquire()

    # ==================== 视频相关 API ====================

    def get_video_info(self, bvid: str) -> BilibiliVideoInfo | None:
        """获取视频信息"""
        self._check_api_available()
        self._wait_for_rate_limit()

        try:
            v = video.Video(bvid=bvid)

            async def _fetch():
                return await v.get_info()

            info = sync(_fetch())

            return BilibiliVideoInfo(
                bvid=info.get("bvid", bvid),
                aid=info.get("aid", 0),
                title=info.get("title", ""),
                description=info.get("desc", ""),
                owner_mid=info.get("owner", {}).get("mid", 0),
                owner_name=info.get("owner", {}).get("name", ""),
                view_count=info.get("stat", {}).get("view", 0),
                like_count=info.get("stat", {}).get("like", 0),
                comment_count=info.get("stat", {}).get("reply", 0),
                pubdate=info.get("pubdate", 0),
            )
        except Exception as e:
            logger.error(f"bilibili_get_video_info_error | bvid={bvid} error={e}")
            return None

    def get_video_aid(self, bvid: str) -> int | None:
        """通过 BV 号获取 AV 号"""
        self._check_api_available()
        try:
            from bilibili_api import bvid2aid
            return bvid2aid(bvid)
        except Exception as e:
            logger.error(f"bilibili_bvid2aid_error | bvid={bvid} error={e}")
            # 尝试通过 API 获取
            info = self.get_video_info(bvid)
            return info.aid if info else None

    # ==================== 评论相关 API ====================

    def get_comments(self, oid: int, page: int = 1, sort: int = 0, *, strict: bool = False) -> list[BilibiliComment]:
        """获取视频评论

        Args:
            oid: 视频的 aid
            page: 页码
            sort: 排序方式 (0: 按时间, 1: 按热度)
            strict: 为 True 时，异常会直接抛出（用于 poller 重试）；为 False 时返回空列表（兼容旧行为）
        """
        self._check_api_available()
        self._wait_for_rate_limit()

        try:

            async def _fetch():
                return await comment.get_comments(
                    oid=oid,
                    type_=comment.CommentResourceType.VIDEO,
                    page_index=page,
                    order=comment.OrderType.TIME if sort == 0 else comment.OrderType.LIKE,
                )

            data = sync(_fetch())

            comments = []
            for item in data.get("replies", []) or []:
                comments.append(BilibiliComment(
                    rpid=item.get("rpid", 0),
                    oid=oid,
                    mid=item.get("member", {}).get("mid", 0),
                    content=item.get("content", {}).get("message", ""),
                    parent_rpid=item.get("parent", 0) or None,
                    ctime=item.get("ctime", 0),
                    like_count=item.get("like", 0),
                    member_name=item.get("member", {}).get("uname", ""),
                    member_avatar=item.get("member", {}).get("avatar", ""),
                ))

            return comments
        except Exception as e:
            logger.error(f"bilibili_get_comments_error | oid={oid} page={page} error={e}")
            if strict:
                raise
            return []

    def get_sub_comments(self, oid: int, root_rpid: int, page: int = 1, *, strict: bool = False) -> list[BilibiliComment]:
        """获取子评论（回复）

        Args:
            oid: 视频的 aid
            root_rpid: 根评论 ID
            page: 页码
            strict: 为 True 时，异常会直接抛出；为 False 时返回空列表
        """
        self._check_api_available()
        self._wait_for_rate_limit()

        try:

            async def _fetch():
                return await comment.get_comments(
                    oid=oid,
                    type_=comment.CommentResourceType.VIDEO,
                    root=root_rpid,
                    page_index=page,
                )

            data = sync(_fetch())

            comments = []
            for item in data.get("replies", []) or []:
                comments.append(BilibiliComment(
                    rpid=item.get("rpid", 0),
                    oid=oid,
                    mid=item.get("member", {}).get("mid", 0),
                    content=item.get("content", {}).get("message", ""),
                    parent_rpid=item.get("parent", 0) or root_rpid,
                    ctime=item.get("ctime", 0),
                    like_count=item.get("like", 0),
                    member_name=item.get("member", {}).get("uname", ""),
                    member_avatar=item.get("member", {}).get("avatar", ""),
                ))

            return comments
        except Exception as e:
            logger.error(f"bilibili_get_sub_comments_error | oid={oid} root={root_rpid} error={e}")
            if strict:
                raise
            return []

    def reply_comment(self, oid: int, rpid: int, message: str) -> tuple[bool, str, int | None]:
        """回复评论

        Args:
            oid: 视频的 aid
            rpid: 要回复的评论 ID
            message: 回复内容

        Returns:
            tuple: (是否成功, 原因, 新评论 ID)
        """
        self._check_api_available()

        credential = self.get_credential()
        if not credential:
            logger.error("bilibili_reply_no_credential")
            return False, "no_credential", None

        self._wait_for_rate_limit()

        try:

            async def _reply():
                return await comment.reply(
                    oid=oid,
                    type_=comment.CommentResourceType.VIDEO,
                    rpid=rpid,
                    message=message,
                    credential=credential,
                )

            result = sync(_reply())
            self.update_last_used()

            new_rpid = result.get("rpid", 0) if result else None
            logger.info(f"bilibili_reply_success | oid={oid} rpid={rpid} new_rpid={new_rpid}")
            return True, "success", new_rpid

        except Exception as e:
            error_msg = str(e)
            logger.error(f"bilibili_reply_error | oid={oid} rpid={rpid} error={error_msg}")
            return False, error_msg, None

    # ==================== 用户相关 API ====================

    def get_user_info(self, mid: int) -> dict[str, Any] | None:
        """获取用户信息"""
        self._check_api_available()
        self._wait_for_rate_limit()

        try:
            u = user.User(uid=mid, credential=self.get_credential())

            async def _fetch():
                return await u.get_user_info()

            return sync(_fetch())
        except Exception as e:
            logger.error(f"bilibili_get_user_info_error | mid={mid} error={e}")
            return None

    # ==================== 收到的回复通知 ====================

    def get_received_replies(self, page: int = 1, *, strict: bool = False) -> list[dict[str, Any]]:
        """获取收到的回复通知"""
        self._check_api_available()

        credential = self.get_credential()
        if not credential:
            logger.error("bilibili_get_replies_no_credential")
            return []

        self._wait_for_rate_limit()

        try:
            from bilibili_api import session as bilibili_session

            async def _fetch():
                return await bilibili_session.get_replies(credential=credential)

            data = sync(_fetch())
            self.update_last_used()
            return data.get("items", []) if data else []
        except Exception as e:
            logger.error(f"bilibili_get_received_replies_error | error={e}")
            if strict:
                raise
            return []

    # ==================== 视频管理 ====================

    def sync_video_info(self, bvid: str, poll_enabled: bool = False) -> BilibiliVideo | None:
        """同步视频信息到数据库"""
        info = self.get_video_info(bvid)
        if not info:
            return None

        video = (
            self.db.query(BilibiliVideo)
            .filter(BilibiliVideo.bvid == bvid)
            .first()
        )

        if video:
            video.aid = info.aid
            video.title = info.title
            video.owner_mid = info.owner_mid
            video.poll_enabled = poll_enabled
        else:
            video = BilibiliVideo(
                bvid=bvid,
                aid=info.aid,
                title=info.title,
                owner_mid=info.owner_mid,
                poll_enabled=poll_enabled,
                last_rpid=0,
            )
            self.db.add(video)

        self.db.commit()
        return video

    def get_enabled_videos(self) -> list[BilibiliVideo]:
        """获取所有启用轮询的视频"""
        return (
            self.db.query(BilibiliVideo)
            .filter(BilibiliVideo.poll_enabled.is_(True))
            .all()
        )

    def update_video_last_polled(self, video: BilibiliVideo, last_rpid: int) -> None:
        """更新视频最后轮询信息"""
        video.last_polled_at = datetime.now(timezone.utc)
        video.last_rpid = last_rpid
        self.db.commit()
