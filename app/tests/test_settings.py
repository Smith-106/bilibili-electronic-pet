import unittest
from unittest.mock import patch

from pydantic import ValidationError

from app.settings import Settings


def build_production_settings(**overrides) -> Settings:
    payload = {
        "app_env": "production",
        "api_key": "prod-api-key",
        "gateway_token": "prod-gateway-token",
        "gateway_hmac_secret": "prod-gateway-hmac-secret",
        "llm_provider": "mock",
        "llm_api_key": "",
        "publisher_mode": "manual_queue",
    }
    payload.update(overrides)
    return Settings(**payload)


class SettingsSecurityTests(unittest.TestCase):
    def test_development_mode_keeps_local_debug_defaults(self):
        settings = Settings(
            app_env="development",
            api_key="",
            gateway_token="",
            gateway_hmac_secret="",
            publisher_webhook_token="",
        )

        self.assertEqual(settings.app_env, "development")
        self.assertFalse(settings.is_production)

    def test_production_mode_requires_api_key(self):
        with self.assertRaises(ValidationError) as context:
            build_production_settings(api_key="")

        self.assertIn("API_KEY", str(context.exception))

    def test_production_mode_rejects_placeholder_gateway_token(self):
        with self.assertRaises(ValidationError) as context:
            build_production_settings(gateway_token="__SET_GATEWAY_TOKEN__")

        self.assertIn("GATEWAY_TOKEN", str(context.exception))

    def test_webhook_mode_requires_publisher_security_config(self):
        with self.assertRaises(ValidationError) as context:
            build_production_settings(
                publisher_mode="webhook",
                publisher_webhook_url="https://example.com/webhook",
                publisher_webhook_token="",
                publisher_hmac_secret="",
            )

        message = str(context.exception)
        self.assertIn("PUBLISHER_WEBHOOK_TOKEN", message)
        self.assertIn("PUBLISHER_HMAC_SECRET", message)

    def test_openai_provider_requires_llm_api_key_in_production(self):
        with self.assertRaises(ValidationError) as context:
            build_production_settings(llm_provider="openai", llm_api_key="")

        self.assertIn("LLM_API_KEY", str(context.exception))

    def test_openai_provider_without_fallback_requires_api_key_early(self):
        with self.assertRaises(ValidationError) as context:
            Settings(
                app_env="development",
                llm_provider="openai",
                llm_fallback_to_mock=False,
                llm_api_key="",
            )

        self.assertIn("LLM_API_KEY", str(context.exception))

    def test_invalid_publisher_mode_is_rejected(self):
        with self.assertRaises(ValidationError):
            Settings(app_env="development", publisher_mode="invalid")

    def test_pipeline_search_provider_is_allowed(self):
        settings = Settings(app_env="development", search_provider="pipeline_v1")
        self.assertEqual(settings.search_provider, "pipeline_v1")

        settings = Settings(
            app_env="development",
            platform_bilibili_publish_source="  bilibili-open  ",
            platform_douyin_publish_source=" douyin-open ",
            platform_kuaishou_publish_source=" kuaishou-open ",
        )

        self.assertEqual(settings.platform_bilibili_publish_source, "bilibili-open")
        self.assertEqual(settings.platform_douyin_publish_source, "douyin-open")
        self.assertEqual(settings.platform_kuaishou_publish_source, "kuaishou-open")

    def test_webhook_mode_requires_security_config_early(self):
        with self.assertRaises(ValidationError) as context:
            Settings(
                app_env="development",
                publisher_mode="webhook",
                publisher_webhook_url="https://example.com/webhook",
                publisher_webhook_token="",
                publisher_hmac_secret="",
            )

        message = str(context.exception)
        self.assertIn("PUBLISHER_WEBHOOK_TOKEN", message)
        self.assertIn("PUBLISHER_HMAC_SECRET", message)

    def test_blank_database_url_fails_early(self):
        with self.assertRaises(ValidationError) as context:
            Settings(app_env="development", database_url="   ")

        self.assertIn("DATABASE_URL", str(context.exception))

    def test_startup_summary_is_desensitized(self):
        api_key = "prod-api-key-should-not-leak"
        gateway_token = "gateway-token-should-not-leak"
        gateway_hmac_secret = "gateway-hmac-should-not-leak"

        settings = Settings(
            app_env="development",
            api_key=api_key,
            gateway_token=gateway_token,
            gateway_hmac_secret=gateway_hmac_secret,
        )

        summary = settings.build_startup_summary()
        summary_text = str(summary)

        self.assertIn("api_key_configured", summary_text)
        self.assertTrue(summary["security"]["api_key_configured"])
        self.assertNotIn(api_key, summary_text)
        self.assertNotIn(gateway_token, summary_text)
        self.assertNotIn(gateway_hmac_secret, summary_text)

    def test_log_startup_summary_is_readable(self):
        settings = Settings(
            app_env="development",
            api_key="api-key-value",
            gateway_token="gateway-token-value",
            gateway_hmac_secret="gateway-hmac-value",
        )

        with patch("app.settings.logger") as mocked_logger:
            settings.log_startup_summary()

        mocked_logger.info.assert_called_once()
        message_template, summary_payload = mocked_logger.info.call_args[0]
        summary_text = str(summary_payload)

        self.assertEqual(message_template, "startup_config_baseline=%s")
        self.assertIn("app_env", summary_text)
        self.assertNotIn("api-key-value", summary_text)
        self.assertNotIn("gateway-token-value", summary_text)
        self.assertNotIn("gateway-hmac-value", summary_text)


if __name__ == "__main__":
    unittest.main()
