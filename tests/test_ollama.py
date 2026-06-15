import sys
sys.path.append('/home/saisi/Dev/vidyaloop-chatbot')

from app.services.llm import LLMService
from app.models.student import StudentProfile

if __name__ == "__main__":
    # Try changing these values and see how the tutor changes
    profile = StudentProfile(
        name="Arjun",
        class_level=11,
        learner_type="math",
        math_depth="deep",
        frustration_level=0.1
    )

    tutor = LLMService(profile=profile)
    print(f"Socratic Tutor ready for {profile.name}. Type 'quit' to exit.\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "quit":
            break
        reply = tutor.chat(user_input)
        print(f"\nTutor: {reply}\n")