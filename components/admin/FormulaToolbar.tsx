'use client'

import { LATEX_SNIPPETS, compactLatexSnippets, type LatexSnippet } from '@/lib/latex-snippets'
import { adminEditorButtonClass } from '@/components/admin/AdminUi'
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
    <div
      className={cn('flex flex-wrap items-center gap-1', className)}
      role="toolbar"
      aria-label="Sisipkan rumus"
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-muted-foreground',
          'text-xs',
        )}
      >
        <Sigma size={compact ? 11 : 13} aria-hidden="true" />
        Rumus
      </span>
      {snippets.map((snippet) => (
        <button
          key={snippet.title}
          type="button"
          title={`${snippet.title} — ${snippet.insert}`}
          aria-label={`Sisipkan rumus: ${snippet.title}`}
          onClick={() => onInsert(snippet)}
          className={cn(
            adminEditorButtonClass,
            'font-semibold',
            compact ? 'px-1 text-xs' : 'px-1.5 text-sm md:text-xs',
          )}
        >
          {snippet.label}
        </button>
      ))}
    </div>
  )
}
