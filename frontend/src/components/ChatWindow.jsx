import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Clock, Award, ChevronRight, Zap, MessageSquare, Sparkles, BookOpen, CheckCircle } from 'lucide-react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import TypingIndicator from './TypingIndicator'
import ConfettiEffect from './ConfettiEffect'

const quickReplies = [
  { label: '🔍 Break it down', text: 'Break it down' },
  { label: '📐 Show formula', text: 'Show formula' },
  { label: '🌍 Real-world example', text: 'Real-world example' },
  { label: '💡 Give me a hint', text: 'Give me a hint' },
  { label: '📝 Practice quiz', text: 'Practice' },
]

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl pointer-events-none"
      style={{
        background: 'rgba(20,14,32,0.97)',
        border: '1px solid rgba(0,255,198,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,255,198,0.1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <CheckCircle size={14} className="text-[#00ffc6]" />
      <span className="text-[12px] text-white/80 font-medium">{message}</span>
    </motion.div>
  )
}

function ChatWindow({ conversation, streamingConvId, subjectMeta, userProfile, onMessageSent, onTutorReply, onMarkSolved, onMenuToggle, onApiSend }) {
  const [messages, setMessages] = useState(conversation.messages || [])
  const [solved, setSolved] = useState(conversation.solved || false)
  const [isTutorTyping, setIsTutorTyping] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [sessionTimer, setSessionTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [earnedXp, setEarnedXp] = useState(0)
  const [bookmarks, setBookmarks] = useState(new Set())
  const [replyTo, setReplyTo] = useState(null)
  const [toast, setToast] = useState(null)
  const messagesEndRef = useRef(null)
  const meta = subjectMeta[conversation.subject]

  // Sync messages whenever the parent updates them (for real API streaming)
  useEffect(() => {
    setMessages(conversation.messages || [])
    setSolved(conversation.solved || false)
  }, [conversation.messages, conversation.solved])

  // Show loading animation and reset session state when switching conversations
  useEffect(() => {
    setIsLoading(true)
    setEarnedXp(0)
    setBookmarks(new Set())
    setReplyTo(null)
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [conversation.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTutorTyping])

  useEffect(() => {
    let interval
    if (timerRunning) interval = setInterval(() => setSessionTimer(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [timerRunning])

  function fmt(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function showToast(message) {
    setToast(message)
  }

  function handleCopy() {
    showToast('Message copied!')
  }

  function handleBookmark(msgId) {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) {
        next.delete(msgId)
        showToast('Bookmark removed')
      } else {
        next.add(msgId)
        showToast('Message bookmarked!')
      }
      return next
    })
  }

  function handleReply(message) {
    setReplyTo(message)
  }

  function handleSend(text, images = []) {
    const replyContent = replyTo
      ? `> ${replyTo.content?.slice(0, 80)}${replyTo.content?.length > 80 ? '...' : ''}\n\n${text}`
      : text

    if (onApiSend) {
      onApiSend(conversation.id, replyContent)
      setReplyTo(null)
      return
    }

    const newMsg = {
      id: Date.now().toString(),
      role: 'student',
      content: replyContent,
      images,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content?.slice(0, 60), role: replyTo.role } : null,
    }
    setMessages(prev => [...prev, newMsg])
    onMessageSent(conversation.id, text)
    setEarnedXp(prev => prev + 10)
    setIsTutorTyping(true)
    setReplyTo(null)
    setTimeout(() => {
      setIsTutorTyping(false)
      const replies = images.length > 0
        ? [
            "I can see your image! Let me help you with that...",
            "Thanks for sharing the image. Here's what I notice...",
            "Great! Looking at what you've shared, let me explain...",
          ]
        : [
            "Great question! Let's break this down step by step...",
            "Excellent thinking! Here's how this connects to what you know...",
            "I see where you're going. The key insight is...",
            "Perfect! Let's build on that with a concrete example...",
            "You're on the right track! Here's the framework...",
          ]
      const reply = replies[Math.floor(Math.random() * replies.length)]
      const tutorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'tutor',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, tutorMsg])
      setEarnedXp(prev => prev + 15)
      onTutorReply(conversation.id, reply)
    }, 1800 + Math.random() * 1200)
  }

  function handleQuickReply(text) { handleSend(text, []) }

  function handleMarkSolved() {
    setSolved(true)
    setShowConfetti(true)
    setEarnedXp(prev => prev + 50)
    onMarkSolved()
    setTimeout(() => setShowConfetti(false), 3000)
  }

  return (
    <div className="h-full flex flex-col bg-transparent pointer-events-auto">
      {showConfetti && <ConfettiEffect />}

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between pl-14 pr-3 md:pl-5 md:pr-4 py-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(12,4,20,0.96) 0%, rgba(10,4,18,0.88) 100%)',
          borderBottom: '1px solid rgba(0,255,198,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Left: subject info */}
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
          <div
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-base shadow-lg flex-shrink-0 ${meta.color}`}
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}
          >
            <span>{meta.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-xs md:text-sm truncate max-w-[110px] sm:max-w-[180px] md:max-w-none text-white/90">
                {conversation.chapter}
              </h1>
              <span
                className="text-[8px] md:text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(0,255,198,0.1)', color: '#00ffc6', border: '1px solid rgba(0,255,198,0.2)' }}
              >
                {meta.tag}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1 mt-0.5">
              <span className="text-[9px] text-white/30">Class {userProfile.classLevel}</span>
              <ChevronRight size={7} className="text-white/20" />
              <span className="text-[9px] text-white/30">{conversation.subject}</span>
              <ChevronRight size={7} className="text-white/20" />
              <span className="text-[9px] font-medium" style={{ color: 'rgba(0,255,198,0.7)' }}>{conversation.chapter}</span>
            </div>
          </div>
        </div>

        {/* Right: stats & controls */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* XP badge */}
          <AnimatePresence mode="wait">
            {earnedXp > 0 && (
              <motion.div
                key={earnedXp}
                initial={{ scale: 0.7, opacity: 0, y: -6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,51,102,0.12)', border: '1px solid rgba(255,51,102,0.2)' }}
              >
                <Zap size={9} className="text-[#ff3366] fill-[#ff3366]" />
                <span className="text-[9px] font-bold text-[#ff3366]">+{earnedXp} XP</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bookmarks count */}
          {bookmarks.size > 0 && (
            <div
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
              style={{ background: 'rgba(255,170,0,0.1)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.15)' }}
            >
              <BookOpen size={9} className="fill-[#ffaa00] text-[#ffaa00]" />
              <span>{bookmarks.size}</span>
            </div>
          )}

          {/* Timer */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Clock size={9} />
            {fmt(sessionTimer)}
          </div>

          {/* Solved button */}
          <motion.button
            onClick={handleMarkSolved}
            disabled={solved}
            whileTap={{ scale: 0.9 }}
            className="flex w-8 h-8 rounded-xl items-center justify-center transition-all"
            style={{
              background: solved ? 'rgba(0,255,198,0.12)' : 'rgba(255,255,255,0.05)',
              color: solved ? '#00ffc6' : 'rgba(255,255,255,0.35)',
              border: solved ? '1px solid rgba(0,255,198,0.25)' : '1px solid rgba(255,255,255,0.07)',
            }}
            title={solved ? 'Solved!' : 'Mark as solved'}
          >
            {solved
              ? <Award size={13} className="fill-[#00ffc6] text-[#00ffc6]" />
              : <Award size={13} />
            }
          </motion.button>

          {/* Streak */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
            style={{ background: 'rgba(255,51,102,0.1)', color: '#ff3366', border: '1px solid rgba(255,51,102,0.15)' }}
          >
            <Flame size={9} className="fill-[#ff3366] text-[#ff3366]" />
            <span>{userProfile.streak}</span>
          </div>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{
          background: 'linear-gradient(180deg, rgba(10,6,20,0.85) 0%, rgba(8,4,16,0.9) 50%, rgba(12,4,20,0.85) 100%)',
        }}
      >
        {/* Subtle grid bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,255,198,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,198,0.015) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative px-3 md:px-5 py-4 md:py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-3 md:gap-4">

            {/* Empty state */}
            {!isLoading && messages.length === 0 && !isTutorTyping && !streamingConvId && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(0,255,198,0.07)', border: '1px solid rgba(0,255,198,0.12)' }}
                >
                  <Sparkles size={24} className="text-[#00ffc6]/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/40">Start the conversation</p>
                  <p className="text-[11px] text-white/20 mt-1">Ask a question or pick a quick reply below</p>
                </div>
              </motion.div>
            )}

            {/* Skeleton loading */}
            {isLoading ? (
              <div className="space-y-4 pt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-7 h-7 rounded-xl animate-shimmer flex-shrink-0" style={{ background: 'rgba(0,255,198,0.06)' }} />
                      <div
                        className={`h-12 ${i === 1 ? 'w-48' : i === 2 ? 'w-36' : 'w-60'} rounded-2xl animate-shimmer`}
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onCopy={handleCopy}
                    onBookmark={handleBookmark}
                    onReply={handleReply}
                    isBookmarked={bookmarks.has(msg.id)}
                    isStreaming={streamingConvId === conversation.id && msg.role === 'tutor' && idx === messages.length - 1}
                  />
                ))}
              </AnimatePresence>
            )}

            {/* Tutor typing indicator (mock mode) */}
            {isTutorTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2"
              >
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${meta.color}`}
                  style={{ boxShadow: '0 0 12px rgba(0,255,198,0.15)' }}
                >
                  <span className="text-[11px]">{meta.icon}</span>
                </div>
                <div
                  className="px-3.5 py-2.5 rounded-2xl rounded-bl-md"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30,16,48,0.95) 0%, rgba(20,12,35,0.9) 100%)',
                    border: '1px solid rgba(0,255,198,0.12)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <TypingIndicator />
                </div>
              </motion.div>
            )}

            {/* Streaming typing indicator (real API mode) */}
            {streamingConvId === conversation.id && !isTutorTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2"
              >
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${meta.color}`}
                  style={{ boxShadow: '0 0 12px rgba(0,255,198,0.15)' }}
                >
                  <span className="text-[11px]">{meta.icon}</span>
                </div>
                <div
                  className="px-3.5 py-2.5 rounded-2xl rounded-bl-md"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30,16,48,0.95) 0%, rgba(20,12,35,0.9) 100%)',
                    border: '1px solid rgba(0,255,198,0.12)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <TypingIndicator />
                </div>
              </motion.div>
            )}

            {/* Solved banner */}
            {solved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex items-center justify-center gap-2 py-4"
              >
                <div
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,255,198,0.12), rgba(0,255,198,0.05))',
                    border: '1px solid rgba(0,255,198,0.25)',
                    boxShadow: '0 0 24px rgba(0,255,198,0.1)',
                  }}
                >
                  <Award size={16} className="text-[#00ffc6] fill-[#00ffc6]" />
                  <span className="text-sm font-bold text-[#00ffc6]">Chapter mastered!</span>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,51,102,0.15)', color: '#ff3366' }}
                  >
                    +50 XP
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-3" />
          </div>
        </div>
      </div>

      {/* ── Quick replies ── */}
      <div
        className="flex-shrink-0 px-3 md:px-5 pt-2.5 pb-1.5"
        style={{ background: 'rgba(10,4,18,0.9)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {quickReplies.map((reply, i) => (
            <motion.button
              key={i}
              onClick={() => handleQuickReply(reply.text)}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 text-[10px] md:text-[11px] font-medium px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: 'rgba(0,255,198,0.04)',
                color: 'rgba(0,255,198,0.65)',
                border: '1px solid rgba(0,255,198,0.1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,255,198,0.1)'
                e.currentTarget.style.borderColor = 'rgba(0,255,198,0.22)'
                e.currentTarget.style.color = 'rgba(0,255,198,0.9)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,255,198,0.04)'
                e.currentTarget.style.borderColor = 'rgba(0,255,198,0.1)'
                e.currentTarget.style.color = 'rgba(0,255,198,0.65)'
              }}
            >
              {reply.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Input area ── */}
      <div
        className="flex-shrink-0 px-3 md:px-5 pb-3 md:pb-4 pt-1.5"
        style={{ background: 'rgba(10,4,18,0.9)' }}
      >
        <div className="max-w-3xl mx-auto">
          <InputBar
            onSend={handleSend}
            disabled={isTutorTyping}
            conversationId={conversation.id}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatWindow
