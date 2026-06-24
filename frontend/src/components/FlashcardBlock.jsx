import { useState } from 'react'

/**
 * FlashcardBlock — an interactive flip card.
 *
 * Props:
 * - content: JSON string containing front and back of the flashcard
 *
 * This component shows the front, and flips to show the back on click.
 * Uses local state to track the flip side so each card is independent.
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
            className="my-3 cursor-pointer select-none"
        >
            <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${flipped
                ? 'bg-blue-900 border-blue-500'
                : 'bg-slate-900 border-slate-600 hover:border-blue-600'
                }`}>
                <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                    {flipped ? 'Answer' : 'Question — tap to reveal'}
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {flipped ? card.back : card.front}
                </p>
            </div>
        </div>
    )
}

export default FlashcardBlock