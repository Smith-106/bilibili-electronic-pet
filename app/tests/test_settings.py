import unittest

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


if __name__ == "__main__":
    unittest.main()

