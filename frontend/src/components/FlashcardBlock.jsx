import { useState } from 'react'
import { BookOpen } from 'lucide-react'

/**
 * FlashcardBlock — an interactive flip card.
 *
 * Props:
 * - content: JSON string containing front and back of the flashcard
 *
 * This component shows the front, and flips to show the back on click.
 * Uses CSS 3D Transforms via classes in index.css.
 */
function FlashcardBlock({ content }) {
    const [flipped, setFlipped] = useState(false)

    let card
    try {
        card = JSON.parse(content)
    } catch {
        return <p className="text-red-400 text-sm">Invalid flashcard data</p>
    }

    return (
        <div
            onClick={() => setFlipped(!flipped)}
            className="my-4 w-full max-w-sm mx-auto perspective-1000 cursor-pointer select-none group h-[140px]"
        >
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front of Card */}
                <div className="absolute inset-0 w-full h-full p-4 rounded-2xl bg-gradient-to-br from-[#1c1528] to-[#0c0414] border border-white/10 hover:border-[#00ffc6]/40 flex flex-col justify-between backface-hidden shadow-lg transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                            <BookOpen size={10} className="text-[#00ffc6]" /> Flashcard — Question
                        </span>
                        <span className="text-[8px] text-[#00ffc6] font-semibold px-2 py-0.5 rounded-full bg-[#00ffc6]/10 border border-[#00ffc6]/20">
                            Tap to reveal
                        </span>
                    </div>
                    <div className="my-auto py-2">
                        <p className="text-xs text-white/90 font-medium leading-relaxed whitespace-pre-wrap">
                            {card.front}
                        </p>
                    </div>
                    <div className="text-[7px] text-white/20 text-right">
                        VidyaLoop Interactive
                    </div>
                </div>

                {/* Back of Card */}
                <div className="absolute inset-0 w-full h-full p-4 rounded-2xl bg-gradient-to-br from-[#1c1528] to-[#0c0414] border border-[#ff3366]/40 flex flex-col justify-between backface-hidden rotate-y-180 shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                            <BookOpen size={10} className="text-[#ff3366]" /> Flashcard — Answer
                        </span>
                        <span className="text-[8px] text-[#ff3366] font-semibold px-2 py-0.5 rounded-full bg-[#ff3366]/10 border border-[#ff3366]/20">
                            Active Learning
                        </span>
                    </div>
                    <div className="my-auto py-2">
                        <p className="text-xs text-white/90 font-medium leading-relaxed whitespace-pre-wrap">
                            {card.back}
                        </p>
                    </div>
                    <div className="text-[7px] text-white/20 text-right">
                        Tap to flip back
                    </div>
                </div>

            </div>
        </div>
    )
}

export default FlashcardBlock