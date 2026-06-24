import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles } from 'lucide-react'

const API_URL = 'http://localhost:8000'

/**
 * ChatWindow Component
 * 
 * The main interface where the student interacts with the AI tutor.
 * Handles fetching chat history, sending messages, and streaming responses
 * in real-time via Server-Sent Events (SSE).
 * 
 * Props:
 * - sessionId: The ID of the session to display
 * - onMessageSent: Callback triggered when a new message is successfully sent
 */
function ChatWindow({ sessionId, onMessageSent }) {
    // Stores the array of finalized messages (both user and assistant)
    const [messages, setMessages] = useState([])
    
    // Tracks if we are waiting for the backend to start sending data
    const [isLoading, setIsLoading] = useState(false)
    
    // Stores the chunk-by-chunk text as it streams in from Ollama
    const [streamingContent, setStreamingContent] = useState('')
    
    // Ref used to auto-scroll to the bottom of the chat
    const messagesEndRef = useRef(null)

    /**
     * Effect: Fetch Chat History
     * Runs whenever the `sessionId` changes. Replaces the current `messages`
     * array with the history pulled from the SQLite database.
     */
    useEffect(() => {
        if (!sessionId) return;
        fetch(`${API_URL}/session/${sessionId}/history`)
            .then(res => {
                if (!res.ok) throw new Error("Not found")
                return res.json()
            })
            .then(data => {
                setMessages(data.messages || [])
            })
            .catch(err => {
                console.log("New session or fetch error", err)
                setMessages([]) // Default to empty if it's a brand new session
            })
    }, [sessionId])

    /**
     * Effect: Auto-Scroll
     * Runs whenever `messages` or `streamingContent` changes, smoothly
     * scrolling the user to the bottom of the screen.
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingContent])

    /**
     * Handles sending a message to the backend and parsing the SSE stream.
     */
    async function sendMessage(userText) {
        // 1. Instantly display the user's message in the UI
        const userMessage = {
            role: 'user',
            content: userText
        }
        setMessages(prev => [...prev, userMessage])
        
        // 2. Set loading states
        setIsLoading(true)
        setStreamingContent('')

        try {
            // 3. Make POST request to the streaming endpoint
            const response = await fetch(`${API_URL}/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: userText,
                    student_name: 'Student',
                    class_level: 11,
                    learner_type: 'text'
                })
            })

            // 4. Set up the stream reader
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullText = ''

            // 5. Read chunks continuously until the stream finishes
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                // Parse the Server-Sent Events (SSE) format
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))

                            // If it's a token, append it to our ongoing string
                            if (data.type === 'token') {
                                fullText += data.text
                                setStreamingContent(fullText)
                            }

                            // If Ollama is done generating
                            if (data.type === 'done') {
                                // Add the fully formed message to the messages array
                                setMessages(prev => [...prev, {
                                    role: 'assistant',
                                    content: fullText
                                }])
                                // Clear the temporary streaming state
                                setStreamingContent('')
                                // Ping App.jsx so the Sidebar can update
                                if (onMessageSent) onMessageSent()
                            }

                        } catch (e) {
                            // Safely ignore malformed JSON chunks from the stream
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Error: Could not connect to tutor.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl relative">
            
            {/* Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Bot size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-medium tracking-wide">VidyaLoop</h1>
                        <p className="text-slate-400 text-xs">Socratic AI Assistant</p>
                    </div>
                </div>
            </div>

            {/* Scrollable Message Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto flex flex-col gap-6">
                    
                    {/* Empty State Welcome Screen */}
                    {messages.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-900/20 mb-6">
                                <Sparkles className="text-white" size={28} />
                            </div>
                            <h2 className="text-white text-2xl font-semibold mb-3">
                                How can I help you today?
                            </h2>
                            <p className="text-slate-400 max-w-md leading-relaxed">
                                Ask me anything about CBSE Physics, Chemistry, or Math. I will guide you to discover the answers yourself.
                            </p>
                        </motion.div>
                    )}

                    {/* Render existing messages with AnimatePresence for smooth mounting */}
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => (
                            <MessageBubble
                                key={index}
                                role={msg.role}
                                content={msg.content}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Render the currently streaming message (if any) */}
                    {streamingContent && (
                        <MessageBubble
                            role="assistant"
                            content={streamingContent}
                            isStreaming={true}
                        />
                    )}
                    
                    {/* Invisible div to scroll down to */}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Bottom Input Area */}
            <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent pt-10">
                <div className="max-w-3xl mx-auto relative">
                    
                    {/* "Thinking" indicator shown before the stream starts */}
                    {isLoading && !streamingContent && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -top-8 left-0 right-0 text-center text-xs text-blue-400/80 font-medium tracking-wide animate-pulse"
                        >
                            Tutor is thinking deeply...
                        </motion.div>
                    )}
                    
                    <InputBar onSend={sendMessage} disabled={isLoading} />
                </div>
            </div>
        </div>
    )
}

export default ChatWindow