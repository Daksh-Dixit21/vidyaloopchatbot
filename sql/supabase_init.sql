-- ============================================================
-- VidyaLoop Supabase PostgreSQL Schema
-- ============================================================
-- Run this entire script in the Supabase SQL Editor once.
-- This sets up sessions, messages, rate limiting, and queue tables.

-- 1. Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id    TEXT PRIMARY KEY,
    student_name  TEXT NOT NULL,
    class_level   INTEGER NOT NULL,
    learner_type  TEXT DEFAULT 'text',
    started_at    TIMESTAMP DEFAULT NOW(),
    ended_at      TIMESTAMP,
    is_active     BOOLEAN DEFAULT TRUE
);

-- 2. Messages table
CREATE TABLE IF NOT EXISTS messages (
    message_id  TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    hint_count  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(session_id, created_at ASC);

-- 3. Rate limiting tracker (keeps daily request count)
CREATE TABLE IF NOT EXISTS rate_limits (
    id            SERIAL PRIMARY KEY,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    UNIQUE(date)
);

-- 4. Request queue (fallback when rate limited)
CREATE TABLE IF NOT EXISTS request_queue (
    id            SERIAL PRIMARY KEY,
    session_id    TEXT NOT NULL,
    message       TEXT NOT NULL,
    student_name  TEXT DEFAULT 'Student',
    class_level   INTEGER DEFAULT 11,
    learner_type  TEXT DEFAULT 'text',
    status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at    TIMESTAMP DEFAULT NOW(),
    processed_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON request_queue(status, created_at);

-- 5. Cache table (optional fallback if Upstash is unavailable)
CREATE TABLE IF NOT EXISTS response_cache (
    cache_key     TEXT PRIMARY KEY,
    response      TEXT NOT NULL,
    session_id    TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON response_cache(expires_at);
