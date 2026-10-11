'use client'

import { useMemo } from 'react'
import { useActiveSection, type SectionNavItem } from '@/lib/use-active-section'
import { cn } from '@/lib/utils'
import InPageLink from '@/components/marketing/InPageLink'

/**
 * Navigasi landing yang menandai section sedang aktif.
 *
 * Dipakai di header landing utama (`/`) untuk versi desktop dan mobile. Tautan non-anchor
 * (mis. `/blog`) tetap memakai gaya biasa tanpa penanda.
 */
export default function LandingNav({
  items,
  variant = 'desktop',
}: {
  items: readonly { href: string; label: string }[]
  variant?: 'desktop' | 'mobile'
}) {
  const sections: SectionNavItem[] = useMemo(
    () =>
      items
        .filter((item) => item.href.startsWith('#'))
        .map((item) => ({ id: item.href.slice(1), label: item.label })),
    [items],
  )

  const { activeId } = useActiveSection(sections)

  return (
    <>
      {items.map((item) => {
        const targetId = item.href.startsWith('#') ? item.href.slice(1) : null
        const active = targetId !== null && targetId === activeId

        return (
          <InPageLink
            key={item.href}
            href={item.href}
            aria-current={active ? 'location' : undefined}
            className={cn(
              'st-focus transition-colors',
              variant === 'desktop' ? 'rounded-xl px-3 py-2' : 'rounded-xl px-3 py-3',
              active
                ? 'bg-[var(--brand-blue-50)] font-black text-blue-700'
                : 'text-gray-700 hover:bg-[var(--brand-blue-50)] hover:text-blue-700',
            )}
          >
            {item.label}
          </InPageLink>
        )
      })}
    </>
  )
}
