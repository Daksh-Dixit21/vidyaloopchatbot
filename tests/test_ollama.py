import sys
sys.path.append('/home/saisi/Dev/vidyaloop-chatbot')

from app.services.llm import LLMService

if __name__ == "__main__":
    tutor = LLMService()
    print("Socratic Tutor ready. Type 'quit' to exit.\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "quit":
            break
        reply = tutor.chat(user_input)
        print(f"\nTutor: {reply}\n")