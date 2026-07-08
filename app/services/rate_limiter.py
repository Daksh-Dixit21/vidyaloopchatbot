"""
Rate Limiter Service.

Enforces two layers of rate limiting to stay within Groq's free tier:
1. RPM (requests-per-minute) — in-memory sliding window
2. RPD (requests-per-day) — persisted via Supabase rate_limits table

Configurable buffer ensures we never hit 429 from Groq.
"""

import time
from collections import defaultdict
from datetime import date
from sqlalchemy import text
from app.core.config import settings
from app.database import has_postgres, AsyncSessionLocal, SessionLocal


class RateLimiter:
    """
    Two-layer rate limiter: in-memory RPM + persisted RPD.
    """

    def __init__(self):
        self.rpm_limit = settings.RATE_LIMIT_RPM
        self.rpd_limit = settings.RATE_LIMIT_RPD
        self.window_seconds = 60
        self._minute_log: list[float] = []

    # --- RPM (in-memory, per-process) ---

    def check_rpm(self) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        self._minute_log = [t for t in self._minute_log if t > cutoff]
        return len(self._minute_log) < self.rpm_limit

    def record_rpm(self):
        self._minute_log.append(time.time())

    def rpm_remaining(self) -> int:
        cutoff = time.time() - self.window_seconds
        self._minute_log = [t for t in self._minute_log if t > cutoff]
        return max(0, self.rpm_limit - len(self._minute_log))

    def rpm_used(self) -> int:
        cutoff = time.time() - self.window_seconds
        self._minute_log = [t for t in self._minute_log if t > cutoff]
        return len(self._minute_log)

    # --- RPD (persisted via database) ---

    async def check_rpd(self) -> bool:
        if not has_postgres:
            return True
        today = date.today()
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT request_count FROM rate_limits WHERE date = :d"),
                {"d": today},
            )
            row = result.fetchone()
            count = row[0] if row else 0
            return count < self.rpd_limit

    async def increment_rpd(self):
        if not has_postgres:
            return
        today = date.today()
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO rate_limits (date, request_count) VALUES (:d, 1)
                    ON CONFLICT (date) DO UPDATE SET request_count = rate_limits.request_count + 1
                """),
                {"d": today},
            )
            await db.commit()

    async def rpd_remaining(self) -> int:
        if not has_postgres:
            return self.rpd_limit
        today = date.today()
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT request_count FROM rate_limits WHERE date = :d"),
                {"d": today},
            )
            row = result.fetchone()
            count = row[0] if row else 0
            return max(0, self.rpd_limit - count)

    async def can_proceed(self) -> tuple[bool, str]:
        """
        Returns (allowed, reason_if_blocked).
        Checks both RPM and RPD.
        """
        if not self.check_rpm():
            return False, "RPM limit reached"
        if not await self.check_rpd():
            return False, "RPD limit reached"
        return True, ""

    async def record(self):
        """Call after a successful LLM request."""
        self.record_rpm()
        await self.increment_rpd()

    async def status(self) -> dict:
        """Returns current rate limit state for /health endpoint."""
        return {
            "rpm_used": self.rpm_used(),
            "rpm_limit": self.rpm_limit,
            "rpm_remaining": self.rpm_remaining(),
            "rpd_remaining": await self.rpd_remaining(),
            "rpd_limit": self.rpd_limit,
        }


rate_limiter = RateLimiter()
