import { motion } from 'framer-motion'
import { Cpu, Zap, Code, CircuitBoard, Plus, BookOpen } from 'lucide-react'

const defaultSubjects = [
  { icon: '∑',  name: 'Math',              desc: 'Algebra, Calculus, Geometry',       color: '#00ffc6' },
  { icon: 'Φ',  name: 'Physics',           desc: 'Mechanics, Thermodynamics, Optics', color: '#00ccff' },
  { icon: '⚗', name: 'Chemistry',         desc: 'Organic, Inorganic, Physical',      color: '#ff3366' },
  { icon: '🧬', name: 'Biology',           desc: 'Cell Bio, Genetics, Ecology',       color: '#a855f7' },
  { icon: '📜', name: 'History',           desc: 'World, Indian, Modern History',     color: '#f59e0b' },
  { icon: '🌏', name: 'Geography',         desc: 'Physical, Human, Economic',         color: '#10b981' },
  { icon: '✏️', name: 'English',           desc: 'Grammar, Literature, Writing',      color: '#6366f1' },
  { icon: '💻', name: 'Computer Science',  desc: 'Algorithms, Programming, Networks', color: '#ec4899' },
]

function EmptyState({ subjectMeta, onSelect, conversations, onSelectSubject, onNewTopic }) {
  return (
    <div className="h-full flex flex-col bg-transparent pointer-events-auto overflow-y-auto custom-scrollbar">
      <div className="flex-1 flex items-center justify-center py-8 relative">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #00ffc6 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center max-w-xl px-4 sm:px-8 relative z-[1] w-full"
        >
          {/* Icon */}
          <div className="relative mx-auto w-14 h-14 mb-5">
            <div className="absolute inset-0 rounded-2xl blur-xl" style={{ background: 'rgba(0,255,198,0.12)' }} />
            <div className="relative w-14 h-14 rounded-2xl bg-[#1c1528] flex items-center justify-center border border-white/5">
              <Cpu size={24} className="text-[#00ffc6]" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#ff3366]"
              style={{ boxShadow: '0 0 8px rgba(255,51,102,0.5)' }}
            />
          </div>

          <h2 className="text-lg font-bold mb-1 text-white/90">Ready to Learn</h2>
          <p className="text-xs leading-relaxed mb-6 text-white/40 max-w-sm mx-auto">
            Pick any subject below or type your question in the input bar. You can learn <strong className="text-white/60">any topic</strong> — not just the ones listed!
          </p>

          {/* New Topic button */}
          {onNewTopic && (
            <motion.button
              onClick={onNewTopic}
              whileTap={{ scale: 0.97 }}
              className="mb-5 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,198,0.15) 0%, rgba(0,204,162,0.1) 100%)',
                color: '#00ffc6',
                border: '1px solid rgba(0,255,198,0.25)',
                boxShadow: '0 0 20px rgba(0,255,198,0.08)',
              }}
            >
              <Plus size={14} />
              Start a New Topic
            </motion.button>
          )}

          {/* Subject grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto mb-6">
            {defaultSubjects.map((subj, i) => (
              <motion.div
                key={subj.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => onSelectSubject && onSelectSubject(subj.name)}
                className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer group bg-[#1c1528] border border-white/5 hover:border-[#00ffc6]/25 hover:bg-[#231b32] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                style={{ boxShadow: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 14px ${subj.color}18`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[11px] shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform"
                  style={{ background: subj.color + '22', border: `1px solid ${subj.color}44`, color: subj.color }}
                >
                  {subj.icon}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[10px] font-semibold text-white/80 truncate">{subj.name}</div>
                  <div className="text-[7px] truncate text-white/30">{subj.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {[
              { icon: Zap,          label: 'Instant feedback' },
              { icon: CircuitBoard, label: 'Track progress'   },
              { icon: Code,         label: 'Smart hints'      },
              { icon: BookOpen,     label: 'Any subject'      },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                className="flex items-center gap-1.5"
              >
                <item.icon size={10} className="text-[#00ffc6]/60" />
                <span className="text-[8px] font-medium text-white/30">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default EmptyState
