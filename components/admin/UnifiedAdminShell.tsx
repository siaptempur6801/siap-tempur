'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    CreditCard,
    FileQuestion,
    LayoutDashboard,
    Menu,
    Package,
    ShieldCheck,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import TempurPassIndicator from '@/components/dashboard/TempurPassIndicator'

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
    hasActiveTempurPass: boolean
    signoutAction: () => Promise<{ success: boolean }>
}

type NavItem = {
    href: string
    label: string
    mobileLabel?: string
    icon: typeof ShieldCheck
    adminOnly?: boolean
    content?: boolean
}

const CONTEXTS = [
    { program: 'CPNS', track: 'SKD' },
    { program: 'TKA', track: 'SD' },
    { program: 'TKA', track: 'SMP' },
    { program: 'TKA', track: 'SMA' },
] as const

const groups: Array<{ label: string; items: NavItem[] }> = [
    {
        label: 'Overview',
        items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
        ],
    },
    {
        label: 'Content',
        items: [
            { href: '/admin/content/questions', label: 'Question Bank', mobileLabel: 'Soal', icon: FileQuestion, adminOnly: true },
            { href: '/admin/content/review', label: 'Review Queue', mobileLabel: 'Review', icon: ClipboardCheck, content: true },
            { href: '/admin/content/articles', label: 'Articles', icon: BookOpen, content: true },
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

const userDashboardItem: NavItem = { href: '/', label: 'Kembali ke aplikasi', mobileLabel: 'Aplikasi', icon: ArrowLeft }

function navIsActive(pathname: string, href: string) {
    if (href === '/admin') return pathname === '/admin'
    if (href === '/admin/commerce') return pathname === '/admin/commerce'
    return pathname === href || pathname.startsWith(`${href}/`)
}

function contextualNavHref(href: string, program: string, track: string) {
    if (!href.startsWith('/admin')) return href
    const query = new URLSearchParams({ program, track })
    return `${href}?${query.toString()}`
}

function AdminNavLink({ item, collapsed, contextHref, onNavigate }: { item: NavItem; collapsed: boolean; contextHref: string; onNavigate?: () => void }) {
    const pathname = usePathname()
    const active = navIsActive(pathname, item.href)
    const Icon = item.icon
    return (
        <Link
            href={contextHref}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
                'group relative flex min-h-10 items-center rounded-xl px-3 text-sm font-bold transition',
                collapsed ? 'justify-center' : 'gap-3',
                active
                    ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-300 hover:bg-white/7 hover:text-white',
            )}
        >
            {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-400"/> : null}
            <Icon size={18} className={cn('shrink-0', active ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200')}/>
            {collapsed ? null : <span className="truncate">{item.label}</span>}
        </Link>
    )
}

function MobileNavLink({ item, contextHref }: { item: NavItem; contextHref: string }) {
    const pathname = usePathname()
    const active = navIsActive(pathname, item.href)
    const Icon = item.icon
    return (
        <Link href={contextHref} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold transition', active ? 'text-blue-600' : 'text-slate-500')}>
            <Icon size={19}/>
            <span className="max-w-full truncate">{item.mobileLabel || item.label}</span>
        </Link>
    )
}

export default function UnifiedAdminShell({ children, user, profile, roles, permissions, hasActiveTempurPass, signoutAction }: UnifiedAdminShellProps) {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

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

    const defaultProgram = pathname.startsWith('/admin/content/review') ? 'TKA' : 'CPNS'
    const defaultTrack = pathname.startsWith('/admin/content/review') ? 'SMP' : 'SKD'
    const requestedProgram = (searchParams.get('program') || defaultProgram).toUpperCase()
    const requestedTrack = (searchParams.get('track') || defaultTrack).toUpperCase()
    const validContext = CONTEXTS.find((context) => context.program === requestedProgram && context.track === requestedTrack) || CONTEXTS[0]
    const currentProgram = validContext.program
    const currentTrack = validContext.track
    const tracks = CONTEXTS.filter((context) => context.program === currentProgram).map((context) => context.track)

    const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Admin'
    const roleLabel = roles[0] || (isFullAdmin ? 'ADMIN' : 'CONTENT')
    const mobileItems = visibleGroups.flatMap((group) => group.items).slice(0, 3).concat(userDashboardItem)
    const homeHref = contextualNavHref(isFullAdmin ? '/admin' : '/admin/content/review', currentProgram, currentTrack)

    function navigateContext(program: string, track: string) {
        const next = new URLSearchParams(searchParams.toString())
        next.set('program', program)
        next.set('track', track)
        for (const key of ['subject', 'status', 'stage', 'reviewer', 'q', 'question', 'new', 'edit', 'ok', 'error']) next.delete(key)
        router.push(`${pathname}?${next.toString()}`)
        setMobileOpen(false)
    }

    function changeProgram(program: string) {
        const nextTrack = CONTEXTS.find((context) => context.program === program)?.track || 'SKD'
        navigateContext(program, nextTrack)
    }

    const sidebar = (
        <div className="flex h-full flex-col bg-[#08172f] text-white">
            <div className={cn('flex h-16 shrink-0 items-center border-b border-white/10', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
                <Link href={homeHref} onClick={() => setMobileOpen(false)} className={cn('min-w-0', collapsed && 'sr-only')}>
                    <div className="font-display text-lg font-black text-white">Siap<span className="text-cyan-300 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-300">Admin Workspace</div>
                </Link>
                <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white lg:inline-flex" aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}>
                    {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>} 
                </button>
                <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 md:hidden" aria-label="Tutup menu"><X size={18}/></button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                {visibleGroups.map((group) => (
                    <section key={group.label} className="mb-5">
                        {collapsed ? null : <div className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{group.label}</div>}
                        <div className="space-y-1">{group.items.map((item) => <AdminNavLink key={item.href} item={item} collapsed={collapsed} contextHref={contextualNavHref(item.href, currentProgram, currentTrack)} onNavigate={() => setMobileOpen(false)}/>)}</div>
                    </section>
                ))}
                <div className="mt-4 border-t border-white/10 pt-4"><AdminNavLink item={userDashboardItem} collapsed={collapsed} contextHref={userDashboardItem.href} onNavigate={() => setMobileOpen(false)}/></div>
            </nav>

            <div className="shrink-0 border-t border-white/10 p-3">
                <div className={cn('flex items-center rounded-2xl bg-white/6 p-2.5 ring-1 ring-white/10', collapsed ? 'justify-center' : 'gap-3')}>
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-sm font-black text-white">
                        {profile?.avatar_url ? <Image src={profile.avatar_url} alt="Avatar admin" fill className="object-cover" sizes="36px"/> : <span>{user.email?.[0]?.toUpperCase() || 'A'}</span>}
                    </div>
                    {collapsed ? null : (
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-extrabold text-white">{displayName}</p>
                            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{roleLabel}</p>
                        </div>
                    )}
                </div>
                {collapsed ? null : <div className="mt-2 flex justify-end"><SidebarSignoutButton signoutAction={signoutAction}/></div>}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#f4f7fb] font-body text-slate-950">
            <aside className={cn('fixed inset-y-0 left-0 z-50 hidden transition-[width] duration-200 md:block', collapsed ? 'w-[76px]' : 'w-[260px]')}>{sidebar}</aside>

            {mobileOpen ? <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}><aside className="h-full w-[280px]" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div> : null}

            <div className={cn('min-h-screen transition-[padding] duration-200', collapsed ? 'md:pl-[76px]' : 'md:pl-[260px]')}>
                <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
                    <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
                        <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden" aria-label="Buka menu"><Menu size={19}/></button>

                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <label className="flex min-w-0 items-center gap-2">
                                <span className="hidden text-xs font-bold text-slate-400 lg:inline">Program</span>
                                <select value={currentProgram} onChange={(event) => changeProgram(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                                    <option value="CPNS">CPNS</option>
                                    <option value="TKA">TKA</option>
                                </select>
                            </label>
                            <label className="flex min-w-0 items-center gap-2">
                                <span className="hidden text-xs font-bold text-slate-400 lg:inline">Track</span>
                                <select value={currentTrack} onChange={(event) => navigateContext(currentProgram, event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                                    {tracks.map((track) => <option key={track} value={track}>{track}</option>)}
                                </select>
                            </label>
                            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 xl:inline">Context aktif</span>
                            {hasActiveTempurPass && <TempurPassIndicator href="/tka/smp/pass" compact />}
                        </div>

                        <div className="hidden items-center gap-3 sm:flex">
                            <div className="text-right">
                                <div className="max-w-40 truncate text-xs font-extrabold text-slate-900">{displayName}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{roleLabel}</div>
                            </div>
                            <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-slate-100 text-center text-sm font-black leading-9 text-slate-700 ring-1 ring-slate-200">
                                {profile?.avatar_url ? <Image src={profile.avatar_url} alt="Avatar admin" fill className="object-cover" sizes="36px"/> : user.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-[1600px] px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:px-8 lg:pb-8">{children}</main>
            </div>

            <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden">
                {mobileItems.map((item) => <MobileNavLink key={item.href} item={item} contextHref={contextualNavHref(item.href, currentProgram, currentTrack)}/>) }
            </nav>
        </div>
    )
}
