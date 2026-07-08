"""
Main Application Entry Point.
FastAPI application with dual LLM provider support (Ollama + Groq),
response caching, rate limiting, and async PostgreSQL storage.
"""

import json
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.database import init_db, init_db_async, is_postgres
from app.services.llm import llm_service as ollama_service
from app.services.groq_llm import groq_llm_service
from app.services.storage import storage
from app.services.cache import cache_service
from app.services.rate_limiter import rate_limiter
from app.models.storage import Session

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vidyaloopchatbot.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database tables and warm up caches."""
    if is_postgres():
        await init_db_async()
    else:
        init_db()


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up HTTP clients."""
    await groq_llm_service.close()


class ChatRequest(BaseModel):
    """Incoming POST request payload for a chat message."""
    session_id: str
    message: str
    student_name: str = "Student"
    class_level: int = 11
    learner_type: str = "text"


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": f"{settings.APP_NAME} is running",
        "version": settings.VERSION,
        "provider": settings.LLM_PROVIDER,
    }


@app.get("/health")
async def health():
    """Detailed health check with cache and rate limit status."""
    rl_status = await rate_limiter.status()
    cache_ok = await cache_service.health()
    return {
        "status": "ok",
        "version": settings.VERSION,
        "database": "postgresql" if is_postgres() else "sqlite",
        "provider": {
            "active": settings.LLM_PROVIDER,
            "groq_configured": bool(settings.GROQ_API_KEY),
        },
        "cache": {
            "enabled": cache_service.enabled,
            "reachable": cache_ok,
        },
        "rate_limits": rl_status,
    }


@app.get("/sessions")
async def get_sessions():
    """List all chat sessions for the sidebar."""
    return await storage.list_sessions()


@app.get("/session/{session_id}/history")
async def get_history(session_id: str):
    """Get full message history for a session."""
    session = await storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await storage.get_messages(session_id)
    return {
        "session_id": session_id,
        "student_name": session.student_name,
        "class_level": session.class_level,
        "started_at": session.started_at.isoformat(),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its messages."""
    success = await storage.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "session deleted"}


@app.get("/rate-limits")
async def get_rate_limits():
    """View current rate limit consumption."""
    return await rate_limiter.status()


@app.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    provider: Optional[str] = Query(None, description="Force a provider: 'ollama' or 'groq'"),
):
    """
    Core streaming chat endpoint.

    Accepts user message and streams AI response via SSE.
    Provider selection:
      - Query param ?provider=groq forces Groq
      - Query param ?provider=ollama forces Ollama (local)
      - Default uses LLM_PROVIDER from environment
    """
    active_provider = provider or settings.LLM_PROVIDER

    session = await storage.get_session(request.session_id)
    if not session:
        session = Session(
            session_id=request.session_id,
            student_name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type,
        )
        await storage.create_session(session)

    if active_provider == "groq" and settings.GROQ_API_KEY:
        service = groq_llm_service
    else:
        service = ollama_service

    return StreamingResponse(
        service.get_response_stream(request.session_id, request.message),
        media_type="text/event-stream",
    )