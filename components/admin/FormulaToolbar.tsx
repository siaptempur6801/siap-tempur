'use client'

import { LATEX_SNIPPETS,compactLatexSnippets,type LatexSnippet } from '@/lib/latex-snippets'
import { cn } from '@/lib/utils'
import { Sigma } from 'lucide-react'

/**
 * Toolbar snippet rumus untuk penulis soal.
 *
 * Tombol menyisipkan `$...$` (inline) atau `$$...$$` (blok) di posisi kursor
 * textarea — penulis tidak perlu hafal LaTeX. Sintaksnya dirender `MathRenderer`
 * yang sudah dipakai pratinjau soal.
 */
export default function FormulaToolbar({
    onInsert,
    compact = false,
    className,
}: {
    onInsert: (snippet: LatexSnippet) => void
    compact?: boolean
    className?: string
}) {
    const snippets = compact ? compactLatexSnippets() : LATEX_SNIPPETS
    return (
        <div className={cn('flex flex-wrap items-center gap-1', className)} role="toolbar" aria-label="Sisipkan rumus">
            <span className={cn('inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-muted-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
                <Sigma size={compact ? 11 : 13} aria-hidden="true"/>Rumus
            </span>
            {snippets.map((snippet) => (
                <button
                    key={snippet.title}
                    type="button"
                    title={`${snippet.title} — ${snippet.insert}`}
                    aria-label={`Sisipkan rumus: ${snippet.title}`}
                    onClick={() => onInsert(snippet)}
                    className={cn(
                        'inline-flex items-center justify-center rounded-lg border border-border bg-card font-bold text-muted-foreground transition hover:border-info-border hover:bg-info-muted hover:text-info focus:outline-none focus:ring-2 focus:ring-ring/20',
                        compact ? 'h-7 min-w-7 px-1 text-[11px]' : 'h-8 min-w-8 px-1.5 text-xs',
                    )}
                >
                    {snippet.label}
                </button>
            ))}
        </div>
    )
}
