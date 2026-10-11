'use client'

import { useMemo } from 'react'
import { useActiveSection, type SectionNavItem } from '@/lib/use-active-section'
import type { ArticleTocItem } from '@/lib/article-toc'
import { cn } from '@/lib/utils'
import InPageLink from '@/components/marketing/InPageLink'

/**
 * Daftar isi artikel blog dengan penanda bagian yang sedang dibaca.
 *
 * Memakai hook scroll-spy yang sama dengan navigasi landing (`useActiveSection`), sehingga
 * bagian aktif ditandai konsisten di seluruh situs.
 */
export default function ArticleToc({ items }: { items: ArticleTocItem[] }) {
  const sections: SectionNavItem[] = useMemo(
    () => items.map((item) => ({ id: item.id, label: item.label })),
    [items],
  )
  const { activeId } = useActiveSection(sections)

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Daftar isi artikel"
      className="mt-8 rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-paper)] p-5 st-shadow-sm"
    >
      <p className="st-kicker bg-white">Daftar isi</p>
      <ol className="mt-4 space-y-1.5">
        {items.map((item, index) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <InPageLink
                href={`#${item.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'st-focus flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors',
                  active
                    ? 'bg-[var(--brand-blue-50)] text-blue-700'
                    : 'text-gray-700 hover:bg-white hover:text-blue-700',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 text-[11px] font-black',
                    active
                      ? 'border-blue-700 bg-white text-blue-700'
                      : 'border-gray-300 bg-white text-gray-500',
                  )}
                >
                  {index + 1}
                </span>
                <span className="leading-snug">{item.label}</span>
              </InPageLink>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
