"""
Large Language Model (LLM) Service.
This module handles all communication with the local Ollama instance.
It is entirely stateless—it does not store chat history in memory. 
Instead, it fetches the full history from the database on every request.
"""

import httpx
import json
from app.core.config import settings
from app.core.prompts import build_system_prompt
from app.services.storage import storage
from app.models.storage import Message

class LLMService:
    """
    Service class responsible for generating AI responses using Ollama.
    """
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def get_response_stream(self, session_id: str, student_message: str):
        """
        An asynchronous generator that streams text chunks from Ollama.
        
        Args:
            session_id: The ID of the current chat session.
            student_message: The text submitted by the user.
            
        Yields:
            Server-Sent Events (SSE) formatted strings containing JSON data.
        """
        # 1. Fetch the session and all previous messages from the SQLite database
        session = storage.get_session(session_id)
        if not session:
            yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
            return
            
        messages = storage.get_messages(session_id)
        
        # 2. Build the dynamic system prompt (injects the student's name, class, etc.)
        system_prompt = build_system_prompt(session)
        
        # 3. Construct the exact message array that Ollama expects
        ollama_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            ollama_messages.append({"role": msg.role, "content": msg.content})
            
        # Add the brand new user message to the array
        ollama_messages.append({"role": "user", "content": student_message})
        
        # 4. Save the user's message to the database immediately
        storage.add_message(Message(
            session_id=session_id,
            role="user",
            content=student_message
        ))

        # 5. Configure the Ollama API request payload
        payload = {
            "model": self.model,
            "messages": ollama_messages,
            "stream": True,
            "options": {
                "temperature": 0.7
            }
        }
        
        full_response = ""
        
        # 6. Make an asynchronous, non-blocking HTTP request to Ollama
        async with httpx.AsyncClient() as client:
            try:
                # Use stream() to receive chunks as Ollama generates them
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload, timeout=httpx.Timeout(60.0)) as response:
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            
                            # If we received a text chunk
                            if "message" in data and "content" in data["message"]:
                                chunk = data["message"]["content"]
                                full_response += chunk
                                
                                # Yield the chunk to the FastAPI endpoint, which forwards it to the React frontend
                                yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
                                
                            # If the generation is completely finished
                            if data.get("done", False):
                                # Save the final, complete AI response to the database
                                storage.add_message(Message(
                                    session_id=session_id,
                                    role="assistant",
                                    content=full_response
                                ))
                                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                                
                        except json.JSONDecodeError:
                            # Safely ignore corrupted JSON chunks
                            continue
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

# Singleton instance exported for use in main.py
llm_service = LLMService()