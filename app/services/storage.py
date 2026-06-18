from app.models.storage import Session, Message
from datetime import datetime


class StorageService:
    """
    In-memory storage service for the MVP.
    
    This class is intentionally designed to mirror
    what a real database service would look like.
    Every method here maps directly to a Supabase operation:
    
    create_session()     → INSERT INTO sessions
    get_session()        → SELECT FROM sessions WHERE session_id = ?
    add_message()        → INSERT INTO messages
    get_messages()       → SELECT FROM messages WHERE session_id = ?
    end_session()        → UPDATE sessions SET ended_at = ? WHERE session_id = ?
    
    When you migrate to Supabase, you replace the internals
    of each method without changing anything that calls them.
    That is why this pattern (called Repository Pattern) matters —
    the rest of your app never knows or cares where data is stored.
    """

    def __init__(self):
        # Two simple dicts act as our "database tables" for now
        self._sessions: dict[str, Session] = {}
        self._messages: dict[str, list[Message]] = {}

    # ─── Session Operations ────────────────────────────────────────

    def create_session(self, session: Session) -> Session:
        """Creates a new session. Returns the created session."""
        self._sessions[session.session_id] = session
        self._messages[session.session_id] = []
        return session

    def get_session(self, session_id: str) -> Session | None:
        """Returns a session by ID, or None if not found."""
        return self._sessions.get(session_id)

    def end_session(self, session_id: str) -> bool:
        """Marks a session as ended. Returns True if found."""
        session = self._sessions.get(session_id)
        if session:
            session.ended_at = datetime.utcnow()
            session.is_active = False
            return True
        return False

    def list_sessions(self) -> list[Session]:
        """Returns all sessions. Useful for admin dashboard later."""
        return list(self._sessions.values())

    # ─── Message Operations ────────────────────────────────────────

    def add_message(self, message: Message) -> Message:
        """Adds a message to a session's history."""
        if message.session_id not in self._messages:
            self._messages[message.session_id] = []
        self._messages[message.session_id].append(message)
        return message

    def get_messages(self, session_id: str) -> list[Message]:
        """Returns all messages for a session in order."""
        return self._messages.get(session_id, [])

    def get_message_count(self, session_id: str) -> int:
        """Returns number of messages in a session."""
        return len(self._messages.get(session_id, []))

    # ─── Stats ────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        """Returns basic system stats. Useful for health monitoring."""
        return {
            "total_sessions": len(self._sessions),
            "active_sessions": sum(
                1 for s in self._sessions.values() if s.is_active
            ),
            "total_messages": sum(
                len(msgs) for msgs in self._messages.values()
            )
        }


# Single instance shared across the entire app
# This is called a Singleton — one storage object, used everywhere
storage = StorageService()