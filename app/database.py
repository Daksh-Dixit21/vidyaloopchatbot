"""
Database Configuration Module.
Tries PostgreSQL via Supabase pooler; falls back to SQLite on any failure.
"""

from app.core.config import settings


def _ensure_async_driver(url: str) -> str:
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://") and "+asyncpg" not in url:
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


_url = settings.DATABASE_URL
_has_postgres = bool(_url)

if _has_postgres:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    database_url = _ensure_async_driver(_url)
    engine = create_async_engine(database_url, pool_size=2, max_overflow=5, pool_pre_ping=True)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    SessionLocal = None
else:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine("sqlite:///./vidyaloop.db", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    AsyncSessionLocal = None

from sqlalchemy.orm import declarative_base
Base = declarative_base()


def is_postgres() -> bool:
    return _has_postgres


def init_db():
    if not _has_postgres and SessionLocal:
        Base.metadata.create_all(bind=engine)


async def init_db_async():
    global _has_postgres
    if not _has_postgres:
        return
    try:
        async with engine.begin() as conn:
            from app.models.database import SessionDB, MessageDB
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"WARNING: PostgreSQL unreachable ({e}). Falling back to SQLite.")
        _has_postgres = False
        globals()["engine"] = None
        globals()["AsyncSessionLocal"] = None
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        sqlite_engine = create_engine("sqlite:///./vidyaloop.db", connect_args={"check_same_thread": False})
        globals()["engine"] = sqlite_engine
        globals()["SessionLocal"] = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)
        Base.metadata.create_all(bind=sqlite_engine)
        print("Now using SQLite.")

