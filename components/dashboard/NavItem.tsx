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
                'flex min-h-11 items-center justify-between rounded-md border-2 px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                isActive
                    ? 'border-gray-900 bg-yellow-100 text-gray-900'
                    : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-white hover:text-gray-900'
            )}
        >
            <div className="flex items-center gap-3">
                <span className={cn('shrink-0', isActive ? 'text-blue-700' : 'text-gray-500')}>
                    {icon}
                </span>
                <span>{label}</span>
            </div>
            {badge && (
                <span className={cn(
                    'border px-1.5 py-0.5 text-[10px] font-black uppercase',
                    isActive ? 'border-gray-900 bg-white text-gray-900' : 'border-blue-200 bg-blue-50 text-blue-700'
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
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset',
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
            )}
        >
            <span className={cn(
                'flex h-8 w-9 items-center justify-center rounded-md border-2 transition-colors',
                isActive ? 'border-gray-900 bg-yellow-100 text-blue-700' : 'border-transparent'
            )}>
                {icon}
            </span>
            <span className="leading-none">{label}</span>
        </Link>
    )
}
