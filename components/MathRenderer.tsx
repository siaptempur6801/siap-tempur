'use client'

import React from 'react'
import Image from 'next/image'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { sanitizeHtmlAllowlist } from '@/lib/article-sanitize'
import { normalizeQuestionRichText, parseRichTextSegments } from '@/lib/question-rich-text'
import { cn } from '@/lib/utils'

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
    new Set([
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'mark',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'hr',
      'span',
      'img',
    ]),
    new Set(['style', 'src', 'alt', 'title']),
    { allowStyle: true },
  )
}

/**
 * Renderer soal untuk peserta, hasil ujian, dan pratinjau.
 *
 * Tokenisasi ditangani `parseRichTextSegments` sehingga soal lama (`$...$`,
 * `[[image:...]]`, markdown/HTML) dan soal dari editor visual (`data-latex`,
 * `<img>`) tampil dengan cara yang sama.
 */
export default function MathRenderer({ text, className }: MathRendererProps) {
  if (!text) return null

  const segments = parseRichTextSegments(text)

  return (
    <div
      className={cn(
        'whitespace-pre-line [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1 [&_li>p]:mb-1',
        className,
      )}
    >
      {segments.map((segment, index) => {
        if (segment.kind === 'image') {
          if (!segment.url || !isSafeImageUrl(segment.url)) return null
          return (
            <span
              key={index}
              className="my-3 block max-w-md overflow-hidden rounded-lg border-2 border-gray-900 bg-white"
            >
              <Image
                src={segment.url}
                alt={segment.alt || 'Gambar soal'}
                width={720}
                height={420}
                unoptimized
                className="max-h-72 w-full object-contain"
              />
            </span>
          )
        }
        if (segment.kind === 'spacer') {
          const height = segment.size === 'sm' ? 8 : segment.size === 'lg' ? 48 : 24
          return <span key={index} className="block" style={{ height }} />
        }
        if (segment.kind === 'math-block') return <BlockMath key={index} math={segment.latex} />
        if (segment.kind === 'math-inline') return <InlineMath key={index} math={segment.latex} />

        const normalizedPart = normalizeQuestionRichText(segment.value)
        if (normalizedPart.includes('<') && normalizedPart.includes('>')) {
          return (
            <div
              key={index}
              className="contents"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(normalizedPart) }}
            />
          )
        }
        return <span key={index}>{segment.value}</span>
      })}
    </div>
  )
}
