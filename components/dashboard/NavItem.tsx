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

    // Check if active: exact match for /dashboard, startsWith for others
    const isActive = href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium",
                isActive
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
        >
            {icon}
            <span>{label}</span>
            {badge && (
                <span className="ml-auto text-[10px] uppercase font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
        </Link>
    )
}

export function MobileNavItem({ href, icon, label }: NavItemProps) {
    const pathname = usePathname()

    // Check if active: exact match for /dashboard, startsWith for others
    const isActive = href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(href)

    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all active:scale-95",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
        >
            {icon}
            <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-bold"
            )}>{label}</span>
        </Link>
    )
}
