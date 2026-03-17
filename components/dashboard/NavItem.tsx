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

    // Check if active - handle dashboard root as exact match, others as prefix
    const isActive = href.endsWith('/dashboard')
        ? pathname === href
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-md transition-all duration-200 group font-handwriting text-xl border-2",
                isActive
                    ? "bg-yellow-200 text-gray-900 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1 translate-x-1 font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-transparent hover:border-gray-200"
            )}
        >
            <div className="flex items-center gap-3">
                <span className={cn("transition-transform group-hover:rotate-12", isActive && "text-gray-900")}>
                    {icon}
                </span>
                <span>{label}</span>
            </div>
            {badge && (
                <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-sm border-2",
                    isActive ? "bg-white border-gray-900 text-gray-900" : "bg-blue-100 border-blue-200 text-blue-600"
                )}>
                    {badge}
                </span>
            )}
        </Link>
    )
}

export function MobileNavItem({ href, icon, label }: NavItemProps) {
    const pathname = usePathname()

    // Check if active
    const isActive = href.endsWith('/dashboard')
        ? pathname === href
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all active:scale-95",
                isActive
                    ? "text-blue-600 font-bold"
                    : "text-gray-500 hover:text-gray-900"
            )}
        >
            <div className={cn("p-1 rounded-md transition-all", isActive ? "bg-yellow-200 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "")}>
                {icon}
            </div>
            <span className={cn(
                "text-[10px] font-handwriting text-lg leading-none mt-1",
                isActive && "font-bold text-gray-900"
            )}>{label}</span>
        </Link>
    )
}
