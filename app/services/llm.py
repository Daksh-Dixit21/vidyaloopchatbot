"""
Large Language Model (LLM) Service — Ollama provider.
Kept intact from the original codebase. Only storage calls made async.
"""

import httpx
import json
from app.core.config import settings
from app.core.prompts import build_system_prompt
from app.services.storage import storage
from app.models.storage import Message


class LLMService:
    """Service class responsible for generating AI responses using Ollama."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def get_response_stream(self, session_id: str, student_message: str):
        """
        An asynchronous generator that streams text chunks from Ollama.
        """
        session = await storage.get_session(session_id)
        if not session:
            yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
            return

        messages = await storage.get_messages(session_id)

        system_prompt = build_system_prompt(session)

        ollama_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            ollama_messages.append({"role": msg.role, "content": msg.content})

        ollama_messages.append({"role": "user", "content": student_message})

        await storage.add_message(Message(
            session_id=session_id,
            role="user",
            content=student_message,
        ))

        payload = {
            "model": self.model,
            "messages": ollama_messages,
            "stream": True,
            "options": {
                "temperature": settings.TEMPERATURE,
            },
        }

        full_response = ""

        async with httpx.AsyncClient() as client:
            try:
                headers = {"ngrok-skip-browser-warning": "true"}
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers=headers,
                    timeout=httpx.Timeout(60.0),
                ) as response:
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                chunk = data["message"]["content"]
                                full_response += chunk
                                yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
                            if data.get("done", False):
                                await storage.add_message(Message(
                                    session_id=session_id,
                                    role="assistant",
                                    content=full_response,
                                ))
                                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"


llm_service = LLMService()
