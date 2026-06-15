import requests
from app.core.prompts import get_system_prompt
from app.core.config import settings
from app.models.student import StudentProfile


class LLMService:
    def __init__(self, profile: StudentProfile = None):
        self.model = settings.MODEL_NAME
        self.temperature = settings.TEMPERATURE
        self.ollama_url = settings.OLLAMA_URL
        self.conversation_history = []
        self.profile = profile or StudentProfile()

    def chat(self, user_message: str) -> str:
        # Detect if this is a new concept or a follow-up
        # Simple heuristic: if message ends with ? or is long, it's a new concept
        is_new_concept = (
            len(user_message.split()) > 3 or
            self.profile.hint_count == 0
        )

        if is_new_concept and user_message.lower() not in ["i don't know", "idk", "no idea", "i dont know", "?"]:
            self.profile.new_concept(user_message)

        # Add student message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        # Build system prompt with current hint state injected
        system_prompt = get_system_prompt(
            profile=self.profile,
            hint_count=self.profile.hint_count,
            should_reveal=self.profile.should_reveal()
        )

        messages = [
            {"role": "system", "content": system_prompt}
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

        # Increment hint count AFTER getting response
        self.profile.increment_hint()

        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_reply
        })

        return assistant_reply

    def update_frustration(self, level: float):
        self.profile.frustration_level = max(0.0, min(1.0, level))

    def reset(self):
        self.conversation_history = []
        self.profile.hint_count = 0

    def get_history(self) -> list:
        return self.conversation_history