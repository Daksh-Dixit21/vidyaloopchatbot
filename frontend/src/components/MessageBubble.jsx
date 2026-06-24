import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MermaidBlock from './MermaidBlock'
import FlashcardBlock from './FlashcardBlock'
import { motion } from 'framer-motion'
import { Bot, User } from 'lucide-react'

/**
 * MessageBubble Component
 * 
 * Renders an individual chat bubble for either the User or the Assistant.
 * For the Assistant, it dynamically parses pure Markdown text into HTML,
 * handling LaTeX math, standard code blocks, and custom components (Mermaid, Flashcards)
 * on the fly.
 * 
 * Props:
 * - role: 'user' or 'assistant'
 * - content: The raw string of text (Markdown for assistant)
 * - isStreaming: Boolean showing the blinking cursor if still generating
 */
function MessageBubble({ role, content, isStreaming }) {
    const isUser = role === 'user'

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1 ${
                    isUser ? 'bg-indigo-600' : 'bg-blue-500/20'
                }`}>
                    {isUser ? <User size={16} className="text-white" /> : <Bot size={18} className="text-blue-400" />}
                </div>

                {/* The Bubble Container */}
                <div className={`px-5 py-4 rounded-3xl shadow-sm overflow-hidden ${
                    isUser
                        ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-br-sm'
                        : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-bl-sm prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent'
                }`}>
                    {isUser ? (
                        // User messages are just plain text
                        <div className="text-[15px] whitespace-pre-wrap">{content}</div>
                    ) : (
                        // Assistant messages are parsed Markdown
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                // Custom override for how ```code``` blocks are rendered
                                code({ node, inline, className, children, ...props }) {
                                    // Determine the language of the code block
                                    const match = /language-(\w+)/.exec(className || '')
                                    const codeContent = String(children).replace(/\n$/, '')
                                    
                                    // Intercept "mermaid" language and render our custom Mermaid component
                                    if (!inline && match && match[1] === 'mermaid') {
                                        return <div className="not-prose my-4"><MermaidBlock content={codeContent} /></div>
                                    }
                                    
                                    // Intercept "json" language that looks like a flashcard and render our Flashcard component
                                    if (!inline && match && match[1] === 'json' && codeContent.includes('"front"')) {
                                        return <div className="not-prose my-4"><FlashcardBlock content={codeContent} /></div>
                                    }

                                    // For normal code blocks (e.g., Python, Javascript), use SyntaxHighlighter
                                    return !inline && match ? (
                                        <div className="not-prose relative my-4 rounded-xl overflow-hidden border border-slate-700">
                                            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                                                <span className="text-xs font-mono text-slate-400">{match[1]}</span>
                                            </div>
                                            <SyntaxHighlighter
                                                {...props}
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                customStyle={{ margin: 0, padding: '1rem', background: '#0f172a' }}
                                            >
                                                {codeContent}
                                            </SyntaxHighlighter>
                                        </div>
                                    ) : (
                                        // Inline `code` elements
                                        <code {...props} className={`${className} bg-slate-900 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[0.9em]`}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    )}

                    {/* Blinking cursor while typing */}
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse align-middle" />
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default MessageBubble