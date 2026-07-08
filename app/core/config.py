import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """
    Central configuration for the entire application.
    Reads from .env file — never hardcode these values anywhere else.
    """

    # Ollama settings (Used by LLMService)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "phi4-mini")

    # Groq API settings
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instruct")

    # Supabase PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Upstash Redis
    UPSTASH_REDIS_REST_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
    UPSTASH_REDIS_REST_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

    # General settings
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))
    CONTEXT_WINDOW: int = int(os.getenv("CONTEXT_WINDOW", "8192"))
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")

    # Rate limiting (buffer below Groq free tier: 30 RPM / 1000 RPD)
    RATE_LIMIT_RPM: int = int(os.getenv("RATE_LIMIT_RPM", "28"))
    RATE_LIMIT_RPD: int = int(os.getenv("RATE_LIMIT_RPD", "900"))

    # App metadata
    APP_NAME: str = "VidyaLoop Socratic Tutor"
    VERSION: str = "0.3.0"

settings = Settings()