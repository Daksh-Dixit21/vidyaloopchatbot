import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, ImagePlus, X, Reply, User, Sparkles as SparklesIcon } from 'lucide-react'

const MAX_CHARS = 2000

function InputBar({ onSend, disabled, conversationId, replyTo, onCancelReply }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState([]) // [{ url, name }]
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 130) + 'px'
    }
  }, [text])

  useEffect(() => {
    setText('')
    setImages([])
  }, [conversationId])

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [replyTo])

  function handleImageChange(e) {
    const files = Array.from(e.target.files)
    const maxImages = 4
    const remaining = maxImages - images.length
    files.slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = ev => {
        setImages(prev => [...prev, { url: ev.target.result, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    const trimmed = text.trim()
    if ((!trimmed && images.length === 0) || disabled) return
    onSend(trimmed, images)
    setText('')
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  function handleDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    const remaining = 4 - images.length
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setImages(prev => [...prev, { url: ev.target.result, name: file.name }])
      reader.readAsDataURL(file)
    })
  }

  function handleDragOver(e) { e.preventDefault() }

  const hasContent = text.trim().length > 0 || images.length > 0
  const isMultiLine = text.includes('\n') || text.length > 60 || images.length > 0
  const remaining = MAX_CHARS - text.length
  const nearLimit = remaining < 200

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
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

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap px-3 pt-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group flex-shrink-0">
              <img
                src={img.url}
                alt={img.name}
                className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl"
                style={{ border: '1px solid rgba(0,255,198,0.18)' }}
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: '#ff3366', boxShadow: '0 2px 8px rgba(255,51,102,0.5)' }}
              >
                <X size={10} className="text-white" />
              </button>
              <div className="absolute bottom-0 inset-x-0 rounded-b-xl px-1 py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                <span className="text-[7px] text-white/60 truncate block">{img.name}</span>
              </div>
            </div>
          ))}
          {images.length < 4 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
              style={{
                background: 'rgba(0,255,198,0.04)',
                border: '1.5px dashed rgba(0,255,198,0.2)',
                color: 'rgba(0,255,198,0.5)',
              }}
            >
              <ImagePlus size={14} />
              <span className="text-[8px]">Add more</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom row: icon + textarea + buttons */}
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
          placeholder={replyTo ? 'Type your reply...' : images.length > 0 ? 'Add a caption or question...' : 'Ask anything about this topic...'}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageChange}
        />

        {/* Image upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || images.length >= 4}
          className="flex-shrink-0 mb-0.5 p-2 md:p-2.5 rounded-xl transition-all duration-200 active:scale-90"
          style={{
            background: images.length > 0 ? 'rgba(0,255,198,0.1)' : 'rgba(255,255,255,0.04)',
            color: images.length > 0 ? '#00ffc6' : 'rgba(255,255,255,0.3)',
            border: images.length > 0 ? '1px solid rgba(0,255,198,0.2)' : '1px solid rgba(255,255,255,0.06)',
            opacity: images.length >= 4 ? 0.4 : 1,
            cursor: images.length >= 4 ? 'not-allowed' : 'pointer',
          }}
          title={images.length >= 4 ? 'Max 4 images' : 'Upload image'}
        >
          <ImagePlus size={14} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !hasContent}
          className={`flex-shrink-0 mb-0.5 p-2 md:p-2.5 rounded-xl send-btn ${hasContent ? 'cursor-pointer' : 'cursor-not-allowed disabled'}`}
        >
          <Send size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Drag-and-drop hint */}
      {images.length === 0 && !replyTo && (
        <div className="flex items-center justify-end px-1 pb-0.5 -mt-1">
          <span className="text-[8px] text-white/15">Drop images here or click 🖼</span>
        </div>
      )}
    </div>
  )
}

export default InputBar
