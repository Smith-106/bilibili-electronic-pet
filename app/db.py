import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import settings


class Base(DeclarativeBase):
    pass


def _read_pool_setting(name: str, default: int, *, minimum: int, maximum: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return default
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc

    if value < minimum or value > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def load_pool_options() -> dict[str, bool | int]:
    return {
        "pool_pre_ping": True,
        "pool_size": _read_pool_setting("DB_POOL_SIZE", 10, minimum=1, maximum=200),
        "max_overflow": _read_pool_setting("DB_MAX_OVERFLOW", 20, minimum=0, maximum=200),
        "pool_timeout": _read_pool_setting("DB_POOL_TIMEOUT", 30, minimum=1, maximum=300),
        "pool_recycle": _read_pool_setting("DB_POOL_RECYCLE", 1800, minimum=-1, maximum=86400),
    }


engine = create_engine(settings.database_url, **load_pool_options())
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ALEMBIC_INI_PATH = PROJECT_ROOT / "alembic.ini"
MIGRATIONS_DIR = PROJECT_ROOT / "migrations"


def build_alembic_config(database_url: str | None = None):
    from alembic.config import Config

    config = Config(str(ALEMBIC_INI_PATH))
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    config.set_main_option("sqlalchemy.url", database_url or settings.database_url)
    return config


def run_migrations(database_url: str | None = None) -> None:
    from alembic import command

    config = build_alembic_config(database_url=database_url)
    command.upgrade(config, "head")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict[str, bool | str]:
    """Check database connectivity for readiness probe."""
    try:
        from sqlalchemy import text
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {"connected": True}
    except Exception as e:
        return {"connected": False, "error": str(e)}
