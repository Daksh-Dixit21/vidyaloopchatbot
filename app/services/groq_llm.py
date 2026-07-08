"""
Groq LLM Service.

OpenAI-compatible streaming client for Groq API.
Replicates the same SSE contract as the Ollama service so the frontend never knows the difference.
Implements response caching and rate limit integration.
"""

import json
import httpx
from app.core.config import settings
from app.core.prompts import build_system_prompt
from app.services.storage import storage
from app.services.cache import cache_service
from app.services.rate_limiter import rate_limiter
from app.models.storage import Message


class GroqLLMService:
    """
    Streaming LLM client for Groq API.
    OpenAI-compatible endpoint, same SSE contract as Ollama.
    """

    def __init__(self):
        self.base_url = settings.GROQ_BASE_URL
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.temperature = settings.TEMPERATURE
        self.chat_endpoint = f"{self.base_url}/chat/completions"
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(60.0, connect=10.0),
            )
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get_response_stream(self, session_id: str, student_message: str):
        """
        Async generator yielding SSE events.
        Matches the same contract as OllamaLLMService.get_response_stream.
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

        session_context = session.session_id[:8]
        cached = await cache_service.get(student_message, session_context)
        if cached:
            await storage.add_message(Message(
                session_id=session_id,
                role="assistant",
                content=cached,
            ))
            for chunk in _chunk_text(cached, 20):
                yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'cached': True})}\n\n"
            return

        allowed, reason = await rate_limiter.can_proceed()
        if not allowed:
            yield f"data: {json.dumps({'error': f'Rate limited ({reason}) — queued'})}\n\n"
            from app.services.queue import request_queue
            result = await request_queue.enqueue(
                session_id=session_id,
                message=student_message,
                student_name=session.student_name,
                class_level=session.class_level,
                learner_type=session.learner_type,
            )
            yield f"data: {result}\n\n"
            return

        full_response = ""
        try:
            async with self.client.stream(
                "POST",
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": ollama_messages,
                    "stream": True,
                    "temperature": self.temperature,
                    "max_tokens": 1024,
                },
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    err_msg = f"Groq API error {response.status_code}: {body.decode(errors='ignore')[:200]}"
                    yield f"data: {json.dumps({'error': err_msg})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        data = json.loads(payload)
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            full_response += content
                            yield f"data: {json.dumps({'type': 'token', 'text': content})}\n\n"
                    except json.JSONDecodeError:
                        continue

            await rate_limiter.record()

            await storage.add_message(Message(
                session_id=session_id,
                role="assistant",
                content=full_response,
            ))

            await cache_service.set(student_message, session_context, full_response)

            yield f"data: {json.dumps({'type': 'done', 'cached': False})}\n\n"

        except httpx.TimeoutException:
            yield f"data: {json.dumps({'error': 'Groq API timed out. Try again.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    async def stream_chat_raw(self, session, student_message: str):
        """
        Same as get_response_stream but yields raw text chunks.
        Used internally by the queue processor.
        """
        messages = await storage.get_messages(session.session_id)
        system_prompt = build_system_prompt(session)

        ollama_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            ollama_messages.append({"role": msg.role, "content": msg.content})
        ollama_messages.append({"role": "user", "content": student_message})

        full_response = ""
        try:
            async with self.client.stream(
                "POST",
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": ollama_messages,
                    "stream": True,
                    "temperature": self.temperature,
                    "max_tokens": 1024,
                },
            ) as response:
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        data = json.loads(payload)
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            full_response += content
                            yield content
                    except json.JSONDecodeError:
                        continue

            await rate_limiter.record()

        except Exception:
            pass


def _chunk_text(text: str, chunk_size: int = 20):
    """Split text into chunks for SSE streaming simulation."""
    for i in range(0, len(text), chunk_size):
        yield text[i:i + chunk_size]


groq_llm_service = GroqLLMService()
