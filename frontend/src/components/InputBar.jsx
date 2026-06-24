import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * InputBar Component
 * 
 * The bottom bar where the student types their message.
 * Features an auto-expanding textarea that grows as the user types
 * multi-line paragraphs, up to a maximum height.
 * 
 * Props:
 * - onSend: Function to call when the user submits a message
 * - disabled: Boolean indicating if the input should be locked (e.g., while AI is typing)
 */
function InputBar({ onSend, disabled }) {
    const [text, setText] = useState('')
    const textareaRef = useRef(null)

    // Auto-resize textarea effect
    // This runs every time the `text` state changes
    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to correctly measure shrinking text
            textareaRef.current.style.height = 'auto'
            // Set the height to the scrollHeight (actual content height), capped at 200px
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
        }
    }, [text])

    /**
     * Handles the actual submission of the message.
     */
    function handleSubmit() {
        const trimmed = text.trim()
        if (!trimmed || disabled) return

        onSend(trimmed)
        setText('')
        // Reset textarea back to single line height after sending
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    /**
     * Listens for the Enter key to submit, while allowing Shift+Enter for newlines.
     */
    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault() // Prevent the default newline insertion
            handleSubmit()
        }
    }

    return (
        <div className="relative flex items-end gap-2 p-2 bg-slate-800 border border-slate-700/50 rounded-2xl shadow-xl shadow-black/20 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all">
            <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-slate-100 px-4 py-3 
                   resize-none outline-none placeholder-slate-500 text-base"
                placeholder="Message VidyaLoop..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={disabled}
            />
            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={disabled || !text.trim()}
                className="p-3 mb-1 mr-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700/50 
                   disabled:cursor-not-allowed text-white transition-all"
            >
                <ArrowUp size={20} strokeWidth={2.5} />
            </button>
        </div>
    )
}

export default InputBar