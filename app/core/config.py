import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """
    Central configuration for the entire application.
    Reads from .env file — never hardcode these values anywhere else.
    
    Why this matters:
    - Development: Ollama runs at localhost:11434
    - Production: Ollama runs at some cloud server IP
    - You change ONE file (.env), everything updates automatically
    """

    # Ollama settings (Used by LLMService)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "phi4-mini")
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))
    CONTEXT_WINDOW: int = int(os.getenv("CONTEXT_WINDOW", "8192"))

    # App settings
    APP_NAME: str = "VidyaLoop Socratic Tutor"
    VERSION: str = "0.2.0"

# Single instance used across the entire app
settings = Settings()