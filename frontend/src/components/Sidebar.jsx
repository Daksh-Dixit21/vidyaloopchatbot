import { Plus, MessageSquare, ChevronRight, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Sidebar Component
 * 
 * Renders the left navigation panel showing chat history.
 * Uses Framer Motion to slide in smoothly when the app loads.
 * 
 * Props:
 * - sessions: Array of session objects fetched from the DB
 * - currentSessionId: The ID of the currently active session
 * - onSelectSession: Callback when a user clicks a past session
 * - onNewChat: Callback to generate a brand new session
 * - onDeleteSession: Callback to delete a session
 */
export default function Sidebar({ sessions, currentSessionId, onSelectSession, onNewChat, onDeleteSession }) {
  return (
    <motion.div 
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full"
    >
      <div className="p-4">
        {/* New Chat Button */}
        <button 
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        <div className="text-xs font-semibold text-slate-500 mb-3 px-2 uppercase tracking-wider">Recent Chats</div>
        
        {sessions.length === 0 ? (
          <div className="text-slate-500 text-sm px-2">No history yet.</div>
        ) : (
          <div className="space-y-1">
            {/* Map over all sessions and render a button for each */}
            {sessions.map(s => {
              const isActive = s.session_id === currentSessionId;
              return (
                <div key={s.session_id} className="relative group flex items-center">
                  <button
                    onClick={() => onSelectSession(s.session_id)}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                      ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <MessageSquare size={16} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                    
                    {/* Session Title (We use Student Name and Class for now) */}
                    <div className="flex-1 truncate text-sm pr-6">
                      {s.student_name} - Class {s.class_level}
                    </div>
                  </button>
                  
                  {/* Delete Button (visible on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.session_id);
                    }}
                    className="absolute right-2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-700"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
