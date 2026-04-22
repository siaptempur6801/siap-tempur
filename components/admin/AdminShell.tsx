'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    ArrowLeft,
    BarChart3,
    ClipboardList,
    FileSpreadsheet,
    Settings,
    Shield,
    Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'

interface AdminShellProps {
    children: React.ReactNode
    user: {
        id: string
        email?: string
        user_metadata?: {
            full_name?: string
            name?: string
        }
    }
    profile: {
        avatar_url?: string | null
        full_name?: string | null
    } | null
    signoutAction: () => Promise<{ success: boolean }>
}

const navItems = [
    { href: '/cpns/admin', label: 'Bank Soal', icon: ClipboardList },
    { href: '/cpns/admin/tryout-config', label: 'Konfigurasi Tryout', icon: Settings },
    { href: '/cpns/admin/event', label: 'Event', icon: BarChart3 },
    { href: '/cpns/admin/voucher', label: 'Voucher', icon: Ticket },
    { href: '/cpns/admin/export', label: 'Export Data', icon: FileSpreadsheet },
]

const userDashboardItem = { href: '/cpns/dashboard', label: 'Dashboard User', icon: ArrowLeft }

function AdminNavLink({
    href,
    label,
    icon: Icon,
    disabled = false,
}: {
    href: string
    label: string
    icon: typeof Shield
    disabled?: boolean
}) {
    const pathname = usePathname()
    const isActive = href === '/cpns/admin' ? pathname === href : pathname.startsWith(href)

    if (disabled) {
        return (
            <div className="flex items-center justify-between rounded-md border-2 border-dashed border-gray-300 px-3 py-2.5 font-handwriting text-xl text-gray-400">
                <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span className="font-semibold">{label}</span>
                </div>
                <span className="rounded-sm border-2 border-gray-300 bg-white px-1.5 py-0.5 text-xs font-bold uppercase text-gray-400">
                    Soon
                </span>
            </div>
        )
    }

    return (
        <Link
            href={href}
            className={cn(
                'group flex items-center justify-between rounded-md border-2 px-3 py-2.5 font-handwriting text-xl transition-all duration-200',
                isActive
                    ? 'translate-x-1 -translate-y-1 border-gray-900 bg-gray-900 font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)]'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900'
            )}
        >
            <div className="flex items-center gap-3">
                <span className="transition-transform group-hover:rotate-12">
                    <Icon size={20} />
                </span>
                <span>{label}</span>
            </div>
        </Link>
    )
}

function AdminMobileNavLink({
    href,
    label,
    icon: Icon,
    disabled = false,
}: {
    href: string
    label: string
    icon: typeof Shield
    disabled?: boolean
}) {
    const pathname = usePathname()
    const isActive = href === '/cpns/admin' ? pathname === href : pathname.startsWith(href)
    const content = (
        <>
            <div
                className={cn(
                    'rounded-md p-1 transition-all',
                    isActive ? 'border-2 border-gray-900 bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]' : ''
                )}
            >
                <Icon size={20} />
            </div>
            <span className={cn('mt-1 text-[10px] font-handwriting text-lg leading-none', isActive && 'font-bold text-gray-900')}>
                {label}
            </span>
        </>
    )

    if (disabled) {
        return (
            <div className="flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-gray-300">
                {content}
            </div>
        )
    }

    return (
        <Link
            href={href}
            className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-all active:scale-95',
                isActive ? 'font-bold text-gray-900' : 'text-gray-500 hover:text-gray-900'
            )}
        >
            {content}
        </Link>
    )
}

export default function AdminShell({ children, user, profile, signoutAction }: AdminShellProps) {
    const displayName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        'Admin'

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8f8f6] font-body text-gray-950">
            <div className="flex h-full min-h-0 w-full">
                <aside className="relative z-20 hidden h-full w-64 shrink-0 flex-col border-r-2 border-gray-900 bg-[#f8f8f6] shadow-[4px_0px_0px_0px_rgba(0,0,0,0.08)] md:flex">
                    <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                    <div className="relative z-10 shrink-0 p-6">
                        <Link href="/cpns/admin" className="group flex flex-col items-start">
                            <span className="text-xl font-handwriting font-bold uppercase leading-tight text-gray-900 transition-transform group-hover:rotate-0">
                                ADMIN CPNS
                            </span>
                            <span className="ml-1 -mt-1 text-xs font-handwriting font-bold text-gray-500 transition-colors group-hover:text-gray-900">
                                by Siap<span className="text-gray-900 underline decoration-wavy decoration-2">Tempur</span>.
                            </span>
                        </Link>
                    </div>

                    <nav className="relative z-10 min-h-0 flex-1 space-y-3 overflow-hidden px-4">
                        {navItems.map((item) => (
                            <AdminNavLink key={item.href} {...item} />
                        ))}
                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4">
                            <AdminNavLink {...userDashboardItem} />
                        </div>
                    </nav>

                    <div className="relative z-10 shrink-0 border-t-2 border-gray-900 p-4">
                        <div className="mb-4 flex items-center gap-3 border-2 border-gray-900 bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:rotate-0 md:-rotate-1">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-gray-900 bg-gray-100 font-bold text-gray-900">
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Avatar admin" fill className="object-cover" sizes="40px" />
                                ) : (
                                    <span>{user.email?.[0]?.toUpperCase() || 'A'}</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-handwriting text-sm font-bold text-gray-900">{displayName}</p>
                                <span className="mt-0.5 inline-flex items-center gap-1 border border-gray-900 bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    <Shield size={12} />
                                    Admin
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t-2 border-gray-900 pt-4">
                            <SidebarSignoutButton signoutAction={signoutAction} />
                        </div>
                    </div>
                </aside>

                <main className="relative min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b-2 border-gray-900 bg-[#f8f8f6]/90 px-6 shadow-sm backdrop-blur-md md:hidden">
                        <div className="flex items-center justify-between gap-3">
                            <Link href="/cpns/admin" className="group flex flex-col items-start">
                                <span className="text-lg font-handwriting font-bold uppercase leading-tight text-gray-900">
                                    ADMIN CPNS
                                </span>
                                <span className="ml-1 -mt-1 text-[10px] font-handwriting font-bold text-gray-500">
                                    by Siap<span className="text-gray-900 underline decoration-wavy decoration-2">Tempur</span>.
                                </span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/cpns/dashboard"
                                className="rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                User
                            </Link>
                            <SidebarSignoutButton signoutAction={signoutAction} />
                        </div>
                    </header>

                    <div className="mx-auto max-w-7xl p-6 md:p-8">
                        {children}
                    </div>
                </main>

                <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-gray-900 bg-[#f8f8f6]/90 backdrop-blur-xl md:hidden">
                    <div className="grid grid-cols-5 gap-1 px-2 py-2">
                        {[...navItems.slice(0, 4), userDashboardItem].map((item) => (
                            <AdminMobileNavLink key={item.href} {...item} />
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    )
}
