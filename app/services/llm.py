import requests
from app.core.prompts import get_system_prompt
from app.core.config import settings


class LLMService:
    def __init__(self):
        self.model = settings.MODEL_NAME
        self.temperature = settings.TEMPERATURE
        self.ollama_url = settings.OLLAMA_URL
        self.conversation_history = []
        self.system_prompt = get_system_prompt()

    def chat(self, user_message: str) -> str:
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        messages = [
            {"role": "system", "content": self.system_prompt}
        ] + self.conversation_history

        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                        "num_ctx": settings.CONTEXT_WINDOW
                    }
                },
                timeout=120
            )
            response.raise_for_status()

        except requests.exceptions.ConnectionError:
            return "Error: Cannot connect to Ollama. Is it running?"
        except requests.exceptions.Timeout:
            return "Error: Model took too long to respond."
        except requests.exceptions.HTTPError as e:
            return f"Error: Ollama returned {e.response.status_code}"

        assistant_reply = response.json()["message"]["content"]

        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_reply
        })

        return assistant_reply

    def reset(self):
        self.conversation_history = []

    def get_history(self) -> list:
        return self.conversation_history