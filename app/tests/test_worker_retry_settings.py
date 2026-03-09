import unittest

from pydantic import ValidationError

from app.settings import Settings


class WorkerRetrySettingsTests(unittest.TestCase):
    def test_worker_retry_settings_accept_valid_values(self):
        settings = Settings(
            app_env="development",
            worker_max_retries=5,
            worker_retry_backoff=3,
            worker_retry_jitter=False,
        )

        self.assertEqual(settings.worker_max_retries, 5)
        self.assertEqual(settings.worker_retry_backoff, 3)
        self.assertFalse(settings.worker_retry_jitter)

    def test_worker_max_retries_rejects_negative_values(self):
        with self.assertRaises(ValidationError) as context:
            Settings(app_env="development", worker_max_retries=-1)

        self.assertIn("WORKER_MAX_RETRIES", str(context.exception))

    def test_worker_retry_backoff_rejects_out_of_range_values(self):
        with self.assertRaises(ValidationError) as low_context:
            Settings(app_env="development", worker_retry_backoff=0)
        self.assertIn("WORKER_RETRY_BACKOFF", str(low_context.exception))

        with self.assertRaises(ValidationError) as high_context:
            Settings(app_env="development", worker_retry_backoff=61)
        self.assertIn("WORKER_RETRY_BACKOFF", str(high_context.exception))


if __name__ == "__main__":
    unittest.main()
