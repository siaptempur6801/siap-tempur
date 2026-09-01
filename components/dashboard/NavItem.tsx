'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItemProps {
    href: string
    icon: React.ReactNode
    label: string
    badge?: string
}

export function NavItem({ href, icon, label, badge }: NavItemProps) {
    const pathname = usePathname()
    const isActive = href.endsWith('/dashboard')
        ? pathname === href
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'group flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-500 group-hover:bg-white group-hover:text-slate-800'
                )}>
                    {icon}
                </span>
                <span className="truncate">{label}</span>
            </div>
            {badge && (
                <span className={cn(
                    'ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                )}>
                    {badge}
                </span>
            )}
        </Link>
    )
}

export function MobileNavItem({ href, icon, label }: NavItemProps) {
    const pathname = usePathname()
    const isActive = href.endsWith('/dashboard')
        ? pathname === href
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset',
                isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
            )}
        >
            <span className={cn(
                'flex h-8 w-10 items-center justify-center rounded-xl transition-colors',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
            )}>
                {icon}
            </span>
            <span className="leading-none">{label}</span>
        </Link>
    )
}
