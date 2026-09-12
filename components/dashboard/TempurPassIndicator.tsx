'use client'

import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TempurPassIndicatorProps {
    href?: string
    compact?: boolean
    theme?: 'light' | 'dark' | 'paper'
    className?: string
}

export default function TempurPassIndicator({
    href = '/tka/smp/pass',
    compact = false,
    theme = 'light',
    className,
}: TempurPassIndicatorProps) {
    return (
        <Link
            href={href}
            aria-label="Tempur Pass aktif"
            title="Tempur Pass aktif"
            className={cn(
                'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold transition',
                theme === 'dark'
                    ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20'
                    : theme === 'paper'
                        ? 'rounded-md border-gray-900 bg-green-100 text-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-green-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                className,
            )}
        >
            <BadgeCheck size={compact ? 13 : 14} aria-hidden="true" />
            <span>{compact ? 'Pass aktif' : 'Tempur Pass aktif'}</span>
        </Link>
    )
}
