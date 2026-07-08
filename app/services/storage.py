"""
Storage Service (async PostgreSQL + sync SQLite fallback).

Implements the Repository Pattern. The rest of the application only interacts
with this class and the Pydantic models. They never interact directly with SQLAlchemy.

When DATABASE_URL is set (Supabase), uses async PostgreSQL.
When not set, falls back to sync SQLite for local dev.
"""

from app.models.storage import Session, Message, SessionSummary
from app.models.database import SessionDB, MessageDB
from app.database import is_postgres, AsyncSessionLocal, SessionLocal
from datetime import datetime
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload, joinedload


class StorageService:
    """
    Repository for session and message persistence.
    Methods are async if PostgreSQL is active, sync otherwise.
    """

    async def create_session(self, session: Session) -> Session:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                db_session = SessionDB(
                    session_id=session.session_id,
                    student_name=session.student_name,
                    class_level=session.class_level,
                    learner_type=session.learner_type,
                    started_at=session.started_at,
                    ended_at=session.ended_at,
                    is_active=session.is_active,
                )
                db.add(db_session)
                await db.commit()
                return session
        else:
            db = SessionLocal()
            try:
                db_session = SessionDB(
                    session_id=session.session_id,
                    student_name=session.student_name,
                    class_level=session.class_level,
                    learner_type=session.learner_type,
                    started_at=session.started_at,
                    ended_at=session.ended_at,
                    is_active=session.is_active,
                )
                db.add(db_session)
                db.commit()
                return session
            finally:
                db.close()

    async def get_session(self, session_id: str) -> Session | None:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(SessionDB).where(SessionDB.session_id == session_id)
                )
                db_session = result.scalar_one_or_none()
                if db_session:
                    return Session(
                        session_id=db_session.session_id,
                        student_name=db_session.student_name,
                        class_level=db_session.class_level,
                        learner_type=db_session.learner_type,
                        started_at=db_session.started_at,
                        ended_at=db_session.ended_at,
                        is_active=db_session.is_active,
                    )
                return None
        else:
            db = SessionLocal()
            try:
                db_session = (
                    db.query(SessionDB)
                    .filter(SessionDB.session_id == session_id)
                    .first()
                )
                if db_session:
                    return Session(
                        session_id=db_session.session_id,
                        student_name=db_session.student_name,
                        class_level=db_session.class_level,
                        learner_type=db_session.learner_type,
                        started_at=db_session.started_at,
                        ended_at=db_session.ended_at,
                        is_active=db_session.is_active,
                    )
                return None
            finally:
                db.close()

    async def delete_session(self, session_id: str) -> bool:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                # Delete messages first (FK constraint)
                await db.execute(
                    delete(MessageDB).where(MessageDB.session_id == session_id)
                )
                result = await db.execute(
                    delete(SessionDB).where(SessionDB.session_id == session_id)
                )
                await db.commit()
                return result.rowcount > 0
        else:
            db = SessionLocal()
            try:
                db.query(MessageDB).filter(
                    MessageDB.session_id == session_id
                ).delete()
                deleted = (
                    db.query(SessionDB)
                    .filter(SessionDB.session_id == session_id)
                    .delete()
                )
                db.commit()
                return deleted > 0
            finally:
                db.close()

    async def list_sessions(self) -> list[SessionSummary]:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(SessionDB).order_by(SessionDB.started_at.desc())
                )
                db_sessions = result.scalars().all()
                summaries = []
                for s in db_sessions:
                    count_result = await db.execute(
                        select(func.count(MessageDB.message_id)).where(
                            MessageDB.session_id == s.session_id
                        )
                    )
                    count = count_result.scalar()
                    summaries.append(
                        SessionSummary(
                            session_id=s.session_id,
                            student_name=s.student_name,
                            class_level=s.class_level,
                            started_at=s.started_at,
                            message_count=count,
                        )
                    )
                return summaries
        else:
            db = SessionLocal()
            try:
                db_sessions = (
                    db.query(SessionDB)
                    .order_by(SessionDB.started_at.desc())
                    .all()
                )
                summaries = []
                for s in db_sessions:
                    count = (
                        db.query(MessageDB)
                        .filter(MessageDB.session_id == s.session_id)
                        .count()
                    )
                    summaries.append(
                        SessionSummary(
                            session_id=s.session_id,
                            student_name=s.student_name,
                            class_level=s.class_level,
                            started_at=s.started_at,
                            message_count=count,
                        )
                    )
                return summaries
            finally:
                db.close()

    async def add_message(self, message: Message) -> Message:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                db_message = MessageDB(
                    message_id=message.message_id,
                    session_id=message.session_id,
                    role=message.role,
                    content=message.content,
                    hint_count=message.hint_count,
                    created_at=message.created_at,
                )
                db.add(db_message)
                await db.commit()
                return message
        else:
            db = SessionLocal()
            try:
                db_message = MessageDB(
                    message_id=message.message_id,
                    session_id=message.session_id,
                    role=message.role,
                    content=message.content,
                    hint_count=message.hint_count,
                    created_at=message.created_at,
                )
                db.add(db_message)
                db.commit()
                return message
            finally:
                db.close()

    async def get_messages(self, session_id: str) -> list[Message]:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(MessageDB)
                    .where(MessageDB.session_id == session_id)
                    .order_by(MessageDB.created_at.asc())
                )
                db_messages = result.scalars().all()
                return [
                    Message(
                        message_id=m.message_id,
                        session_id=m.session_id,
                        role=m.role,
                        content=m.content,
                        hint_count=m.hint_count,
                        created_at=m.created_at,
                    )
                    for m in db_messages
                ]
        else:
            db = SessionLocal()
            try:
                db_messages = (
                    db.query(MessageDB)
                    .filter(MessageDB.session_id == session_id)
                    .order_by(MessageDB.created_at.asc())
                    .all()
                )
                return [
                    Message(
                        message_id=m.message_id,
                        session_id=m.session_id,
                        role=m.role,
                        content=m.content,
                        hint_count=m.hint_count,
                        created_at=m.created_at,
                    )
                    for m in db_messages
                ]
            finally:
                db.close()

    async def get_message_count(self, session_id: str) -> int:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(func.count(MessageDB.message_id)).where(
                        MessageDB.session_id == session_id
                    )
                )
                return result.scalar()
        else:
            db = SessionLocal()
            try:
                return (
                    db.query(MessageDB)
                    .filter(MessageDB.session_id == session_id)
                    .count()
                )
            finally:
                db.close()

    async def get_stats(self) -> dict:
        if is_postgres():
            async with AsyncSessionLocal() as db:
                total_sessions_result = await db.execute(
                    select(func.count(SessionDB.session_id))
                )
                active_sessions_result = await db.execute(
                    select(func.count(SessionDB.session_id)).where(
                        SessionDB.is_active == True
                    )
                )
                total_messages_result = await db.execute(
                    select(func.count(MessageDB.message_id))
                )
                return {
                    "total_sessions": total_sessions_result.scalar(),
                    "active_sessions": active_sessions_result.scalar(),
                    "total_messages": total_messages_result.scalar(),
                }
        else:
            db = SessionLocal()
            try:
                return {
                    "total_sessions": db.query(SessionDB).count(),
                    "active_sessions": db.query(SessionDB).filter(
                        SessionDB.is_active == True
                    ).count(),
                    "total_messages": db.query(MessageDB).count(),
                }
            finally:
                db.close()


storage = StorageService()
