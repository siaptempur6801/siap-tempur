'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { isTkaLevelAvailable, type TkaLevel } from '@/src/tka/context'

const LEVELS: Array<{
    level: TkaLevel
    label: string
}> = [
    { level: 'SD', label: 'SD' },
    { level: 'SMP', label: 'SMP' },
    { level: 'SMA', label: 'SMA' },
]

export default function TkaLevelSwitcher({
    activeLevel,
    compact = false,
}: {
    activeLevel: TkaLevel
    compact?: boolean
}) {
    return (
        <nav aria-label="Pilih jenjang TKA" className={cn('w-full', compact && 'max-w-sm')}>
            {!compact && (
                <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Jenjang TKA
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Aktif: {activeLevel}
                    </span>
                </div>
            )}
            <div className="flex items-center rounded-xl bg-slate-100/90 p-1 text-xs">
                {LEVELS.map((item) => {
                    const active = item.level === activeLevel
                    const available = isTkaLevelAvailable(item.level)
                    const className = cn(
                        'st-focus relative flex-1 flex items-center justify-center rounded-lg py-1.5 px-2 text-center font-black transition-all duration-150',
                        active
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70 font-black'
                            : available
                                ? 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                : 'cursor-not-allowed text-slate-400 opacity-60',
                    )

                    if (!available) {
                        return (
                            <span
                                key={item.level}
                                aria-disabled="true"
                                aria-label={`TKA ${item.label}, segera hadir`}
                                title={`TKA ${item.label} segera hadir`}
                                className={className}
                            >
                                {item.label}
                            </span>
                        )
                    }

                    return (
                        <Link
                            key={item.level}
                            href={`/tka/${item.level.toLowerCase()}`}
                            aria-current={active ? 'page' : undefined}
                            aria-label={`TKA ${item.label}, tersedia`}
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
