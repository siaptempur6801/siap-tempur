'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    CreditCard,
    FileQuestion,
    LayoutDashboard,
    Package,
    Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'

interface UnifiedAdminShellProps {
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
    roles: string[]
    permissions: string[]
    signoutAction: () => Promise<{ success: boolean }>
}

type NavItem = {
    href: string
    label: string
    mobileLabel?: string
    icon: typeof Shield
    adminOnly?: boolean
    content?: boolean
}

const groups: Array<{ label: string; items: NavItem[] }> = [
    {
        label: 'Overview',
        items: [
            { href: '/admin', label: 'Dashboard Admin', mobileLabel: 'Admin', icon: LayoutDashboard, adminOnly: true },
        ],
    },
    {
        label: 'Content',
        items: [
            { href: '/admin/content/review', label: 'Reviewer Workspace', mobileLabel: 'Review', icon: ClipboardCheck, content: true },
            { href: '/admin/content/questions', label: 'Question Bank', mobileLabel: 'Soal', icon: FileQuestion, adminOnly: true },
            { href: '/admin/content/articles', label: 'Artikel', mobileLabel: 'Artikel', icon: BookOpen, content: true },
        ],
    },
    {
        label: 'Assessment',
        items: [
            { href: '/admin/assessment/exams', label: 'Exams', icon: FileQuestion, adminOnly: true },
            { href: '/admin/assessment/events', label: 'Events', icon: CalendarDays, adminOnly: true },
        ],
    },
    {
        label: 'Commerce',
        items: [
            { href: '/admin/commerce/products', label: 'Products', icon: Package, adminOnly: true },
            { href: '/admin/commerce', label: 'Orders & Payments', mobileLabel: 'Commerce', icon: CreditCard, adminOnly: true },
        ],
    },
]

const userDashboardItem: NavItem = { href: '/', label: 'Beranda User', mobileLabel: 'Beranda', icon: ArrowLeft }

function navIsActive(pathname: string, href: string) {
    if (href === '/admin') return pathname === '/admin'
    if (href === '/admin/commerce') return pathname === '/admin/commerce'
    return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminNavLink({ item }: { item: NavItem }) {
    const pathname = usePathname()
    const active = navIsActive(pathname, item.href)
    const Icon = item.icon
    return (
        <Link
            href={item.href}
            className={cn(
                'group flex items-center justify-between rounded-md border-2 px-3 py-2.5 font-handwriting text-xl transition-all duration-200',
                active
                    ? 'translate-x-1 -translate-y-1 border-gray-900 bg-gray-900 font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)]'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900',
            )}
        >
            <span className="flex items-center gap-3">
                <span className="transition-transform group-hover:rotate-12"><Icon size={20}/></span>
                <span>{item.label}</span>
            </span>
        </Link>
    )
}

function MobileNavLink({ item }: { item: NavItem }) {
    const pathname = usePathname()
    const active = navIsActive(pathname, item.href)
    const Icon = item.icon
    return (
        <Link href={item.href} className={cn('flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-all active:scale-95', active ? 'font-bold text-gray-900' : 'text-gray-500 hover:text-gray-900')}>
            <div className={cn('rounded-md p-1 transition-all', active ? 'border-2 border-gray-900 bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]' : '')}><Icon size={20}/></div>
            <span className={cn('mt-1 text-[10px] font-handwriting text-lg leading-none', active && 'font-bold text-gray-900')}>{item.mobileLabel || item.label}</span>
        </Link>
    )
}

export default function UnifiedAdminShell({ children, user, profile, roles, permissions, signoutAction }: UnifiedAdminShellProps) {
    const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Admin'
    const permissionSet = new Set(permissions)
    const isFullAdmin = permissionSet.has('admin.access')
    const canAccessContent = [
        'content.read',
        'content.create',
        'content.update',
        'content.review',
        'content.publish',
    ].some((permission) => permissionSet.has(permission))

    const visibleGroups = groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (item.adminOnly) return isFullAdmin
                if (item.content) return isFullAdmin || canAccessContent
                return true
            }),
        }))
        .filter((group) => group.items.length > 0)

    const mobileItems = visibleGroups.flatMap((group) => group.items).slice(0, 3).concat(userDashboardItem)
    const roleLabel = roles[0] || (isFullAdmin ? 'ADMIN' : 'CONTENT')

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8f8f6] font-body text-gray-950">
            <div className="flex h-full min-h-0 w-full">
                <aside className="relative z-20 hidden h-full w-72 shrink-0 flex-col border-r-2 border-gray-900 bg-[#f8f8f6] shadow-[4px_0px_0px_0px_rgba(0,0,0,0.08)] md:flex">
                    <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}/>
                    <div className="relative z-10 shrink-0 p-6">
                        <Link href={isFullAdmin ? '/admin' : '/admin/content/review'} className="group flex flex-col items-start">
                            <span className="text-xl font-handwriting font-bold uppercase leading-tight text-gray-900">SIAP TEMPUR ADMIN</span>
                            <span className="ml-1 -mt-1 text-xs font-handwriting font-bold text-gray-500">Schema V2 · Multi Program</span>
                        </Link>
                    </div>
                    <nav className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                        {visibleGroups.map((group) => (
                            <section key={group.label} className="mb-5">
                                <div className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">{group.label}</div>
                                <div className="space-y-1">{group.items.map((item) => <AdminNavLink key={item.href} item={item}/>)}</div>
                            </section>
                        ))}
                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4"><AdminNavLink item={userDashboardItem}/></div>
                    </nav>
                    <div className="relative z-10 shrink-0 border-t-2 border-gray-900 p-4">
                        <div className="mb-4 flex items-center gap-3 border-2 border-gray-900 bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-gray-900 bg-gray-100 font-bold text-gray-900">
                                {profile?.avatar_url ? <Image src={profile.avatar_url} alt="Avatar admin" fill className="object-cover" sizes="40px"/> : <span>{user.email?.[0]?.toUpperCase() || 'A'}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-handwriting text-sm font-bold text-gray-900">{displayName}</p>
                                <span className="mt-0.5 inline-flex items-center gap-1 border border-gray-900 bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"><Shield size={12}/>{roleLabel}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t-2 border-gray-900 pt-4"><SidebarSignoutButton signoutAction={signoutAction}/></div>
                    </div>
                </aside>

                <main className="relative min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b-2 border-gray-900 bg-[#f8f8f6]/90 px-6 shadow-sm backdrop-blur-md md:hidden">
                        <Link href={isFullAdmin ? '/admin' : '/admin/content/review'} className="group flex flex-col items-start"><span className="text-lg font-handwriting font-bold uppercase leading-tight text-gray-900">SIAP TEMPUR ADMIN</span><span className="text-[10px] font-bold text-gray-500">Multi Program</span></Link>
                        <SidebarSignoutButton signoutAction={signoutAction}/>
                    </header>
                    <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
                </main>

                <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-gray-900 bg-[#f8f8f6]/90 backdrop-blur-xl md:hidden">
                    <div className="grid grid-cols-4 gap-1 px-2 py-2">{mobileItems.map((item) => <MobileNavLink key={item.href} item={item}/>)}</div>
                </nav>
            </div>
        </div>
    )
}
