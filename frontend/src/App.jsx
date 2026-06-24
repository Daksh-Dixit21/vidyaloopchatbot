import { useState, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import Sidebar from './components/Sidebar'

/**
 * App Component
 * 
 * This is the root component of the React application.
 * It manages the global state for the chat history, including the list of 
 * all past sessions fetched from the SQLite database, and the currently active session.
 */
function App() {
  // The ID of the currently selected chat session
  const [sessionId, setSessionId] = useState(null)
  
  // The list of all past sessions to display in the Sidebar
  const [sessions, setSessions] = useState([])

  /**
   * Fetches the list of all past sessions from the FastAPI backend.
   * If there's no active session yet, it auto-selects the most recent one,
   * or creates a new random session ID if the database is completely empty.
   */
  const fetchSessions = () => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://vidyaloop-chatbot.onrender.com'}/sessions`)
      .then(res => res.json())
      .then(data => {
        setSessions(data)
        // Auto-select session on initial load
        if (!sessionId) {
          if (data.length > 0) {
            setSessionId(data[0].session_id)
          } else {
            // Generate a secure pseudo-random string for a brand new session
            const newId = 'session_' + Math.random().toString(36).substr(2, 9)
            setSessionId(newId)
          }
        }
      })
      .catch(err => console.error("Could not fetch sessions", err))
  }

  // Fetch sessions once when the application first loads
  useEffect(() => {
    fetchSessions()
  }, [])

  /**
   * Generates a new random session ID to start a fresh conversation.
   * Clicking "New Chat" in the sidebar triggers this.
   */
  function handleNewChat() {
    const newId = 'session_' + Math.random().toString(36).substr(2, 9)
    setSessionId(newId)
  }

  /**
   * Deletes a session permanently from the backend and updates the UI.
   */
  async function handleDeleteSession(idToDelete) {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'https://vidyaloop-chatbot.onrender.com'}/session/${idToDelete}`, { method: 'DELETE' })
      const updatedSessions = sessions.filter(s => s.session_id !== idToDelete)
      setSessions(updatedSessions)
      
      // If we deleted the active session, pick a new one or create a new chat
      if (sessionId === idToDelete) {
        if (updatedSessions.length > 0) {
          setSessionId(updatedSessions[0].session_id)
        } else {
          handleNewChat()
        }
      }
    } catch (err) {
      console.error("Could not delete session", err)
    }
  }

  // Show a loading screen while we wait for the initial backend fetch
  if (!sessionId) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Left Sidebar: Displays chat history and 'New Chat' button */}
      <Sidebar 
        sessions={sessions} 
        currentSessionId={sessionId} 
        onSelectSession={setSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ChatWindow 
          // The `key` prop is a React trick. By changing the key when `sessionId` changes, 
          // React completely unmounts and remounts the ChatWindow, ensuring it starts fresh.
          key={sessionId} 
          sessionId={sessionId} 
          // When a new message is sent, we ping the backend to update the sidebar session list 
          // (to update message counts or move it to the top).
          onMessageSent={fetchSessions} 
        />
      </div>
    </div>
  )
}

export default App