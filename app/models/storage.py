"""
Storage Schemas Module.
This module defines Pydantic models used for data validation and API payloads.
These are the core domain objects used by the Python application to handle state
before it interacts with the database.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


def generate_id() -> str:
    """Generates a secure, unique UUID string for new sessions and messages."""
    return str(uuid.uuid4())


class Session(BaseModel):
    """
    Represents a chat session domain object.
    Used by the backend to track an ongoing conversation with a student.
    """
    session_id: str = Field(default_factory=generate_id)
    student_name: str
    class_level: int
    learner_type: Literal["text", "visual", "math", "interactive"] = "text"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    is_active: bool = True

    class Config:
        # Ensures datetime objects are serialized to ISO 8601 strings when converting to JSON
        json_encoders = {datetime: lambda v: v.isoformat()}


class Message(BaseModel):
    """
    Represents a single chat message domain object.
    """
    message_id: str = Field(default_factory=generate_id)
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    hint_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class SessionSummary(BaseModel):
    """
    A lightweight representation of a session, primarily used by the
    FastAPI endpoint that populates the frontend sidebar.
    """
    session_id: str
    student_name: str
    class_level: int
    started_at: datetime
    message_count: int

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}