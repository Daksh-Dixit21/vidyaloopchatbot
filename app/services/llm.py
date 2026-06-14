import requests
from app.core.prompts import get_system_prompt


class LLMService:
    """
    Handles all communication with the local Ollama inference server.
    
    Responsibilities:
    - Sending messages to phi4-mini
    - Managing conversation history
    - Applying the system prompt
    - Handling errors from Ollama
    """

    def __init__(self, model: str = "phi4-mini", temperature: float = 0.3):
        self.model = model
        self.temperature = temperature
        self.ollama_url = "http://localhost:11434/api/chat"
        self.conversation_history = []
        self.system_prompt = get_system_prompt()

    def chat(self, user_message: str) -> str:
        """
        Sends a message and returns the model's response.
        Automatically maintains conversation history.
        """
        # Add student message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        # Build full message list
        messages = [
            {"role": "system", "content": self.system_prompt}
        ] + self.conversation_history

        # Call Ollama
        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature
                    }
                },
                timeout=120  # 2 minutes max — slow on CPU fallback
            )
            response.raise_for_status()

        except requests.exceptions.ConnectionError:
            return "Error: Cannot connect to Ollama. Is it running?"
        except requests.exceptions.Timeout:
            return "Error: Model took too long to respond."
        except requests.exceptions.HTTPError as e:
            return f"Error: Ollama returned {e.response.status_code}"

        assistant_reply = response.json()["message"]["content"]

        # Add reply to history
        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_reply
        })

        return assistant_reply

    def reset(self):
        """Clears conversation history. Call this to start a new session."""
        self.conversation_history = []

    def get_history(self) -> list:
        """Returns the full conversation history."""
        return self.conversation_history