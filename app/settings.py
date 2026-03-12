import logging
from typing import ClassVar

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    _allowed_app_envs: ClassVar[set[str]] = {"development", "test", "staging", "production"}
    _allowed_publisher_modes: ClassVar[set[str]] = {"manual_queue", "simulated", "webhook", "real_publish"}
    _allowed_safety_pii_actions: ClassVar[set[str]] = {"manual_queue", "blocked"}
    _allowed_search_providers: ClassVar[set[str]] = {"mock", "disabled", "pipeline_v1"}
    _allowed_style_profiles: ClassVar[set[str]] = {"auto", "empathy", "meme", "normal"}
    _allowed_role_profiles: ClassVar[set[str]] = {"auto", "default", "comfort", "playful"}

    app_env: str = "development"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/bili_pet"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    kill_switch: bool = False

    llm_provider: str = "mock"
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_timeout_seconds: int = 30
    llm_retry_attempts: int = 2
    llm_retry_wait_seconds: int = 1
    llm_fallback_to_mock: bool = True
    worker_max_retries: int = 3
    worker_retry_backoff: int = 2
    worker_retry_jitter: bool = True

    publisher_mode: str = "manual_queue"
    publisher_webhook_url: str = ""
    publisher_webhook_token: str = ""
    publisher_real_publish_url: str = ""
    publisher_real_publish_token: str = ""
    publisher_timeout_seconds: int = 15
    publisher_hmac_secret: str = ""
    publisher_circuit_breaker_enabled: bool = True
    publisher_circuit_failure_threshold: int = 3
    publisher_circuit_open_seconds: int = 30

    gateway_token: str = ""
    gateway_hmac_secret: str = ""
    api_key: str = ""
    safety_enable_keyword_blocklist: bool = True
    safety_keyword_blacklist: list[str] = Field(default_factory=lambda: ["政治", "仇恨", "身份证", "手机号", "去死"])
    safety_enable_pii_detection: bool = True
    safety_pii_patterns: dict[str, str] = Field(
        default_factory=lambda: {
            "cn_phone": r"(?<!\d)1[3-9]\d{9}(?!\d)",
            "cn_id_card": r"(?<!\d)[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)",
            "email": r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        }
    )
    safety_pii_action: str = "manual_queue"
    safety_max_reply_chars: int = 900

    knowledge_enabled: bool = True
    knowledge_max_hits: int = 3

    search_enabled: bool = True
    search_provider: str = "mock"
    search_api_url: str = ""
    search_api_key: str = ""
    search_timeout_seconds: int = 5
    search_max_hits: int = 3
    search_allowed_domains: list[str] = Field(default_factory=list)

    style_profile_default: str = "auto"
    role_profile_default: str = "auto"

    platform_bilibili_enabled: bool = True
    platform_douyin_enabled: bool = False
    platform_kuaishou_enabled: bool = False
    platform_bilibili_publish_source: str = "bilibili-bot"
    platform_douyin_publish_source: str = "douyin-bot"
    platform_kuaishou_publish_source: str = "kuaishou-bot"

    # Bilibili API Integration
    bilibili_enabled: bool = False
    bilibili_poll_enabled: bool = False
    bilibili_poll_interval_seconds: int = 300
    bilibili_publish_enabled: bool = False
    bilibili_credential_id: int = 1
    bilibili_rate_limit_per_minute: int = 30
    bilibili_sessdata: str = ""
    bilibili_bili_jct: str = ""
    bilibili_buvid3: str = ""
    bilibili_buvid4: str = ""
    bilibili_cookie_encryption_key: str = ""

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        normalized = {"dev": "development", "testing": "test", "prod": "production"}.get(normalized, normalized)
        if normalized not in cls._allowed_app_envs:
            allowed = ", ".join(sorted(cls._allowed_app_envs))
            raise ValueError(f"APP_ENV must be one of: {allowed}")
        return normalized

    @field_validator("publisher_mode")
    @classmethod
    def validate_publisher_mode(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in cls._allowed_publisher_modes:
            allowed = ", ".join(sorted(cls._allowed_publisher_modes))
            raise ValueError(f"PUBLISHER_MODE must be one of: {allowed}")
        return normalized

    @field_validator("safety_pii_action")
    @classmethod
    def validate_safety_pii_action(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in cls._allowed_safety_pii_actions:
            allowed = ", ".join(sorted(cls._allowed_safety_pii_actions))
            raise ValueError(f"SAFETY_PII_ACTION must be one of: {allowed}")
        return normalized

    @field_validator("search_provider")
    @classmethod
    def validate_search_provider(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in cls._allowed_search_providers:
            allowed = ", ".join(sorted(cls._allowed_search_providers))
            raise ValueError(f"SEARCH_PROVIDER must be one of: {allowed}")
        return normalized

    @field_validator("style_profile_default")
    @classmethod
    def validate_style_profile_default(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in cls._allowed_style_profiles:
            allowed = ", ".join(sorted(cls._allowed_style_profiles))
            raise ValueError(f"STYLE_PROFILE_DEFAULT must be one of: {allowed}")
        return normalized

    @field_validator("role_profile_default")
    @classmethod
    def validate_role_profile_default(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in cls._allowed_role_profiles:
            allowed = ", ".join(sorted(cls._allowed_role_profiles))
            raise ValueError(f"ROLE_PROFILE_DEFAULT must be one of: {allowed}")
        return normalized

    @field_validator("safety_keyword_blacklist")
    @classmethod
    def normalize_safety_keyword_blacklist(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for item in value:
            keyword = str(item or "").strip()
            if keyword and keyword not in normalized:
                normalized.append(keyword)
        return normalized

    @field_validator("knowledge_max_hits")
    @classmethod
    def validate_knowledge_max_hits(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("KNOWLEDGE_MAX_HITS must be >= 1")
        if n > 20:
            raise ValueError("KNOWLEDGE_MAX_HITS must be <= 20")
        return n

    @field_validator("search_timeout_seconds")
    @classmethod
    def validate_search_timeout_seconds(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("SEARCH_TIMEOUT_SECONDS must be >= 1")
        if n > 60:
            raise ValueError("SEARCH_TIMEOUT_SECONDS must be <= 60")
        return n

    @field_validator("search_max_hits")
    @classmethod
    def validate_search_max_hits(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("SEARCH_MAX_HITS must be >= 1")
        if n > 20:
            raise ValueError("SEARCH_MAX_HITS must be <= 20")
        return n

    @field_validator("publisher_circuit_failure_threshold")
    @classmethod
    def validate_publisher_circuit_failure_threshold(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("PUBLISHER_CIRCUIT_FAILURE_THRESHOLD must be >= 1")
        if n > 20:
            raise ValueError("PUBLISHER_CIRCUIT_FAILURE_THRESHOLD must be <= 20")
        return n

    @field_validator("publisher_circuit_open_seconds")
    @classmethod
    def validate_publisher_circuit_open_seconds(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("PUBLISHER_CIRCUIT_OPEN_SECONDS must be >= 1")
        if n > 600:
            raise ValueError("PUBLISHER_CIRCUIT_OPEN_SECONDS must be <= 600")
        return n

    @field_validator("worker_max_retries")
    @classmethod
    def validate_worker_max_retries(cls, value: int) -> int:
        n = int(value)
        if n < 0:
            raise ValueError("WORKER_MAX_RETRIES must be >= 0")
        if n > 20:
            raise ValueError("WORKER_MAX_RETRIES must be <= 20")
        return n

    @field_validator("worker_retry_backoff")
    @classmethod
    def validate_worker_retry_backoff(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("WORKER_RETRY_BACKOFF must be >= 1")
        if n > 60:
            raise ValueError("WORKER_RETRY_BACKOFF must be <= 60")
        return n

    @field_validator("bilibili_poll_interval_seconds")
    @classmethod
    def validate_bilibili_poll_interval_seconds(cls, value: int) -> int:
        n = int(value)
        if n < 60:
            raise ValueError("BILIBILI_POLL_INTERVAL_SECONDS must be >= 60")
        if n > 3600:
            raise ValueError("BILIBILI_POLL_INTERVAL_SECONDS must be <= 3600")
        return n

    @field_validator("bilibili_rate_limit_per_minute")
    @classmethod
    def validate_bilibili_rate_limit_per_minute(cls, value: int) -> int:
        n = int(value)
        if n < 1:
            raise ValueError("BILIBILI_RATE_LIMIT_PER_MINUTE must be >= 1")
        if n > 60:
            raise ValueError("BILIBILI_RATE_LIMIT_PER_MINUTE must be <= 60")
        return n

    @field_validator("safety_pii_patterns")
    @classmethod
    def normalize_safety_pii_patterns(cls, value: dict[str, str]) -> dict[str, str]:
        normalized: dict[str, str] = {}
        for name, pattern in (value or {}).items():
            key = str(name or "").strip().lower()
            regex = str(pattern or "").strip()
            if key and regex:
                normalized[key] = regex
        return normalized

    @field_validator(
        "llm_provider",
        "llm_api_key",
        "publisher_webhook_url",
        "publisher_webhook_token",
        "publisher_real_publish_url",
        "publisher_real_publish_token",
        "publisher_hmac_secret",
        "gateway_token",
        "gateway_hmac_secret",
        "api_key",
        "safety_pii_action",
        "search_provider",
        "search_api_url",
        "search_api_key",
        "style_profile_default",
        "role_profile_default",
        "platform_bilibili_publish_source",
        "platform_douyin_publish_source",
        "platform_kuaishou_publish_source",
        "bilibili_sessdata",
        "bilibili_bili_jct",
        "bilibili_buvid3",
        "bilibili_buvid4",
        "bilibili_cookie_encryption_key",
        mode="before",
    )
    @classmethod
    def strip_text_fields(cls, value: str | None) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @staticmethod
    def is_placeholder_secret(value: str) -> bool:
        normalized = value.strip().upper()
        return normalized.startswith("__SET_") and normalized.endswith("__")

    @staticmethod
    def has_text(value: str | None) -> bool:
        return bool(str(value or "").strip())

    def build_startup_summary(self) -> dict[str, object]:
        return {
            "app_env": self.app_env,
            "publisher_mode": self.publisher_mode,
            "llm_provider": self.llm_provider,
            "llm_fallback_to_mock": self.llm_fallback_to_mock,
            "kill_switch": self.kill_switch,
            "search_provider": self.search_provider,
            "security": {
                "api_key_configured": self.has_text(self.api_key),
                "gateway_token_configured": self.has_text(self.gateway_token),
                "gateway_hmac_secret_configured": self.has_text(self.gateway_hmac_secret),
                "publisher_hmac_secret_configured": self.has_text(self.publisher_hmac_secret),
            },
            "integrations": {
                "database_url_configured": self.has_text(self.database_url),
                "celery_broker_url_configured": self.has_text(self.celery_broker_url),
                "celery_result_backend_configured": self.has_text(self.celery_result_backend),
                "llm_api_key_configured": self.has_text(self.llm_api_key),
                "publisher_webhook_url_configured": self.has_text(self.publisher_webhook_url),
                "publisher_real_publish_url_configured": self.has_text(self.publisher_real_publish_url),
            },
            "bilibili": {
                "enabled": self.bilibili_enabled,
                "poll_enabled": self.bilibili_poll_enabled,
                "publish_enabled": self.bilibili_publish_enabled,
                "poll_interval_seconds": self.bilibili_poll_interval_seconds,
                "rate_limit_per_minute": self.bilibili_rate_limit_per_minute,
                "credential_configured": self.has_text(self.bilibili_sessdata),
            },
        }

    def log_startup_summary(self) -> None:
        logger.info("startup_config_baseline=%s", self.build_startup_summary())

    @model_validator(mode="after")
    def validate_runtime_configuration(self):
        errors: list[str] = []

        def add_error(message: str) -> None:
            if message not in errors:
                errors.append(message)

        def require_text(field_name: str, env_name: str):
            value = getattr(self, field_name)
            if not self.has_text(value):
                add_error(f"{env_name} 不能为空")
                return

        def check_secret(field_name: str, env_name: str, *, required: bool = False):
            value = str(getattr(self, field_name) or "").strip()
            if not value:
                if required:
                    add_error(f"{env_name} 不能为空")
                return
            if self.is_placeholder_secret(value):
                add_error(f"{env_name} 不能使用占位符值")

        require_text("database_url", "DATABASE_URL")
        require_text("celery_broker_url", "CELERY_BROKER_URL")
        require_text("celery_result_backend", "CELERY_RESULT_BACKEND")

        check_secret("api_key", "API_KEY")
        check_secret("gateway_token", "GATEWAY_TOKEN")
        check_secret("gateway_hmac_secret", "GATEWAY_HMAC_SECRET")
        check_secret("llm_api_key", "LLM_API_KEY")
        check_secret("publisher_webhook_token", "PUBLISHER_WEBHOOK_TOKEN")
        check_secret("publisher_real_publish_token", "PUBLISHER_REAL_PUBLISH_TOKEN")
        check_secret("publisher_hmac_secret", "PUBLISHER_HMAC_SECRET")

        if self.publisher_mode == "webhook":
            require_text("publisher_webhook_url", "PUBLISHER_WEBHOOK_URL")
            check_secret("publisher_webhook_token", "PUBLISHER_WEBHOOK_TOKEN", required=True)
            check_secret("publisher_hmac_secret", "PUBLISHER_HMAC_SECRET", required=True)
        elif self.publisher_mode == "real_publish":
            require_text("publisher_real_publish_url", "PUBLISHER_REAL_PUBLISH_URL")
            check_secret("publisher_real_publish_token", "PUBLISHER_REAL_PUBLISH_TOKEN", required=True)
            check_secret("publisher_hmac_secret", "PUBLISHER_HMAC_SECRET", required=True)

        if self.llm_provider in {"openai", "openai_compatible"} and not self.llm_fallback_to_mock:
            check_secret("llm_api_key", "LLM_API_KEY", required=True)

        if self.is_production:
            check_secret("api_key", "API_KEY", required=True)
            check_secret("gateway_token", "GATEWAY_TOKEN", required=True)
            check_secret("gateway_hmac_secret", "GATEWAY_HMAC_SECRET", required=True)

            if self.llm_provider in {"openai", "openai_compatible"}:
                check_secret("llm_api_key", "LLM_API_KEY", required=True)

        if errors:
            raise ValueError("配置校验失败: " + "；".join(errors))

        return self


settings = Settings()
settings.log_startup_summary()
