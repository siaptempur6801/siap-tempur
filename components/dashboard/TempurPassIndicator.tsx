'use client'

import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TempurPassIndicatorProps {
    /** Tujuan halaman pass. Wajib eksplisit supaya area CPNS tidak diarahkan ke pass TKA. */
    href: string
    /** Label cakupan, mis. `Tempur Pass CPNS`. */
    label?: string
    compact?: boolean
    theme?: 'light' | 'dark' | 'paper'
    className?: string
}

export default function TempurPassIndicator({
    href,
    label = 'Tempur Pass aktif',
    compact = false,
    theme = 'light',
    className,
}: TempurPassIndicatorProps) {
    return (
        <Link
            href={href}
            aria-label={label}
            title={label}
            className={cn(
                'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold transition',
                theme === 'dark'
                    ? 'border-blue-300/40 bg-blue-300/10 text-blue-100 hover:bg-blue-300/20'
                    : theme === 'paper'
                        ? 'rounded-md border-gray-900 bg-green-100 text-gray-900 st-shadow-sm hover:bg-green-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                className,
            )}
        >
            <BadgeCheck size={compact ? 13 : 14} aria-hidden="true" />
            <span>{compact ? 'Pass aktif' : 'Tempur Pass aktif'}</span>
        </Link>
    )
}
