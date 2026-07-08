"""
Database Configuration Module.
Supports both async PostgreSQL (Supabase) and sync SQLite fallback.
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


def _host_resolves(hostname: str) -> bool:
    try:
        socket.getaddrinfo(hostname, None)
        return True
    except socket.gaierror:
        return False


_url = settings.DATABASE_URL
_parsed = urlparse(_url) if _url else None
_host = _parsed.hostname if _parsed else ""
has_postgres = bool(_url) and bool(_host) and _host_resolves(_host)

if has_postgres:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.orm import declarative_base

    database_url = _ensure_async_driver(settings.DATABASE_URL)

    engine = create_async_engine(
        database_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
    AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    SessionLocal = None

else:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import declarative_base, sessionmaker

    engine = create_engine(
        "sqlite:///./vidyaloop.db",
        connect_args={"check_same_thread": False},
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    AsyncSessionLocal = None

Base = declarative_base()


def init_db():
    if not has_postgres and SessionLocal:
        Base.metadata.create_all(bind=engine)


async def init_db_async():
    if has_postgres:
        async with engine.begin() as conn:
            from app.models.database import SessionDB, MessageDB
            await conn.run_sync(Base.metadata.create_all)

