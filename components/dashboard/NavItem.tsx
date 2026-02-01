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
                "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
                isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
            )}
        >
            <div className="flex items-center gap-3">
                <span className={cn("transition-transform group-hover:scale-110", isActive && "text-primary")}>
                    {icon}
                </span>
                <span>{label}</span>
            </div>
            {badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
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
