import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    darkMode: true,
    suppressErrorRendering: true, // Prevents Mermaid from injecting bomb icons into the document body
})

let mermaidCounter = 0

/**
 * MermaidBlock — renders a Mermaid.js diagram from a code string.
 *
 * Props:
 * - content: string containing the mermaid diagram code
 */
function MermaidBlock({ content }) {
    const containerRef = useRef(null)
    const id = useRef(`mermaid-${++mermaidCounter}`)
    const [errorMsg, setErrorMsg] = useState(null)
    useEffect(() => {
        const render = async () => {
            if (!containerRef.current) return
            setErrorMsg(null)
            try {
                // Pre-parse the content to avoid render throwing fatal unhandled body injections
                await mermaid.parse(content, { suppressErrors: true });
                const { svg } = await mermaid.render(id.current, content)
                containerRef.current.innerHTML = svg
            } catch (error) {
                setErrorMsg(`Diagram error: ${error.message}`)
                // Failsafe: Mermaid sometimes still injects global error SVGs into the body.
                // We physically remove them from the DOM to prevent them from floating on the screen.
                document.querySelectorAll('svg[id^="dmermaid"]').forEach(el => el.remove());
            }
        }
        render()
    }, [content])

    if (errorMsg) {
        return (
            <div className="my-3 p-3 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-xs font-mono break-words">
                {errorMsg}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="my-3 p-3 bg-slate-900 rounded-xl overflow-x-auto"
        />
    )
}

export default MermaidBlock