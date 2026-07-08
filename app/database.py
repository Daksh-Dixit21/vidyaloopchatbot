"""
Database Configuration Module.
Supports both async PostgreSQL (Supabase) and sync SQLite fallback.
"""

from app.core.config import settings

has_postgres = bool(settings.DATABASE_URL)

if has_postgres:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.orm import declarative_base

    engine = create_async_engine(
        settings.DATABASE_URL,
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
    """Creates all tables. Sync version for SQLite, no-op for PostgreSQL (managed by supabase_init.sql)."""
    if not has_postgres and SessionLocal:
        Base.metadata.create_all(bind=engine)

async def init_db_async():
    """Async version for PostgreSQL — can be called on startup."""
    if has_postgres:
        async with engine.begin() as conn:
            from app.models.database import SessionDB, MessageDB
            await conn.run_sync(Base.metadata.create_all)

