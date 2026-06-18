/**
 * MessageBubble — renders one message in the conversation.
 *
 * Each message has a role (user or assistant) and a blocks array.
 * blocks = [{type: "text", content: "..."}, {type: "latex", content: "..."}]
 *
 * For now we render all blocks as text.
 * We'll add LaTeX, Mermaid, and flashcard rendering in the next step.
 *
 * Props:
 * - role: "user" or "assistant"
 * - blocks: array of {type, content} objects
 * - isStreaming: true if this message is currently being typed out
 */
function MessageBubble({ role, blocks, isStreaming }) {
    const isUser = role === 'user'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            {/* Avatar — only for tutor */}
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center 
                        justify-center text-white text-xs font-bold mr-3 
                        flex-shrink-0 mt-1">
                    VL
                </div>
            )}

            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-100 rounded-tl-sm'
                }`}>
                {/* Render each block */}
                {blocks.map((block, index) => (
                    <BlockRenderer key={index} block={block} />
                ))}

                {/* Streaming cursor — shows while response is being typed */}
                {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-blue-400 ml-1 
                           animate-pulse align-middle" />
                )}
            </div>

            {/* Avatar — only for user */}
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center 
                        justify-center text-white text-xs font-bold ml-3 
                        flex-shrink-0 mt-1">
                    You
                </div>
            )}
        </div>
    )
}

/**
 * BlockRenderer — decides how to render one block based on its type.
 * This is where we'll plug in KaTeX, Mermaid, and flashcards later.
 */
function BlockRenderer({ block }) {
    switch (block.type) {
        case 'text':
            return (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {block.content}
                </p>
            )

        case 'latex':
            // Placeholder — will render with KaTeX in next step
            return (
                <div className="my-2 p-2 bg-slate-900 rounded text-blue-300 
                        text-sm font-mono">
                    {block.content}
                </div>
            )

        case 'mermaid':
            // Placeholder — will render with Mermaid.js in next step
            return (
                <div className="my-2 p-2 bg-slate-900 rounded text-green-300 
                        text-xs font-mono">
                    [Diagram: {block.content.substring(0, 50)}...]
                </div>
            )

        case 'flashcard':
            // Placeholder — will render as flip card in next step
            return (
                <div className="my-2 p-2 bg-slate-900 rounded text-yellow-300 text-sm">
                    [Flashcard]
                </div>
            )

        default:
            return <p className="text-sm">{block.content}</p>
    }
}

export default MessageBubble