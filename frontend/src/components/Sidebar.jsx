import { useState } from 'react'
import { Search, Plus, X, Home } from 'lucide-react'
import logo from '../assets/logo.png'

function Sidebar({ conversations, subjectMeta, activeConvId, onSelectConversation, onNewChat, onClose, onHome }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filtered = conversations.filter(c =>
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.chapter.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const visible = showAll ? filtered : filtered.slice(0, 5)

  return (
    <aside className="w-full h-full flex flex-col relative bg-[#0c0414]">
      {/* Top bar with Home button */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src={logo} alt="VidyaLoop" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
          <span className="font-bold text-xs tracking-wide text-white/90">VidyaLoop</span>
        </div>
        <div className="flex items-center gap-1">
          {onHome && (
            <button onClick={onHome}
              className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label="Home">
              <Home size={14} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose}
              className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
              aria-label="Close menu">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* New Topic + Search */}
      <div className="px-3 pt-4 pb-3 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-1.5 bg-[#1c1528] hover:bg-[#2a1f3d] active:scale-[0.98] text-white font-semibold text-sm rounded-full px-4 py-2 transition-all duration-200"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span className="text-xs">New Topic</span>
        </button>
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-full pl-8 pr-3 py-1.5 text-xs outline-none transition-all placeholder:text-white/20 text-white/80 bg-[#1c1528] border border-white/5 focus:border-white/10"
          />
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 custom-scrollbar">
        <div className="flex items-center justify-between px-3 mb-2 mt-1">
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/30">
            Sessions
          </span>
          <span className="text-[9px] text-white/30">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="text-xl block mb-2 opacity-30 text-white/40">{'>_'}</span>
            <p className="text-xs text-white/40">{searchQuery ? 'No matches' : 'Start a new topic!'}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {visible.map((conv, idx) => {
              const isActive = conv.id === activeConvId
              const meta = subjectMeta[conv.subject]
              const snippet = conv.firstMessage.length > 55 ? conv.firstMessage.slice(0, 55) + '...' : conv.firstMessage
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-200`}
                  style={{
                    background: isActive ? 'rgba(0,255,198,0.08)' : 'transparent',
                  }}
                >
                  <div className={`relative flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] ${meta.color}`}>
                    <span>{meta.icon}</span>
                    {conv.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ff3366] text-white text-[6px] font-bold rounded-full flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-[11px] font-medium truncate`}
                        style={{ color: isActive ? '#00ffc6' : 'rgba(255,255,255,0.85)' }}>
                        {conv.chapter}
                      </span>
                      <span className="text-[8px] flex-shrink-0 text-white/25">{conv.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-white/30">{meta.tag}</span>
                    </div>
                    <p className="text-[10px] truncate mt-0.5 leading-relaxed text-left text-white/25">
                      {snippet}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {filtered.length > 5 && !showAll && (
          <button onClick={() => setShowAll(true)}
            className="w-full mt-1 text-[10px] font-medium py-1.5 rounded-lg transition-all text-[#00ffc6]/60 hover:text-[#00ffc6]">
            Show all ({filtered.length - 5} more)
          </button>
        )}
        {showAll && filtered.length > 5 && (
          <button onClick={() => setShowAll(false)}
            className="w-full mt-1 text-[10px] font-medium py-1.5 rounded-lg transition-all text-white/30 hover:text-white/50">
            Show less
          </button>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
