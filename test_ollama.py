import requests
from prompts import get_system_prompt

conversation_history = []

def chat(user_message: str) -> str:
    # Add student message to history
    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    # Build full message list: system prompt + entire history
    messages = [{"role": "system", "content": get_system_prompt()}] + conversation_history

    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": "phi4-mini",
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.3}
        }
    )

    assistant_reply = response.json()["message"]["content"]

    # Add model's reply to history so next turn remembers it
    conversation_history.append({
        "role": "assistant",
        "content": assistant_reply
    })

    return assistant_reply

if __name__ == "__main__":
    print("Socratic Tutor ready. Type 'quit' to exit.\n")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "quit":
            break
        reply = chat(user_input)
        print(f"\nTutor: {reply}\n")
