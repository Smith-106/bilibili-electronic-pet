import copy
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base
from app.models.entities import Comment, ReplyJob
from app.services.generator import GenerationResult
from app.settings import settings
from app.workers import jobs


class ProcessCommentSafetyFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db: Session = self.SessionLocal()
        self._settings_snapshot = {
            "kill_switch": settings.kill_switch,
            "safety_enable_keyword_blocklist": settings.safety_enable_keyword_blocklist,
            "safety_keyword_blacklist": copy.deepcopy(settings.safety_keyword_blacklist),
            "safety_enable_pii_detection": settings.safety_enable_pii_detection,
            "safety_pii_patterns": copy.deepcopy(settings.safety_pii_patterns),
            "safety_pii_action": settings.safety_pii_action,
            "safety_max_reply_chars": settings.safety_max_reply_chars,
        }

        settings.kill_switch = False
        settings.safety_enable_keyword_blocklist = True
        settings.safety_keyword_blacklist = ["去死", "身份证"]
        settings.safety_enable_pii_detection = True
        settings.safety_pii_action = "manual_queue"
        settings.safety_max_reply_chars = 900

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()
        settings.kill_switch = self._settings_snapshot["kill_switch"]
        settings.safety_enable_keyword_blocklist = self._settings_snapshot["safety_enable_keyword_blocklist"]
        settings.safety_keyword_blacklist = self._settings_snapshot["safety_keyword_blacklist"]
        settings.safety_enable_pii_detection = self._settings_snapshot["safety_enable_pii_detection"]
        settings.safety_pii_patterns = self._settings_snapshot["safety_pii_patterns"]
        settings.safety_pii_action = self._settings_snapshot["safety_pii_action"]
        settings.safety_max_reply_chars = self._settings_snapshot["safety_max_reply_chars"]

    def _insert_comment(self, comment_id: str, content: str = "普通评论内容") -> None:
        self.db.add(
            Comment(
                comment_id=comment_id,
                video_id="video-1",
                user_id="user-1",
                content=content,
                parent_id=None,
            )
        )
        self.db.commit()

    @staticmethod
    def _generation(reply_text: str) -> GenerationResult:
        return GenerationResult(reply_text=reply_text, provider="mock", used_fallback=False)

    def test_high_risk_pii_goes_to_manual_queue(self) -> None:
        self._insert_comment("comment-pii")

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("联系我 13800138000")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply") as publish_mock,
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-pii"})

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "manual_queue")
        publish_mock.assert_not_called()

        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-pii").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.status, "manual_queue")
        self.assertEqual(item.risk_flags.get("decision"), "manual_queue")
        self.assertEqual(item.risk_flags.get("reason"), "contains_pii")
        self.assertTrue(bool(item.risk_flags.get("pii_matches")))

    def test_high_risk_keywords_go_to_blocked(self) -> None:
        self._insert_comment("comment-blocked")

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("你再这样我真要你去死了。")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply") as publish_mock,
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-blocked"})

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "blocked")
        publish_mock.assert_not_called()

        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-blocked").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.status, "blocked")
        self.assertEqual(item.risk_flags.get("decision"), "blocked")
        self.assertEqual(item.risk_flags.get("reason"), "contains_blocked_words")
        self.assertIn("去死", item.risk_flags.get("blocked_words", []))

    def test_low_risk_reply_stays_on_publish_flow(self) -> None:
        self._insert_comment("comment-ok")
        published_at = datetime.now(timezone.utc)

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("谢谢你呀，今天也要开心！")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(True, "simulated_auto_publish", published_at)),
            patch.object(jobs, "remember_reply_phrase") as remember_mock,
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-ok"})

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "published")
        remember_mock.assert_called_once()

        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-ok").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.status, "published")
        self.assertEqual(item.risk_flags.get("publish_reason"), "simulated_auto_publish")
        self.assertEqual(item.risk_flags.get("gateway_duplicate"), False)

    def test_force_long_payload_passed_to_decider_and_job(self) -> None:
        self._insert_comment("comment-force-long", content="短评")
        captured = {"force_long": None}

        def fake_should_reply(event: object) -> tuple[bool, str, str]:
            captured["force_long"] = getattr(event, "force_long", None)
            return True, "normal", "long"

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", side_effect=fake_should_reply),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("好的，我们慢慢聊。")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)) as publish_mock,
        ):
            result = jobs.process_comment_event_task.run(
                {"comment_id": "comment-force-long", "force_long": True, "trace_id": "trace-force-long"}
            )

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "manual_queue")
        self.assertEqual(result["trace_id"], "trace-force-long")
        self.assertTrue(captured["force_long"])
        publish_mock.assert_called_once()

        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-force-long").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.length_mode, "long")


if __name__ == "__main__":
    unittest.main()
