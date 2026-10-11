'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import TkaSurfaceLink from '@/components/tka/TkaSurfaceLink'
import { parseTkaLevel, type TkaLevel } from '@/src/tka/context'

const LEVELS: Array<{
  level: TkaLevel
  label: string
}> = [
  { level: 'SD', label: 'SD' },
  { level: 'SMP', label: 'SMP' },
  { level: 'SMA', label: 'SMA' },
]

export default function TkaLevelSwitcher({
  activeLevel: initialActiveLevel,
  compact = false,
}: {
  activeLevel: TkaLevel
  compact?: boolean
}) {
  const pathname = usePathname()
  const levelFromPath = pathname?.match(/^\/tka\/(sd|smp|sma)(?:\/|$)/i)?.[1]
  const activeLevel = parseTkaLevel(levelFromPath) ?? initialActiveLevel

  return (
    <nav aria-label="Pilih jenjang TKA" className={cn('w-full', compact && 'max-w-sm')}>
      {!compact && (
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Jenjang TKA
          </span>
          <span className="rounded-full bg-[var(--brand-blue-50)] px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Aktif: {activeLevel}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-100/80 p-1 text-xs">
        {LEVELS.map((item) => {
          const active = item.level === activeLevel
          const className = cn(
            'relative flex min-h-11 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-center text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
            active
              ? 'bg-white font-black text-blue-700 shadow-xs ring-1 ring-slate-200/70'
              : 'text-slate-600 hover:bg-white/70 hover:text-slate-950',
          )

          return (
            <TkaSurfaceLink
              key={item.level}
              href={`/tka/${item.level.toLowerCase()}`}
              aria-current={active ? 'page' : undefined}
              aria-label={`TKA ${item.label}`}
              title={`TKA ${item.label}`}
              onClick={() => {
                document.cookie = `tka-level=${item.level}; Path=/; Max-Age=31536000; SameSite=Lax`
              }}
              className={className}
            >
              {item.label}
            </TkaSurfaceLink>
          )
        })}
      </div>
    </nav>
  )
}
