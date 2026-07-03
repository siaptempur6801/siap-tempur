'use client'

import React from 'react'
import Image from 'next/image'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { sanitizeHtmlAllowlist } from '@/lib/article-sanitize'

interface MathRendererProps {
    text: string
    className?: string
}

function isSafeImageUrl(value: string) {
    try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
        return value.startsWith('/')
    }
}

function sanitizeRichText(value: string) {
    return sanitizeHtmlAllowlist(
        value,
        new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'hr', 'span']),
        new Set(['style']),
        { allowStyle: true }
    )
}

export default function MathRenderer({ text, className }: MathRendererProps) {
    if (!text) return null

    const parts = text.split(/(\[\[image:[^\]]+\]\]|\[\[spacer:(?:sm|md|lg)\]\]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)

    return (
        <div className={className}>
            {parts.map((part, index) => {
                if (part.startsWith('[[image:') && part.endsWith(']]')) {
                    const imageUrl = part.slice('[[image:'.length, -2).trim()
                    if (!imageUrl || !isSafeImageUrl(imageUrl)) return null

                    return (
                        <span key={index} className="my-3 block max-w-md overflow-hidden rounded-lg border-2 border-gray-900 bg-white">
                            <Image
                                src={imageUrl}
                                alt="Gambar soal"
                                width={720}
                                height={420}
                                unoptimized
                                className="max-h-72 w-full object-contain"
                            />
                        </span>
                    )
                } else if (part.startsWith('[[spacer:') && part.endsWith(']]')) {
                    const size = part.slice('[[spacer:'.length, -2)
                    const height = size === 'sm' ? 8 : size === 'lg' ? 48 : 24
                    return <span key={index} className="block" style={{ height }} />
                } else if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2)
                    return <BlockMath key={index} math={math} />
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1)
                    return <InlineMath key={index} math={math} />
                }
                if (part.includes('<') && part.includes('>')) {
                    return (
                        <div
                            key={index}
                            className="contents"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(part) }}
                        />
                    )
                }
                return <span key={index}>{part}</span>
            })}
        </div>
    )
}
