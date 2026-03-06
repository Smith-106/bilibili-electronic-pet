import copy
import unittest

from app.services.safety import safety_check
from app.settings import settings


class SafetyCheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self._settings_snapshot = {
            "safety_enable_keyword_blocklist": settings.safety_enable_keyword_blocklist,
            "safety_keyword_blacklist": copy.deepcopy(settings.safety_keyword_blacklist),
            "safety_enable_pii_detection": settings.safety_enable_pii_detection,
            "safety_pii_patterns": copy.deepcopy(settings.safety_pii_patterns),
            "safety_pii_action": settings.safety_pii_action,
            "safety_max_reply_chars": settings.safety_max_reply_chars,
        }
        settings.safety_enable_keyword_blocklist = True
        settings.safety_keyword_blacklist = ["政治", "仇恨", "身份证", "手机号", "去死"]
        settings.safety_enable_pii_detection = True
        settings.safety_pii_action = "manual_queue"
        settings.safety_max_reply_chars = 900

    def tearDown(self) -> None:
        settings.safety_enable_keyword_blocklist = self._settings_snapshot["safety_enable_keyword_blocklist"]
        settings.safety_keyword_blacklist = self._settings_snapshot["safety_keyword_blacklist"]
        settings.safety_enable_pii_detection = self._settings_snapshot["safety_enable_pii_detection"]
        settings.safety_pii_patterns = self._settings_snapshot["safety_pii_patterns"]
        settings.safety_pii_action = self._settings_snapshot["safety_pii_action"]
        settings.safety_max_reply_chars = self._settings_snapshot["safety_max_reply_chars"]

    def assert_risk_flags_shape(self, risk_flags: dict) -> None:
        for key in ["decision", "reason", "blocked_words", "pii_matches", "triggered_rules", "max_length", "actual_length"]:
            self.assertIn(key, risk_flags)

    def test_keyword_blacklist_hit_is_blocked(self) -> None:
        safe, risk_flags = safety_check("你这种人赶紧去死。")

        self.assertFalse(safe)
        self.assertEqual(risk_flags["decision"], "blocked")
        self.assertEqual(risk_flags["reason"], "contains_blocked_words")
        self.assertIn("去死", risk_flags["blocked_words"])
        self.assertIn("keyword_blacklist", risk_flags["triggered_rules"])
        self.assert_risk_flags_shape(risk_flags)

    def test_keyword_blacklist_can_be_disabled(self) -> None:
        settings.safety_enable_keyword_blocklist = False

        safe, risk_flags = safety_check("你这种人赶紧去死。")

        self.assertTrue(safe)
        self.assertEqual(risk_flags["decision"], "allow")
        self.assertEqual(risk_flags["reason"], "")
        self.assertEqual(risk_flags["blocked_words"], [])
        self.assert_risk_flags_shape(risk_flags)

    def test_pii_hit_routes_to_manual_queue(self) -> None:
        safe, risk_flags = safety_check("如果要联系我，请打 13800138000。")

        self.assertFalse(safe)
        self.assertEqual(risk_flags["decision"], "manual_queue")
        self.assertEqual(risk_flags["reason"], "contains_pii")
        self.assertTrue(any(item["type"] == "cn_phone" for item in risk_flags["pii_matches"]))
        self.assertIn("pii_detection", risk_flags["triggered_rules"])
        self.assert_risk_flags_shape(risk_flags)

    def test_pii_action_can_switch_to_blocked(self) -> None:
        settings.safety_pii_action = "blocked"

        safe, risk_flags = safety_check("我的邮箱是 doro@example.com。")

        self.assertFalse(safe)
        self.assertEqual(risk_flags["decision"], "blocked")
        self.assertEqual(risk_flags["reason"], "contains_pii")
        self.assertTrue(any(item["type"] == "email" for item in risk_flags["pii_matches"]))
        self.assert_risk_flags_shape(risk_flags)

    def test_pii_detection_can_be_disabled(self) -> None:
        settings.safety_enable_pii_detection = False

        safe, risk_flags = safety_check("如果要联系我，请打 13800138000。")

        self.assertTrue(safe)
        self.assertEqual(risk_flags["decision"], "allow")
        self.assertEqual(risk_flags["pii_matches"], [])
        self.assert_risk_flags_shape(risk_flags)

    def test_length_limit_blocks_long_reply(self) -> None:
        settings.safety_max_reply_chars = 10

        safe, risk_flags = safety_check("01234567890")

        self.assertFalse(safe)
        self.assertEqual(risk_flags["decision"], "blocked")
        self.assertEqual(risk_flags["reason"], "too_long")
        self.assertIn("length_limit", risk_flags["triggered_rules"])
        self.assertEqual(risk_flags["max_length"], 10)
        self.assertEqual(risk_flags["actual_length"], 11)
        self.assert_risk_flags_shape(risk_flags)

    def test_common_numbers_do_not_trigger_pii_false_positive(self) -> None:
        safe, risk_flags = safety_check("今天点赞数是 12345678，感谢支持。")

        self.assertTrue(safe)
        self.assertEqual(risk_flags["decision"], "allow")
        self.assertEqual(risk_flags["pii_matches"], [])
        self.assert_risk_flags_shape(risk_flags)


if __name__ == "__main__":
    unittest.main()
