import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#00ffc6', '#ff3366', '#00ccff', '#a855f7', '#ff6b35', '#00ff88', '#ff0088']
const SHAPES = ['circle', 'square', 'triangle']

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

function ConfettiEffect() {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    const newPieces = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      x: randomBetween(5, 95),
      delay: randomBetween(0, 0.25),
      duration: randomBetween(1.2, 2),
      size: randomBetween(5, 10),
      rotation: randomBetween(0, 360),
    }))
    setPieces(newPieces)
    const timer = setTimeout(() => setPieces([]), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map(piece => (
          <motion.div
            key={piece.id}
            initial={{ opacity: 1, y: -15, x: `${piece.x}vw`, rotate: 0, scale: 0 }}
            animate={{ opacity: [1, 1, 0], y: ['0vh', '100vh'], rotate: piece.rotation * 5, scale: [0, 1, 1, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: piece.duration, delay: piece.delay, ease: [0.2, 0.5, 0.3, 1] }}
            className="absolute top-0"
            style={{
              left: `${piece.x}%`,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'triangle' ? '0' : '2px',
              clipPath: piece.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ConfettiEffect
