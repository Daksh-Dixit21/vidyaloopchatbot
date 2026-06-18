import { useState } from 'react'

/**
 * InputBar — the text input and send button at the bottom.
 *
 * Props:
 * - onSend(message): called when student submits a message
 * - disabled: true while waiting for a response (prevents double-send)
 */
function InputBar({ onSend, disabled }) {
    const [text, setText] = useState('')

    function handleSubmit() {
        // Don't send empty messages
        const trimmed = text.trim()
        if (!trimmed || disabled) return

        onSend(trimmed)   // Tell the parent a message was submitted
        setText('')        // Clear the input
    }

    function handleKeyDown(e) {
        // Send on Enter key (but not Shift+Enter — that adds a newline)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div className="flex gap-2 p-4 border-t border-slate-700 bg-slate-900">
            <textarea
                className="flex-1 bg-slate-800 text-slate-100 rounded-xl px-4 py-3 
                   resize-none outline-none border border-slate-700 
                   focus:border-blue-500 transition-colors
                   placeholder-slate-500 text-sm"
                placeholder="Ask a question..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={disabled}
            />
            <button
                onClick={handleSubmit}
                disabled={disabled || !text.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 
                   disabled:cursor-not-allowed text-white rounded-xl px-5 py-3 
                   text-sm font-medium transition-colors"
            >
                {disabled ? '...' : 'Send'}
            </button>
        </div>
    )
}

export default InputBar