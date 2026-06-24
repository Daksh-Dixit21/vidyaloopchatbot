# VidyaLoop Socratic Tutor

VidyaLoop Tutor is a Socratic AI tutoring chatbot designed for CBSE students. It uses a Python FastAPI backend and a React frontend, powered by the local `phi4-mini` model running via Ollama. It guides students through problems without directly giving them the answers, until they have worked through 5 hints.

## Prerequisites
- Python 3.10+
- Node.js (v18+ recommended)
- [Ollama](https://ollama.com/)

## 1. Start Ollama and the Model
Download and install Ollama, then run the following command to download and start the local `phi4-mini` model:
```bash
ollama run phi4-mini
```

## 2. Backend Setup (FastAPI)
Open a terminal in the root directory of the project and set up the Python virtual environment:

```bash
# Create the virtual environment
python -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install the required dependencies
pip install -r requirements.txt
```

Start the FastAPI development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 3. Frontend Setup (React)
Open a new terminal, navigate to the `frontend` directory, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

The React app will be available at the URL provided by Vite (usually `http://localhost:5173`).

## API Endpoints

- **`GET /`**  
  Health check endpoint to verify the API is running.

- **`GET /stats`**  
  Returns usage statistics for sessions and messages from the storage service.

- **`POST /chat`**  
  Send a message to the tutor and receive a full, non-streaming response. Expects a JSON body with `session_id`, `message`, and optionally `student_name`, `class_level`, and `learner_type`.

- **`POST /chat/stream`**  
  Send a message to the tutor and receive a streaming Server-Sent Events (SSE) response.

- **`GET /session/{session_id}/history`**  
  Retrieve the full conversation history for a given session ID.

- **`DELETE /session/{session_id}`**  
  End the session and free up the LLM context from memory.
