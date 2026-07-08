import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, X, Reply, User, Sparkles as SparklesIcon } from 'lucide-react'

const MAX_CHARS = 2000

function InputBar({ onSend, disabled, conversationId, replyTo, onCancelReply }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 130) + 'px'
    }
  }, [text])

  useEffect(() => {
    setText('')
  }, [conversationId])

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [replyTo])

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, [])
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const hasContent = text.trim().length > 0
  const isMultiLine = text.includes('\n') || text.length > 60
  const remaining = MAX_CHARS - text.length
  const nearLimit = remaining < 200

  return (
    <div
      className={`flex flex-col gap-0 transition-all duration-300 overflow-hidden ${isMultiLine || replyTo ? 'rounded-2xl' : 'rounded-full'}`}
      style={{
        background: 'linear-gradient(135deg, rgba(28,21,40,0.97) 0%, rgba(20,14,32,0.93) 100%)',
        border: hasContent || replyTo ? '1px solid rgba(0,255,198,0.22)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: hasContent || replyTo
          ? '0 0 0 1px rgba(0,255,198,0.06), 0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(0,255,198,0.07)'
          : '0 4px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Reply quote preview ── */}
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-2 px-3 pt-2.5 pb-1"
        >
          <div
            className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5"
            style={{ background: 'rgba(0,255,198,0.1)', border: '1px solid rgba(0,255,198,0.2)' }}
          >
            <Reply size={10} className="text-[#00ffc6]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {replyTo.role === 'tutor'
                ? <SparklesIcon size={9} className="text-[#00ffc6]/60" />
                : <User size={9} className="text-white/40" />
              }
              <span className="text-[9px] font-semibold" style={{ color: replyTo.role === 'tutor' ? 'rgba(0,255,198,0.7)' : 'rgba(255,255,255,0.5)' }}>
                {replyTo.role === 'tutor' ? 'AI Tutor' : 'You'}
              </span>
            </div>
            <p className="text-[11px] text-white/35 leading-snug truncate">
              {replyTo.content?.slice(0, 100)}{replyTo.content?.length > 100 ? '...' : ''}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={10} className="text-white/40" />
          </button>
        </motion.div>
      )}

      {/* ── Input row ── */}
      <div className={`flex items-end gap-2 md:gap-3 ${replyTo ? 'px-2.5 pb-2' : 'p-2 md:p-2.5'}`}>
        {/* AI sparkle icon */}
        <div
          className="flex-shrink-0 mb-0.5 w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,255,198,0.07)', border: '1px solid rgba(0,255,198,0.1)' }}
        >
          <Sparkles size={13} className="text-[#00ffc6]/60" />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent px-1 md:px-2 py-1.5 resize-none outline-none text-sm md:text-[13px] leading-relaxed placeholder:text-white/25 text-white/85 max-h-[130px] custom-scrollbar"
          placeholder={replyTo ? 'Type your reply...' : 'Ask anything about this topic...'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          maxLength={MAX_CHARS}
        />

        {/* Char count */}
        {nearLimit && text.length > 0 && (
          <span
            className="flex-shrink-0 text-[9px] font-mono mb-1.5 self-end"
            style={{ color: remaining < 50 ? '#ff3366' : 'rgba(255,255,255,0.25)' }}
          >
            {remaining}
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !hasContent}
          className={`flex-shrink-0 mb-0.5 p-2 md:p-2.5 rounded-xl send-btn ${hasContent ? 'cursor-pointer' : 'cursor-not-allowed disabled'}`}
        >
          <Send size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

export default InputBar
