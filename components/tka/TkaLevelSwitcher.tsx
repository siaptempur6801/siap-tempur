'use client'

import Link from 'next/link'
import { GraduationCap, School } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TkaLevel } from '@/src/tka/context'

const LEVELS: Array<{
    level: TkaLevel
    label: string
    description: string
    available: boolean
}> = [
    { level: 'SD', label: 'SD', description: 'Dasar', available: false },
    { level: 'SMP', label: 'SMP', description: 'Aktif', available: true },
    { level: 'SMA', label: 'SMA', description: 'Lanjutan', available: false },
]

export default function TkaLevelSwitcher({
    activeLevel,
    compact = false,
}: {
    activeLevel: TkaLevel
    compact?: boolean
}) {
    return (
        <nav aria-label="Pilih jenjang TKA" className={cn('w-full', compact ? 'max-w-sm' : 'max-w-xl')}>
            {!compact && (
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Jenjang belajar
                </p>
            )}
            <div className="grid grid-cols-3 gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {LEVELS.map((item) => {
                    const active = item.level === activeLevel
                    const Icon = item.level === 'SMA' ? GraduationCap : School
                    return (
                        <Link
                            key={item.level}
                            href={`/tka/${item.level.toLowerCase()}`}
                            aria-current={active ? 'page' : undefined}
                            aria-label={`TKA ${item.label}${item.available ? ', tersedia' : ', segera hadir'}`}
                            className={cn(
                                'group flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                                compact ? 'min-h-11' : 'min-h-10',
                                active
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                            )}
                        >
                            {!compact && <Icon size={14} className={active ? 'text-indigo-100' : 'text-slate-400'} />}
                            <span className="min-w-0">
                                <span className="block text-[13px] font-black leading-none">{item.label}</span>
                                {!compact && (
                                    <span className={cn(
                                        'mt-0.5 block text-[8px] font-bold uppercase tracking-wide',
                                        active ? 'text-indigo-100' : item.available ? 'text-emerald-600' : 'text-slate-400',
                                    )}>
                                        {item.available ? item.description : 'Segera hadir'}
                                    </span>
                                )}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
