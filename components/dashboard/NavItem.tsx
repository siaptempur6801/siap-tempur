'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItemProps {
    href: string
    icon: React.ReactNode
    label: string
    badge?: string
    exact?: boolean
}

function matchesPath(pathname: string, href: string, exact = false) {
    const pathOnly = href.split('#')[0] || href
    if (exact || pathOnly.endsWith('/dashboard')) return pathname === pathOnly
    return pathname.startsWith(pathOnly)
}

export function NavItem({ href, icon, label, badge, exact = false }: NavItemProps) {
    const pathname = usePathname()
    const isActive = matchesPath(pathname, href, exact)

    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'group flex min-h-11 items-center justify-between border-2 px-3 py-2.5 text-sm font-black transition-[background-color,color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                isActive
                    ? 'border-slate-900 bg-blue-600 text-white shadow-[3px_3px_0_0_#111827]'
                    : 'border-transparent text-slate-700 hover:border-slate-900 hover:bg-white hover:text-slate-950'
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center border-2 transition-colors',
                    isActive
                        ? 'border-white/70 bg-white text-blue-700'
                        : 'border-transparent text-slate-500 group-hover:border-slate-900 group-hover:bg-yellow-100 group-hover:text-slate-900'
                )}>
                    {icon}
                </span>
                <span className="truncate">{label}</span>
            </div>
            {badge && (
                <span className={cn(
                    'ml-2 border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                    isActive ? 'border-white/70 bg-white text-blue-700' : 'border-slate-900 bg-yellow-100 text-slate-900'
                )}>
                    {badge}
                </span>
            )}
        </Link>
    )
}

export function MobileNavItem({ href, icon, label, exact = false }: NavItemProps) {
    const pathname = usePathname()
    const isActive = matchesPath(pathname, href, exact)

    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset',
                isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
            )}
        >
            <span className={cn(
                'flex h-8 w-10 items-center justify-center border-2 transition-colors',
                isActive ? 'border-slate-900 bg-yellow-100 text-blue-700 shadow-[2px_2px_0_0_#111827]' : 'border-transparent text-slate-500'
            )}>
                {icon}
            </span>
            <span className="leading-none">{label}</span>
        </Link>
    )
}
