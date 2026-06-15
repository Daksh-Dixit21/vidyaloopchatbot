from fastapi import FastAPI
from pydantic import BaseModel
from app.services.llm import LLMService
from app.models.student import StudentProfile

app = FastAPI(
    title="VidyaLoop Socratic Tutor API",
    version="0.1.0"
)

# In-memory session storage for now
# Each session_id maps to its own LLMService instance
sessions: dict[str, LLMService] = {}


class ChatRequest(BaseModel):
    session_id: str
    message: str
    student_name: str = "Student"
    class_level: int = 11
    learner_type: str = "text"


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    hint_count: int


@app.get("/")
def root():
    return {"status": "VidyaLoop Tutor API is running"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # Create new session if it doesn't exist
    if request.session_id not in sessions:
        profile = StudentProfile(
            name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type
        )
        sessions[request.session_id] = LLMService(profile=profile)

    tutor = sessions[request.session_id]
    reply = tutor.chat(request.message)

    return ChatResponse(
        session_id=request.session_id,
        reply=reply,
        hint_count=tutor.profile.hint_count
    )


@app.delete("/session/{session_id}")
def end_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "session ended"}
    return {"status": "session not found"}