"""
Database Configuration Module.
Lazy init: tries PostgreSQL first, falls back to SQLite on any failure.
All consumers call `is_postgres()` (function) so the flag is always current.
"""

import socket
from urllib.parse import urlparse

from app.core.config import settings


def _ensure_async_driver(url: str) -> str:
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://") and "+asyncpg" not in url:
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# ── Mutable state (wrapped so all consumers always see the latest) ──
_has_postgres = False


def is_postgres() -> bool:
    return _has_postgres


def _setup_postgres():
    global _has_postgres
    url = settings.DATABASE_URL
    if not url:
        _has_postgres = False
        return False

    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    if not hostname:
        _has_postgres = False
        return False

    try:
        socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        _has_postgres = False
        return False

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

    database_url = _ensure_async_driver(url)
    engine = create_async_engine(database_url, pool_size=2, max_overflow=5, pool_pre_ping=True)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    globals()["engine"] = engine
    globals()["AsyncSessionLocal"] = session_maker
    globals()["SessionLocal"] = None
    _has_postgres = True
    return True


def _setup_sqlite():
    global _has_postgres
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine("sqlite:///./vidyaloop.db", connect_args={"check_same_thread": False})
    session_maker = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    globals()["engine"] = engine
    globals()["SessionLocal"] = session_maker
    globals()["AsyncSessionLocal"] = None
    _has_postgres = False


# ── Module-level defaults (replaced by _setup_* on first call) ──
engine = None
AsyncSessionLocal = None
SessionLocal = None
Base = None

_initialized = False


def _ensure_init():
    global _initialized, Base
    if _initialized:
        return
    if not _setup_postgres():
        _setup_sqlite()
    from sqlalchemy.orm import declarative_base
    Base = declarative_base()
    _initialized = True


def init_db():
    _ensure_init()
    if not _has_postgres and SessionLocal:
        Base.metadata.create_all(bind=engine)


async def init_db_async():
    _ensure_init()
    if _has_postgres:
        try:
            async with engine.begin() as conn:
                from app.models.database import SessionDB, MessageDB
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            print(f"WARNING: PostgreSQL connection failed: {e}")
            print("Falling back to SQLite.")
            _setup_sqlite()
            init_db()

