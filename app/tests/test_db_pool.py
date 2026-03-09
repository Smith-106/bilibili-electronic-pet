import os
import unittest
from unittest.mock import patch

from app.db import load_pool_options


class DbPoolOptionsTests(unittest.TestCase):
    def test_load_pool_options_uses_defaults_when_env_missing(self):
        with patch.dict(
            os.environ,
            {
                "DB_POOL_SIZE": "",
                "DB_MAX_OVERFLOW": "",
                "DB_POOL_TIMEOUT": "",
                "DB_POOL_RECYCLE": "",
            },
            clear=False,
        ):
            options = load_pool_options()

        self.assertEqual(options["pool_size"], 10)
        self.assertEqual(options["max_overflow"], 20)
        self.assertEqual(options["pool_timeout"], 30)
        self.assertEqual(options["pool_recycle"], 1800)
        self.assertTrue(options["pool_pre_ping"])

    def test_load_pool_options_reads_custom_env_values(self):
        with patch.dict(
            os.environ,
            {
                "DB_POOL_SIZE": "16",
                "DB_MAX_OVERFLOW": "24",
                "DB_POOL_TIMEOUT": "40",
                "DB_POOL_RECYCLE": "1200",
            },
            clear=False,
        ):
            options = load_pool_options()

        self.assertEqual(options["pool_size"], 16)
        self.assertEqual(options["max_overflow"], 24)
        self.assertEqual(options["pool_timeout"], 40)
        self.assertEqual(options["pool_recycle"], 1200)

    def test_load_pool_options_rejects_non_integer_pool_size(self):
        with self.assertRaises(ValueError) as context:
            with patch.dict(os.environ, {"DB_POOL_SIZE": "not-an-int"}, clear=False):
                load_pool_options()

        self.assertIn("DB_POOL_SIZE", str(context.exception))

    def test_load_pool_options_rejects_out_of_range_values(self):
        with self.assertRaises(ValueError) as context:
            with patch.dict(os.environ, {"DB_POOL_TIMEOUT": "0"}, clear=False):
                load_pool_options()

        self.assertIn("DB_POOL_TIMEOUT", str(context.exception))


if __name__ == "__main__":
    unittest.main()
