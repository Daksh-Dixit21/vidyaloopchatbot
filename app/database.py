"""
Database Configuration Module.
Always creates SQLite session maker. Checks if PostgreSQL is reachable at startup.
"""

from app.core.config import settings


def _ensure_async_driver(url: str) -> str:
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://") and "+asyncpg" not in url:
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# ── Always create SQLite session maker (used as fallback) ──
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

_sqlite_engine = create_engine("sqlite:///./vidyaloop.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_sqlite_engine)
AsyncSessionLocal = None

# ── Try PostgreSQL if URL provided ──
_url = settings.DATABASE_URL
_has_postgres = bool(_url)
_async_engine = None

if _has_postgres:
    try:
        import socket
        from urllib.parse import urlparse
        parsed = urlparse(_url)
        if parsed.hostname:
            socket.getaddrinfo(parsed.hostname, None)
    except Exception:
        _has_postgres = False

if _has_postgres:
    from sqlalchemy.ext.asyncio import create_async_engine as _create_async_engine
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    database_url = _ensure_async_driver(_url)
    _async_engine = _create_async_engine(database_url, pool_size=2, max_overflow=5, pool_pre_ping=True)
    AsyncSessionLocal = async_sessionmaker(_async_engine, class_=AsyncSession, expire_on_commit=False)

engine = _async_engine if _has_postgres else _sqlite_engine
Base = declarative_base()


def is_postgres() -> bool:
    return _has_postgres


def init_db():
    Base.metadata.create_all(bind=engine)


async def init_db_async():
    global _has_postgres
    if not _has_postgres:
        Base.metadata.create_all(bind=_sqlite_engine)
        return
    try:
        async with _async_engine.begin() as conn:
            from app.models.database import SessionDB, MessageDB
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"WARNING: PostgreSQL unreachable ({e}). Using SQLite.")
        _has_postgres = False
        Base.metadata.create_all(bind=_sqlite_engine)

