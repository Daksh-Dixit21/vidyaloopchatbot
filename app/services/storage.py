from app.models.storage import Session, Message, SessionSummary
from app.models.database import SessionDB, MessageDB
from app.database import SessionLocal
from datetime import datetime

class StorageService:
    """
    Persistent SQLite storage service.
    
    This implements the Repository Pattern. The rest of the application
    (like `main.py` and `llm.py`) only interacts with this class and the Pydantic
    models (`Session`, `Message`). They never interact directly with SQLAlchemy.
    
    This separation of concerns means you could swap out SQLite for PostgreSQL
    or Supabase in the future simply by updating the code in this file, without
    touching the rest of the application.
    """
    
    def create_session(self, session: Session) -> Session:
        """
        Takes a Pydantic Session model, converts it to an SQLAlchemy SessionDB model,
        and saves it to the SQLite database.
        """
        # 1. Open a new database connection
        db = SessionLocal()
        try:
            # 2. Map Pydantic model to SQLAlchemy model
            db_session = SessionDB(
                session_id=session.session_id,
                student_name=session.student_name,
                class_level=session.class_level,
                learner_type=session.learner_type,
                started_at=session.started_at,
                ended_at=session.ended_at,
                is_active=session.is_active
            )
            # 3. Add to transaction and commit
            db.add(db_session)
            db.commit()
            return session
        finally:
            # 4. Always close the connection
            db.close()

    def get_session(self, session_id: str) -> Session | None:
        """
        Fetches a session from the database by its ID.
        Converts the SQLAlchemy model back to a Pydantic model for the app to use.
        """
        db = SessionLocal()
        try:
            db_session = db.query(SessionDB).filter(SessionDB.session_id == session_id).first()
            if db_session:
                return Session(
                    session_id=db_session.session_id,
                    student_name=db_session.student_name,
                    class_level=db_session.class_level,
                    learner_type=db_session.learner_type,
                    started_at=db_session.started_at,
                    ended_at=db_session.ended_at,
                    is_active=db_session.is_active
                )
            return None
        finally:
            db.close()

    def delete_session(self, session_id: str) -> bool:
        """
        Hard deletes a session and all its associated messages from the database.
        Returns True if successful, False if the session was not found.
        """
        db = SessionLocal()
        try:
            # Delete all messages associated with the session
            db.query(MessageDB).filter(MessageDB.session_id == session_id).delete()
            # Delete the session itself
            deleted_count = db.query(SessionDB).filter(SessionDB.session_id == session_id).delete()
            db.commit()
            return deleted_count > 0
        finally:
            db.close()

    def list_sessions(self) -> list[SessionSummary]:
        """
        Returns a list of lightweight SessionSummary objects for the frontend sidebar.
        Orders by the most recently started session first.
        """
        db = SessionLocal()
        try:
            # Fetch all sessions, ordered by date descending
            db_sessions = db.query(SessionDB).order_by(SessionDB.started_at.desc()).all()
            summaries = []
            for s in db_sessions:
                # Count the number of messages in each session
                count = db.query(MessageDB).filter(MessageDB.session_id == s.session_id).count()
                summaries.append(SessionSummary(
                    session_id=s.session_id,
                    student_name=s.student_name,
                    class_level=s.class_level,
                    started_at=s.started_at,
                    message_count=count
                ))
            return summaries
        finally:
            db.close()

    def add_message(self, message: Message) -> Message:
        """
        Saves a single chat message (either user or assistant) to the database.
        """
        db = SessionLocal()
        try:
            db_message = MessageDB(
                message_id=message.message_id,
                session_id=message.session_id,
                role=message.role,
                content=message.content,
                hint_count=message.hint_count,
                created_at=message.created_at
            )
            db.add(db_message)
            db.commit()
            return message
        finally:
            db.close()

    def get_messages(self, session_id: str) -> list[Message]:
        """
        Retrieves the entire chat history for a given session, ordered chronologically.
        """
        db = SessionLocal()
        try:
            db_messages = db.query(MessageDB).filter(MessageDB.session_id == session_id).order_by(MessageDB.created_at.asc()).all()
            return [
                Message(
                    message_id=m.message_id,
                    session_id=m.session_id,
                    role=m.role,
                    content=m.content,
                    hint_count=m.hint_count,
                    created_at=m.created_at
                ) for m in db_messages
            ]
        finally:
            db.close()

    def get_message_count(self, session_id: str) -> int:
        """Quickly count messages for a session without loading them all."""
        db = SessionLocal()
        try:
            return db.query(MessageDB).filter(MessageDB.session_id == session_id).count()
        finally:
            db.close()

    def get_stats(self) -> dict:
        """Returns aggregate stats across the entire database."""
        db = SessionLocal()
        try:
            total_sessions = db.query(SessionDB).count()
            active_sessions = db.query(SessionDB).filter(SessionDB.is_active == True).count()
            total_messages = db.query(MessageDB).count()
            return {
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "total_messages": total_messages
            }
        finally:
            db.close()

# Singleton instance used throughout the app
storage = StorageService()