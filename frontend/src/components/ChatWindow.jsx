import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

// Unique session ID for this browser session
// In production this will come from auth. For now, random string.
const SESSION_ID = 'session_' + Math.random().toString(36).substring(2, 9)
const API_URL = 'http://localhost:8000'

function ChatWindow() {
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [streamingContent, setStreamingContent] = useState('')
    const [hintCount, setHintCount] = useState(0)
    const messagesEndRef = useRef(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingContent])

    async function sendMessage(userText) {
        // Add user message to UI immediately
        const userMessage = {
            role: 'user',
            blocks: [{ type: 'text', content: userText }]
        }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)
        setStreamingContent('')

        try {
            /**
             * fetch() with streaming:
             * Instead of waiting for the full response,
             * we read the response body as a stream.
             * Each chunk is one SSE event from your FastAPI backend.
             */
            const response = await fetch(`${API_URL}/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: SESSION_ID,
                    message: userText,
                    student_name: 'Student',
                    class_level: 11
                })
            })

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullText = ''

            // Read the stream chunk by chunk
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                // Decode the binary chunk to text
                const chunk = decoder.decode(value)

                // SSE format: "data: {...}\n\n"
                // Split on double newline to get individual events
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))  // Remove "data: " prefix

                            if (data.token) {
                                // New token arrived — add to streaming display
                                fullText += data.token
                                setStreamingContent(fullText)
                            }

                            if (data.done) {
                                // Stream complete — move from streaming to messages list
                                setHintCount(data.hint_count)

                                // Fetch the structured blocks from the non-streaming endpoint
                                // OR parse here. For now use the full text as one text block.
                                const assistantMessage = {
                                    role: 'assistant',
                                    blocks: [{ type: 'text', content: fullText }]
                                }
                                setMessages(prev => [...prev, assistantMessage])
                                setStreamingContent('')
                            }

                        } catch (e) {
                            // Ignore malformed SSE lines
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                blocks: [{ type: 'text', content: 'Error: Could not connect to tutor.' }]
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 
                      border-b border-slate-700 bg-slate-900">
                <div>
                    <h1 className="text-white font-semibold text-lg">VidyaLoop Tutor</h1>
                    <p className="text-slate-400 text-xs">CBSE Class 11 · Socratic Method</p>
                </div>
                {hintCount > 0 && (
                    <div className="bg-slate-800 px-3 py-1 rounded-full">
                        <span className="text-slate-400 text-xs">
                            Hint {hintCount}/5
                        </span>
                    </div>
                )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">

                {/* Welcome message */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center 
                          h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center 
                            justify-center text-white text-2xl font-bold mb-4">
                            VL
                        </div>
                        <h2 className="text-white text-xl font-semibold mb-2">
                            Hello, Student
                        </h2>
                        <p className="text-slate-400 text-sm max-w-sm">
                            Ask me anything from your CBSE syllabus.
                            I will guide you to the answer — not give it to you.
                        </p>
                    </div>
                )}

                {/* Rendered messages */}
                {messages.map((msg, index) => (
                    <MessageBubble
                        key={index}
                        role={msg.role}
                        blocks={msg.blocks}
                        isStreaming={false}
                    />
                ))}

                {/* Currently streaming response */}
                {streamingContent && (
                    <MessageBubble
                        role="assistant"
                        blocks={[{ type: 'text', content: streamingContent }]}
                        isStreaming={true}
                    />
                )}

                {/* Loading indicator before first token arrives */}
                {isLoading && !streamingContent && (
                    <div className="flex justify-start mb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center 
                            justify-center text-white text-xs font-bold mr-3">
                            VL
                        </div>
                        <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                    style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                    style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                    style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Invisible div at the bottom — scroll target */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <InputBar onSend={sendMessage} disabled={isLoading} />
        </div>
    )
}

export default ChatWindow
