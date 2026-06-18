from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


def generate_id() -> str:
    """Generates a unique ID for sessions and messages."""
    return str(uuid.uuid4())


class Session(BaseModel):
    """
    Represents one student's chat session.
    
    A session starts when a student opens the chatbot
    and ends when they close it or after inactivity.
    
    Why Pydantic BaseModel instead of dataclass?
    Pydantic validates data types automatically and
    can serialize to/from JSON natively — perfect for
    storing in Supabase and sending to the frontend.
    """
    session_id: str = Field(default_factory=generate_id)
    student_name: str
    class_level: int
    learner_type: Literal["text", "visual", "math", "interactive"] = "text"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    is_active: bool = True

    class Config:
        # Allows datetime objects to serialize to ISO string in JSON
        json_encoders = {datetime: lambda v: v.isoformat()}


class Message(BaseModel):
    """
    Represents one message in a conversation.
    Both student messages and tutor responses are stored here.
    
    Why store blocks separately from content?
    content = raw text (for search, fine-tuning data later)
    blocks  = parsed structured data (for rendering in frontend)
    Both are needed for different purposes.
    """
    message_id: str = Field(default_factory=generate_id)
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    blocks: list[dict] = []      # Parsed response blocks
    hint_count: int = 0          # Hint number at time of this message
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class SessionSummary(BaseModel):
    """
    A lightweight version of Session + its messages.
    Used when the frontend requests conversation history.
    We don't send the full Session object — only what the UI needs.
    """
    session_id: str
    student_name: str
    class_level: int
    started_at: datetime
    message_count: int
    messages: list[Message] = []

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}