"""
Upstash Redis Response Cache Service.

Caches LLM responses by message content hash to avoid redundant inference.
Uses Upstash REST API — no TCP connection needed, works on serverless platforms.
"""

import hashlib
import json
import httpx
from app.core.config import settings


class CacheService:
    """
    Response cache backed by Upstash Redis.
    Stores (message_hash -> response) with 24-hour TTL.
    """

    def __init__(self):
        self.base_url = settings.UPSTASH_REDIS_REST_URL
        self.token = settings.UPSTASH_REDIS_REST_TOKEN
        self.enabled = bool(self.base_url and self.token)
        self.ttl = 86400

    def _make_key(self, message: str, session_context: str) -> str:
        content = f"{message}:{session_context}"
        hash_val = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"vidyaloop:cache:{hash_val}"

    async def get(self, message: str, session_context: str) -> str | None:
        if not self.enabled:
            return None
        key = self._make_key(message, session_context)
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.base_url}/get/{key}",
                    headers={"Authorization": f"Bearer {self.token}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result = data.get("result")
                    if result is not None:
                        return result
        except Exception:
            pass
        return None

    async def set(self, message: str, session_context: str, response: str):
        if not self.enabled:
            return
        key = self._make_key(message, session_context)
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f"{self.base_url}/set/{key}",
                    headers={"Authorization": f"Bearer {self.token}"},
                    json={"value": response, "ex": self.ttl},
                )
        except Exception:
            pass

    async def health(self) -> bool:
        """Ping Redis to verify connectivity."""
        if not self.enabled:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.base_url}/ping",
                    headers={"Authorization": f"Bearer {self.token}"},
                )
                return resp.status_code == 200
        except Exception:
            return False


cache_service = CacheService()
