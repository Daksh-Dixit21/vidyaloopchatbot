"""
Async Request Queue Service.

When rate limits are reached, requests are queued instead of rejected.
The queue processes requests at a safe rate that stays under Groq's limits.
Uses lazy imports to avoid circular dependency with groq_llm.py.
"""

import asyncio
import json
import time
from collections import deque
from app.services.rate_limiter import rate_limiter


class QueuedRequest:
    """Represents a single queued chat request."""

    def __init__(self, session_id: str, message: str,
                 student_name: str, class_level: int, learner_type: str,
                 future: asyncio.Future):
        self.session_id = session_id
        self.message = message
        self.student_name = student_name
        self.class_level = class_level
        self.learner_type = learner_type
        self.future = future
        self.enqueued_at = time.time()


class RequestQueue:
    """
    FIFO queue for LLM requests.
    Processes at a rate that stays under Groq's rate limits.
    """

    def __init__(self):
        self._queue: deque[QueuedRequest] = deque()
        self.max_size = 50
        self._processing = False
        self._lock = asyncio.Lock()

    async def enqueue(
        self,
        session_id: str,
        message: str,
        student_name: str,
        class_level: int,
        learner_type: str,
    ) -> str:
        """
        Add a request to the queue.
        Returns an error string if queue is full, or awaits result.
        """
        if len(self._queue) >= self.max_size:
            return json.dumps({"error": "Queue full. Try again later."})

        loop = asyncio.get_event_loop()
        future = loop.create_future()

        req = QueuedRequest(
            session_id=session_id,
            message=message,
            student_name=student_name,
            class_level=class_level,
            learner_type=learner_type,
            future=future,
        )

        async with self._lock:
            self._queue.append(req)
            if not self._processing:
                self._processing = True
                asyncio.create_task(self._process_loop())

        try:
            result = await asyncio.wait_for(future, timeout=120.0)
            return result
        except asyncio.TimeoutError:
            return json.dumps({"error": "Request timed out in queue."})

    async def _process_loop(self):
        """
        Continuously processes queued requests.
        Between each request, waits enough time to stay under RPM limit.
        """
        while True:
            async with self._lock:
                if not self._queue:
                    self._processing = False
                    return
                req = self._queue.popleft()

            allowed, _ = await rate_limiter.can_proceed()
            if not allowed:
                wait_time = max(2.0, 60.0 / rate_limiter.rpm_limit)
                await asyncio.sleep(wait_time)
                async with self._lock:
                    self._queue.appendleft(req)
                continue

            from app.services.groq_llm import groq_llm_service
            from app.services.storage import storage
            from app.core.prompts import build_system_prompt
            from app.models.storage import Session, Message

            session = await storage.get_session(req.session_id)
            if not session:
                req.future.set_result(json.dumps({"error": "Session not found"}))
                continue

            try:
                full_response = ""
                async for chunk in groq_llm_service.stream_chat_raw(
                    session, req.message
                ):
                    full_response += chunk

                await storage.add_message(Message(
                    session_id=req.session_id,
                    role="assistant",
                    content=full_response,
                ))

                data = {"type": "done", "cached": False}
                req.future.set_result(json.dumps(data))
            except Exception as e:
                req.future.set_result(
                    json.dumps({"error": str(e)})
                )


request_queue = RequestQueue()

