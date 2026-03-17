'use client'

import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
    text: string
    className?: string
}

export default function MathRenderer({ text, className }: MathRendererProps) {
    if (!text) return null

    // Split text by $$ ... $$ (block math) and $ ... $ (inline math)
    // We use a regex that captures the delimiters to keep them in the split array
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)

    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2)
                    return <BlockMath key={index} math={math} />
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1)
                    return <InlineMath key={index} math={math} />
                }
                return <span key={index}>{part}</span>
            })}
        </span>
    )
}
