from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.llm import LLMService
from app.models.student import StudentProfile
from app.core.prompts import get_system_prompt
from app.core.config import settings
import requests
import json

app = FastAPI(
    title="VidyaLoop Socratic Tutor API",
    version="0.1.0"
)

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


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    """
    Streaming endpoint — returns tokens as they are generated.
    Uses Server-Sent Events (SSE) format.
    
    Each event is: data: {"token": "..."}\n\n
    Final event is: data: {"done": true, "hint_count": N}\n\n
    """
    if request.session_id not in sessions:
        profile = StudentProfile(
            name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type
        )
        sessions[request.session_id] = LLMService(profile=profile)

    tutor = sessions[request.session_id]

    def generate():
        # Detect new concept vs follow-up
        is_followup = request.message.lower() in [
            "i don't know", "idk", "no idea",
            "i dont know", "?", "don't know"
        ]

        if not is_followup:
            tutor.profile.new_concept(request.message)

        # Add user message to history
        tutor.conversation_history.append({
            "role": "user",
            "content": request.message
        })

        # Build prompt with current hint state
        system_prompt = get_system_prompt(
            profile=tutor.profile,
            hint_count=tutor.profile.hint_count,
            should_reveal=tutor.profile.should_reveal()
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ] + tutor.conversation_history

        # Call Ollama with stream=True
        # requests.post(..., stream=True) keeps the connection open
        # and lets us read line by line as tokens arrive
        try:
            response = requests.post(
                settings.OLLAMA_URL,
                json={
                    "model": settings.MODEL_NAME,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": settings.TEMPERATURE,
                        "num_ctx": settings.CONTEXT_WINDOW
                    }
                },
                stream=True,
                timeout=120
            )

            full_response = ""

            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode("utf-8"))

                    if not data.get("done", False):
                        token = data["message"]["content"]
                        full_response += token

                        # Send token to client in SSE format
                        yield f"data: {json.dumps({'token': token})}\n\n"

            # Streaming complete — update history and hint count
            tutor.conversation_history.append({
                "role": "assistant",
                "content": full_response
            })
            tutor.profile.increment_hint()

            # Send completion event
            yield f"data: {json.dumps({'done': True, 'hint_count': tutor.profile.hint_count})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.delete("/session/{session_id}")
def end_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "session ended"}
    return {"status": "session not found"}