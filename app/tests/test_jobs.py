import copy
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base
from app.models.entities import Comment, KnowledgeEntry, ReplyJob, RoleCard
from app.services.generator import GenerationResult
from app.services.observability import get_observability_summary, reset_observability_events
from app.services.search_provider import SearchItem, SearchResult
from app.settings import settings
from app.workers import jobs


class ProcessCommentSafetyFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_observability_events()
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
        captured = {"force_long": None, "role_profile": None, "role_card_key": None}

        def fake_should_reply(event: object) -> tuple[bool, str, str]:
            captured["force_long"] = getattr(event, "force_long", None)
            captured["role_profile"] = getattr(event, "role_profile", None)
            captured["role_card_key"] = getattr(event, "role_card_key", None)
            return True, "normal", "long"

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", side_effect=fake_should_reply),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("好的，我们慢慢聊。")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)) as publish_mock,
        ):
            result = jobs.process_comment_event_task.run(
                {
                    "comment_id": "comment-force-long",
                    "force_long": True,
                    "role_profile": "comfort",
                    "role_card_key": "comfort_plus",
                    "trace_id": "trace-force-long",
                }
            )

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "manual_queue")
        self.assertEqual(result["trace_id"], "trace-force-long")
        self.assertTrue(captured["force_long"])
        self.assertEqual(captured["role_profile"], "comfort")
        self.assertEqual(captured["role_card_key"], "comfort_plus")
        publish_mock.assert_called_once()

        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-force-long").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.length_mode, "long")

    def test_force_long_string_payload_is_normalized_for_observability(self) -> None:
        self._insert_comment("comment-force-long-string", content="短评")
        job_started_metadata: list[dict] = []

        def fake_record_observability_event(event_type: str, **kwargs) -> None:
            if event_type == "job_started":
                job_started_metadata.append(dict(kwargs.get("metadata") or {}))

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("好的，我们慢慢聊。")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)),
            patch.object(jobs, "record_observability_event", side_effect=fake_record_observability_event),
        ):
            result = jobs.process_comment_event_task.run(
                {
                    "comment_id": "comment-force-long-string",
                    "force_long": "false",
                    "trace_id": "trace-force-long-string",
                }
            )

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "manual_queue")
        self.assertEqual(len(job_started_metadata), 1)
        self.assertEqual(job_started_metadata[0].get("force_long"), False)

    def test_knowledge_hit_marks_generation_flags(self) -> None:
        self._insert_comment("comment-knowledge-hit", content="Doro 喜欢欧润吉")
        self.db.add(
            KnowledgeEntry(
                category="faq",
                title="欧润吉",
                content="Doro 喜欢欧润吉梗，可以温柔回应。",
                enabled=True,
            )
        )
        self.db.commit()

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("收到，欧润吉~")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)),
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-knowledge-hit"})

        self.assertTrue(result["ok"])
        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-knowledge-hit").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertTrue(item.risk_flags.get("knowledge_hit"))
        self.assertIn("faq", item.risk_flags.get("knowledge_categories", []))

    def test_knowledge_search_error_falls_back_safely(self) -> None:
        self._insert_comment("comment-knowledge-error", content="测试知识检索异常")

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "search_knowledge", side_effect=RuntimeError("knowledge down")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("继续主流程")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)),
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-knowledge-error"})

        self.assertTrue(result["ok"])
        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-knowledge-error").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertFalse(item.risk_flags.get("knowledge_hit"))
        self.assertIn("knowledge_error", item.risk_flags)

    def test_search_hit_marks_generation_flags(self) -> None:
        self._insert_comment("comment-search-hit", content="今天热点新闻")

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(
                jobs,
                "search_web",
                return_value=SearchResult(
                    items=[
                        SearchItem(
                            title="热点",
                            url="https://example.com",
                            snippet="这是摘要",
                            source="mock",
                        )
                    ],
                    provider="mock",
                ),
            ),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("收到热点信息")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)),
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-search-hit"})

        self.assertTrue(result["ok"])
        item = self.db.query(ReplyJob).filter(ReplyJob.comment_id == "comment-search-hit").order_by(ReplyJob.id.desc()).first()
        self.assertIsNotNone(item)
        self.assertTrue(item.risk_flags.get("search_hit"))
        self.assertIn("mock", item.risk_flags.get("search_sources", []))

    def test_role_card_priority_prefers_explicit_then_active_then_profile(self) -> None:
        self._insert_comment("comment-role-card", content="角色卡优先级")
        self.db.add(
            RoleCard(
                key="active_card",
                name="Active",
                description="active",
                system_prompt="active prompt",
                tone={"warm": 1},
                constraints={"no_sarcasm": True},
                enabled=True,
                is_active=True,
            )
        )
        self.db.add(
            RoleCard(
                key="explicit_card",
                name="Explicit",
                description="explicit",
                system_prompt="explicit prompt",
                tone={"warm": 2},
                constraints={"no_sarcasm": False},
                enabled=True,
                is_active=False,
            )
        )
        self.db.commit()

        captured_calls: list[dict] = []

        def fake_generate(*args, **kwargs):
            captured_calls.append(kwargs)
            return self._generation("继续主流程")

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", side_effect=fake_generate),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)),
        ):
            jobs.process_comment_event_task.run(
                {
                    "comment_id": "comment-role-card",
                    "role_profile": "playful",
                    "role_card_key": "explicit_card",
                }
            )

        self.assertEqual(len(captured_calls), 1)
        first_call = captured_calls[0]
        self.assertEqual(first_call["role_profile"], "playful")
        self.assertEqual(first_call["role_card"].get("key"), "explicit_card")
        self.assertEqual(first_call["active_role_card"].get("key"), "active_card")

        captured_calls.clear()

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", side_effect=fake_generate),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(False, "manual_queue", None)),
        ):
            jobs.process_comment_event_task.run(
                {
                    "comment_id": "comment-role-card",
                    "role_profile": "comfort",
                }
            )

        second_call = captured_calls[0]
        self.assertEqual(second_call["role_profile"], "comfort")
        self.assertIsNone(second_call["role_card"])
        self.assertEqual(second_call["active_role_card"].get("key"), "active_card")

    def test_observability_summary_records_job_and_publish_metrics(self) -> None:
        self._insert_comment("comment-observability", content="观测链路测试")
        published_at = datetime.now(timezone.utc)

        with (
            patch.object(jobs, "SessionLocal", return_value=self.db),
            patch.object(jobs, "should_reply", return_value=(True, "normal", "medium")),
            patch.object(jobs, "generate_reply_with_meta", return_value=self._generation("观测回复")),
            patch.object(jobs, "is_recent_duplicate", return_value=False),
            patch.object(jobs, "publish_reply", return_value=(True, "simulated_auto_publish", published_at)),
        ):
            result = jobs.process_comment_event_task.run({"comment_id": "comment-observability"})

        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "published")

        summary = get_observability_summary(window_minutes=60)
        self.assertGreaterEqual(summary["totals"]["events"], 2)
        self.assertGreaterEqual(summary["by_event_type"].get("job_started", 0), 1)
        self.assertGreaterEqual(summary["by_event_type"].get("job_finished", 0), 1)
        self.assertGreaterEqual(summary["by_event_type"].get("publish_result", 0), 1)
        self.assertGreaterEqual(summary["rates"]["publish_success_rate"], 1.0)
        self.assertGreaterEqual(summary["latency"]["samples"], 1)
