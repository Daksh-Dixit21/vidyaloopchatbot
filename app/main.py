from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.llm import LLMService
from app.services.storage import storage
from app.services.parser import parse_response
from app.models.student import StudentProfile
from app.models.storage import Session, Message
from app.core.prompts import get_system_prompt
from app.core.config import settings
import requests
import json

app = FastAPI(
    title="VidyaLoop Socratic Tutor API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM instances still in memory — only the conversation
# engine, not the data. Data goes through storage service.
llm_sessions: dict[str, LLMService] = {}


class ChatRequest(BaseModel):
    session_id: str
    message: str
    student_name: str = "Student"
    class_level: int = 11
    learner_type: str = "text"


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    blocks: list[dict]
    hint_count: int


@app.get("/")
def root():
    return {"status": "VidyaLoop Tutor API is running"}


@app.get("/stats")
def get_stats():
    """Returns system stats — active sessions, total messages."""
    return storage.get_stats()


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # Create session in storage if new
    if request.session_id not in llm_sessions:
        profile = StudentProfile(
            name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type
        )
        llm_sessions[request.session_id] = LLMService(profile=profile)

        # Also create in storage service
        session = Session(
            session_id=request.session_id,
            student_name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type
        )
        storage.create_session(session)

    tutor = llm_sessions[request.session_id]

    # Store the student's message
    storage.add_message(Message(
        session_id=request.session_id,
        role="user",
        content=request.message,
        hint_count=tutor.profile.hint_count
    ))

    # Get response
    reply = tutor.chat(request.message)
    blocks = parse_response(reply)

    # Store the tutor's response
    storage.add_message(Message(
        session_id=request.session_id,
        role="assistant",
        content=reply,
        blocks=[b.to_dict() for b in blocks],
        hint_count=tutor.profile.hint_count
    ))

    return ChatResponse(
        session_id=request.session_id,
        reply=reply,
        blocks=[b.to_dict() for b in blocks],
        hint_count=tutor.profile.hint_count
    )


@app.get("/session/{session_id}/history")
def get_history(session_id: str):
    """
    Returns full conversation history for a session.
    The frontend will call this to restore a conversation.
    """
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = storage.get_messages(session_id)
    return {
        "session_id": session_id,
        "student_name": session.student_name,
        "class_level": session.class_level,
        "started_at": session.started_at.isoformat(),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "blocks": m.blocks,
                "hint_count": m.hint_count,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }


@app.delete("/session/{session_id}")
def end_session(session_id: str):
    storage.end_session(session_id)
    if session_id in llm_sessions:
        del llm_sessions[session_id]
    return {"status": "session ended"}


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    if request.session_id not in llm_sessions:
        profile = StudentProfile(
            name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type
        )
        llm_sessions[request.session_id] = LLMService(profile=profile)
        session = Session(
            session_id=request.session_id,
            student_name=request.student_name,
            class_level=request.class_level,
            learner_type=request.learner_type
        )
        storage.create_session(session)

    tutor = llm_sessions[request.session_id]

    # Store student message immediately
    storage.add_message(Message(
        session_id=request.session_id,
        role="user",
        content=request.message,
        hint_count=tutor.profile.hint_count
    ))

    def generate():
        is_followup = request.message.lower() in [
            "i don't know", "idk", "no idea",
            "i dont know", "?", "don't know"
        ]

        if not is_followup:
            tutor.profile.new_concept(request.message)

        tutor.conversation_history.append({
            "role": "user",
            "content": request.message
        })

        system_prompt = get_system_prompt(
            profile=tutor.profile,
            hint_count=tutor.profile.hint_count,
            should_reveal=tutor.profile.should_reveal()
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ] + tutor.conversation_history

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
                        yield f"data: {json.dumps({'token': token})}\n\n"

            tutor.conversation_history.append({
                "role": "assistant",
                "content": full_response
            })
            tutor.profile.increment_hint()

            # Parse and store the complete response
            blocks = parse_response(full_response)
            storage.add_message(Message(
                session_id=request.session_id,
                role="assistant",
                content=full_response,
                blocks=[b.to_dict() for b in blocks],
                hint_count=tutor.profile.hint_count
            ))

            yield f"data: {json.dumps({'done': True, 'hint_count': tutor.profile.hint_count})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")