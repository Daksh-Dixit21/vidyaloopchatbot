import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Image as ImageIcon, Zap, Sparkles, User, X, ZoomIn, Copy, Bookmark, Reply, CheckCheck, SmilePlus } from 'lucide-react'
import MermaidBlock from './MermaidBlock'
import FlashcardBlock from './FlashcardBlock'

const quickEmojis = ['👍', '❤️', '🎉', '💡', '✅', '🔥', '👀', '🚀']

function MessageBubble({ message, onCopy, onBookmark, onReply, isBookmarked }) {
  const [showStamp, setShowStamp] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [reactions, setReactions] = useState(message.reactions || [])
  const [copied, setCopied] = useState(false)
  const isTutor = message.role === 'tutor'
  const images = message.images || []
  const hasImages = images.length > 0

  function handleCopy() {
    navigator.clipboard.writeText(message.content || '')
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReaction(emoji) {
    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji)
      if (existing) {
        if (existing.byMe) return prev.filter(r => r.emoji !== emoji)
        return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, byMe: true } : r)
      }
      return [...prev, { emoji, count: 1, byMe: true }]
    })
    setShowEmojiPicker(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex w-full ${isTutor ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`flex max-w-[92%] md:max-w-[78%] ${isTutor ? 'flex-row' : 'flex-row-reverse'} items-end gap-2`}
        onMouseEnter={() => { setShowStamp(true); setShowActions(true) }}
        onMouseLeave={() => { setShowStamp(false); setShowActions(false); setShowEmojiPicker(false) }}
      >
        {/* ── Avatar ── */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mb-0.5">
          <div
            className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center shadow-md"
            style={isTutor ? {
              background: 'linear-gradient(135deg, #1e1030 0%, #2a1545 100%)',
              border: '1.5px solid rgba(0,255,198,0.25)',
              boxShadow: '0 0 12px rgba(0,255,198,0.12)',
            } : {
              background: 'linear-gradient(135deg, #00ffc6 0%, #00d4a8 100%)',
              border: '1.5px solid rgba(0,255,198,0.4)',
              boxShadow: '0 0 14px rgba(0,255,198,0.25)',
            }}
          >
            {isTutor
              ? <Sparkles size={13} className="text-[#00ffc6]" />
              : <User size={13} className="text-[#0c0414]" />
            }
          </div>
          <span className={`text-[8px] font-semibold tracking-wide ${isTutor ? 'text-[#00ffc6]/50' : 'text-white/30'}`}>
            {isTutor ? 'AI' : 'You'}
          </span>
        </div>

        {/* ── Bubble + timestamp ── */}
        <div className="flex flex-col gap-1 max-w-full min-w-0">

          {/* Bubble */}
          <div
            className={`overflow-hidden ${isTutor ? '' : 'font-medium'} relative group`}
            style={isTutor ? {
              background: 'linear-gradient(135deg, rgba(30,16,48,0.95) 0%, rgba(20,12,35,0.9) 100%)',
              color: 'rgba(232,232,237,0.92)',
              border: '1px solid rgba(0,255,198,0.12)',
              borderRadius: '14px 14px 14px 4px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
            } : hasImages ? {
              background: 'linear-gradient(135deg, rgba(18,10,30,0.97) 0%, rgba(12,6,22,0.95) 100%)',
              color: 'rgba(232,232,237,0.92)',
              border: '1px solid rgba(0,255,198,0.18)',
              borderRadius: '14px 14px 4px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,255,198,0.1)',
            } : {
              background: 'linear-gradient(135deg, #00ffc6 0%, #00d4a8 60%, #00b89a 100%)',
              color: '#071a14',
              borderRadius: '14px 14px 4px 14px',
              boxShadow: '0 4px 20px rgba(0,255,198,0.22), 0 0 0 1px rgba(0,255,198,0.15)',
            }}
          >
            {/* ── Image grid ── */}
            {hasImages && (
              <div className={`${images.length === 1 ? '' : 'grid grid-cols-2'} gap-0.5 overflow-hidden`}
                style={{ borderRadius: isTutor ? '13px 13px 0 0' : '13px 13px 0 0' }}
              >
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group/img cursor-pointer overflow-hidden"
                    style={{
                      borderRadius: images.length === 1
                        ? '13px 13px 0 0'
                        : idx === 0 ? '13px 0 0 0'
                        : idx === 1 ? '0 13px 0 0'
                        : idx === 2 ? '0 0 0 0'
                        : '0 0 0 0',
                    }}
                    onClick={() => setLightboxImg(img.url)}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full object-cover transition-transform duration-300 group-hover/img:scale-105 ${images.length === 1 ? 'max-h-72' : 'h-32 md:h-40'}`}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.35)' }}
                    >
                      <ZoomIn size={20} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Text content ── */}
            {isTutor ? (
              <div className="px-3.5 py-2.5 md:px-4 md:py-3 text-[13px] md:text-sm leading-relaxed">
                <div className="prose prose-sm max-w-none
                  prose-p:leading-relaxed prose-p:my-1
                  prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-2
                  prose-code:text-[#00ffc6] prose-code:before:content-none prose-code:after:content-none prose-code:bg-[#00ffc6]/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-a:text-[#00ffc6] prose-a:underline-offset-2
                  prose-strong:text-white prose-strong:font-semibold
                  prose-ul:my-1.5 prose-li:my-0.5 prose-li:marker:text-[#00ffc6]/60
                  prose-ol:my-1.5
                  prose-headings:my-2 prose-h1:text-base prose-h2:text-sm prose-h3:text-[13px]
                  prose-blockquote:border-l-[#00ffc6]/30 prose-blockquote:text-white/50
                  text-white/88">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeContent = String(children).replace(/\n$/, '')
                        if (!inline && match && match[1] === 'mermaid') {
                          return (
                            <div className="not-prose my-2 w-full">
                              <MermaidBlock content={codeContent} />
                            </div>
                          )
                        }
                        if (!inline && match && match[1] === 'json' && codeContent.includes('"front"')) {
                          return (
                            <div className="not-prose my-2 w-full">
                              <FlashcardBlock content={codeContent} />
                            </div>
                          )
                        }
                        return !inline && match ? (
                          <div className="not-prose relative my-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,255,198,0.1)', background: '#080c1a' }}>
                            <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(0,255,198,0.05)', borderBottom: '1px solid rgba(0,255,198,0.08)' }}>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#ff3366]/50" />
                                <div className="w-2 h-2 rounded-full bg-[#ffaa00]/50" />
                                <div className="w-2 h-2 rounded-full bg-[#00ffc6]/50" />
                              </div>
                              <span className="text-[9px] font-mono font-medium text-[#00ffc6]/40 uppercase tracking-wider">{match[1]}</span>
                            </div>
                            <SyntaxHighlighter
                              {...props}
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '0.72rem', lineHeight: '1.5' }}
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={`${className} px-1.5 py-0.5 rounded-md text-[0.88em] font-mono bg-[#00ffc6]/10 text-[#00ffc6] border border-[#00ffc6]/10`}>
                            {children}
                          </code>
                        )
                      },
                      img({ src, alt }) {
                        return (
                          <div className="not-prose my-2">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0c0414]/60 border border-white/5">
                              <ImageIcon size={12} className="text-[#00ffc6]/60" />
                              <span className="text-[11px] text-white/40">{alt || 'Image'}</span>
                            </div>
                          </div>
                        )
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              message.content ? (
                <div className={`text-[13px] md:text-sm leading-relaxed font-[500] ${hasImages ? 'px-3.5 py-2 md:px-4' : 'px-3.5 py-2.5 md:px-4 md:py-3'}`}>
                  {message.content}
                </div>
              ) : null
            )}
          </div>

          {/* ── Hover Action Bar ── */}
          <AnimatePresence>
            {showActions && message.content && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className={`flex items-center gap-0.5 ${isTutor ? 'ml-1' : 'mr-1 justify-end'}`}
              >
                {/* Emoji reaction trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all action-btn-hover"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    title="React"
                  >
                    <SmilePlus size={11} className="text-white/40" />
                  </button>
                  {/* Emoji picker dropdown */}
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 4 }}
                        className={`absolute bottom-full mb-1.5 flex gap-1 p-1.5 rounded-xl z-50 ${isTutor ? 'left-0' : 'right-0'}`}
                        style={{
                          background: 'rgba(20,14,32,0.97)',
                          border: '1px solid rgba(0,255,198,0.15)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(0,255,198,0.08)',
                          backdropFilter: 'blur(16px)',
                        }}
                      >
                        {quickEmojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all hover:scale-125 hover:bg-white/10"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Copy */}
                <button
                  onClick={handleCopy}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-all action-btn-hover"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  title="Copy"
                >
                  {copied
                    ? <CheckCheck size={11} className="text-[#00ffc6]" />
                    : <Copy size={11} className="text-white/40" />
                  }
                </button>

                {/* Reply */}
                <button
                  onClick={() => onReply?.(message)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-all action-btn-hover"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  title="Reply"
                >
                  <Reply size={11} className="text-white/40" />
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => onBookmark?.(message.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-all action-btn-hover"
                  style={{
                    background: isBookmarked ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.05)',
                    border: isBookmarked ? '1px solid rgba(255,170,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  <Bookmark size={11} className={isBookmarked ? 'text-[#ffaa00] fill-[#ffaa00]' : 'text-white/40'} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Reactions display ── */}
          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 px-1 ${isTutor ? 'ml-1' : 'mr-1 justify-end'}`}>
              {reactions.map((r, i) => (
                <motion.button
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  onClick={() => handleReaction(r.emoji)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition-all reaction-chip"
                  style={{
                    background: r.byMe ? 'rgba(0,255,198,0.12)' : 'rgba(255,255,255,0.05)',
                    border: r.byMe ? '1px solid rgba(0,255,198,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="text-[9px] text-white/40">{r.count}</span>}
                </motion.button>
              ))}
            </div>
          )}

          {/* ── Timestamp + Read receipt ── */}
          <motion.div
            animate={{ opacity: showStamp ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className={`flex items-center gap-1.5 px-1 ${isTutor ? 'ml-1' : 'mr-1 justify-end'}`}
          >
            <span className="text-[9px] text-white/25">{message.timestamp}</span>
            {!isTutor && (
              <CheckCheck size={10} className="text-[#00ffc6]/50" />
            )}
            {isTutor && (
              <Zap size={7} className="text-[#00ffc6]/30" />
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 200, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
            onClick={() => setLightboxImg(null)}
          >
            <motion.img
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              src={lightboxImg}
              alt="Full view"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
              style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.8)', border: '1px solid rgba(0,255,198,0.15)' }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <X size={16} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default MessageBubble
