from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

EXPECTED_TABLES = {
    "comments",
    "reply_jobs",
    "user_state",
    "publish_logs",
    "operation_audit_logs",
    "knowledge_entries",
    "role_cards",
    "observability_events",
    "bilibili_credentials",
    "bilibili_videos",
}
HEAD_REVISION = "20260312_bilibili_integration"
EXPECTED_COMPOUND_INDEXES = {
    "reply_jobs": {
        "ix_reply_jobs_status_created_at_id",
    },
    "operation_audit_logs": {
        "ix_operation_audit_logs_action_ok_created_at_id",
        "ix_operation_audit_logs_target_id_created_at_id",
    },
    "bilibili_videos": {
        "ix_bilibili_videos_poll_enabled_last_polled",
    },
}


def _build_alembic_config(database_url: str) -> Config:
    project_root = Path(__file__).resolve().parents[2]
    config = Config(str(project_root / "alembic.ini"))
    config.set_main_option("script_location", str(project_root / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _list_tables(database_url: str) -> set[str]:
    engine = create_engine(database_url)
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def _list_indexes(database_url: str, table_name: str) -> set[str]:
    engine = create_engine(database_url)
    try:
        return {item["name"] for item in inspect(engine).get_indexes(table_name)}
    finally:
        engine.dispose()


def _get_revision(database_url: str) -> str | None:
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            tables = set(inspect(connection).get_table_names())
            if "alembic_version" not in tables:
                return None
            row = connection.execute(text("SELECT version_num FROM alembic_version")).first()
            if row is None:
                return None
            return str(row[0])
    finally:
        engine.dispose()


def test_migration_init_and_upgrade_creates_full_schema(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'init.sqlite3'}"
    config = _build_alembic_config(database_url)

    command.upgrade(config, "head")

    tables = _list_tables(database_url)
    assert EXPECTED_TABLES.issubset(tables)
    assert _get_revision(database_url) == HEAD_REVISION


def test_migration_reapply_is_idempotent(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'reapply.sqlite3'}"
    config = _build_alembic_config(database_url)

    command.upgrade(config, "head")
    first_revision = _get_revision(database_url)
    command.upgrade(config, "head")
    second_revision = _get_revision(database_url)

    assert first_revision == HEAD_REVISION
    assert second_revision == HEAD_REVISION
    assert EXPECTED_TABLES.issubset(_list_tables(database_url))


def test_migration_upgrade_downgrade_roundtrip(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'roundtrip.sqlite3'}"
    config = _build_alembic_config(database_url)

    command.upgrade(config, "head")
    command.downgrade(config, "base")
    tables_after_downgrade = _list_tables(database_url)

    assert EXPECTED_TABLES.isdisjoint(tables_after_downgrade)
    assert _get_revision(database_url) is None

    command.upgrade(config, "head")
    assert EXPECTED_TABLES.issubset(_list_tables(database_url))
    assert _get_revision(database_url) == HEAD_REVISION


def test_migration_contains_compound_indexes(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'index-check.sqlite3'}"
    config = _build_alembic_config(database_url)

    command.upgrade(config, "head")

    for table_name, index_names in EXPECTED_COMPOUND_INDEXES.items():
        current_indexes = _list_indexes(database_url, table_name)
        assert index_names.issubset(current_indexes)
