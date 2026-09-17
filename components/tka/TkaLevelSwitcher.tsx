'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
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
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Jenjang TKA
                    </span>
                    <span className="rounded-full border-2 border-slate-900 bg-[var(--st-yellow-soft)] px-2 py-0.5 text-[10px] font-black text-slate-900">
                        Aktif: {activeLevel}
                    </span>
                </div>
            )}
            <div className="flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-white p-1 text-xs">
                {LEVELS.map((item) => {
                    const active = item.level === activeLevel
                    const className = cn(
                        'relative flex-1 flex items-center justify-center rounded-lg px-2 py-1.5 text-center text-xs font-black transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                        active
                            ? 'border-2 border-slate-900 bg-blue-600 text-white'
                            : 'border-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    )

                    return (
                        <Link
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
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
