'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    ArrowLeftRight,
    BarChart3,
    BookOpenCheck,
    LayoutDashboard,
    ListChecks,
    ShieldCheck,
    Ticket,
} from 'lucide-react'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'

interface TkaDashboardShellProps {
    children: React.ReactNode
    level: 'SD' | 'SMP' | 'SMA'
    user: {
        id: string
        email?: string
        user_metadata?: {
            full_name?: string
            name?: string
        }
    }
    profile: {
        avatar_url?: string
        full_name?: string
        display_name?: string
    } | null
    signoutAction: () => Promise<{ success: boolean }>
}

export default function TkaDashboardShell({
    children,
    level,
    user,
    profile,
    signoutAction,
}: TkaDashboardShellProps) {
    const pathname = usePathname()
    const basePath = `/tka/${level.toLowerCase()}`
    const isTryoutSession = pathname.includes('/tryout/') && !pathname.endsWith('/result')
    const isFocusedSession = isTryoutSession || pathname.includes('/remedial/')

    if (isFocusedSession) {
        return (
            <div data-experience-mode="exam" data-program={`tka-${level.toLowerCase()}`} className="st-product min-h-screen bg-white">
                {children}
            </div>
        )
    }

    const displayName = profile?.full_name ||
        profile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Pejuang SiapTempur'

    return (
        <div
            data-experience-mode="learning"
            data-program={`tka-${level.toLowerCase()}`}
            className="st-product flex h-screen overflow-hidden bg-[#f6f7fb] font-body text-slate-950"
        >
            <aside className="relative z-20 hidden w-[17.5rem] min-h-0 flex-col border-r border-slate-200/80 bg-white md:flex">
                <div className="shrink-0 px-6 pb-5 pt-7">
                    <Link href="/tka" className="st-focus inline-flex items-center focus-visible:outline-none">
                        <span className="font-handwriting text-3xl font-black leading-tight text-slate-950">
                            Siap<span className="text-indigo-600">Tempur</span>.
                        </span>
                    </Link>
                    <div className="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-indigo-700">
                        TKA {level}
                    </div>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3" aria-label={`Navigasi TKA ${level}`}>
                    <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Belajar</p>
                    <div className="space-y-1">
                        <NavItem href={basePath} icon={<LayoutDashboard size={18} />} label="Beranda" exact variant="soft" />
                        <NavItem href={`${basePath}/progress`} icon={<BarChart3 size={18} />} label="Perkembangan" variant="soft" />
                        <NavItem href={`${basePath}#tka-tryout`} icon={<ListChecks size={18} />} label="Tryout" variant="soft" />
                        <NavItem href={`${basePath}/wrong-questions`} icon={<BookOpenCheck size={18} />} label="Soal Salah" variant="soft" />
                    </div>

                    <div className="my-5 border-t border-slate-100" />
                    <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Akun & akses</p>
                    <div className="space-y-1">
                        <NavItem href={`${basePath}#tempur-pass`} icon={<Ticket size={18} />} label="Tempur Pass" variant="soft" />
                        <NavItem href="/tka" icon={<ArrowLeftRight size={18} />} label="Ganti Jenjang" variant="soft" />
                        <NavItem href="/cpns/dashboard" icon={<ShieldCheck size={18} />} label="Dashboard CPNS" variant="soft" />
                    </div>
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 font-black text-indigo-700 ring-1 ring-indigo-100">
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="44px" />
                                ) : (
                                    <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-slate-900">{displayName}</p>
                                <Link href={`${basePath}#tempur-pass`} className="st-focus mt-1 inline-flex min-h-6 items-center gap-1.5 text-xs font-bold text-indigo-700 hover:underline">
                                    <Ticket size={13} /> Akses TKA {level}
                                </Link>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                            <SidebarSignoutButton signoutAction={signoutAction} />
                        </div>
                    </div>
                </div>
            </aside>

            <div className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl md:hidden">
                    <Link href="/tka" className="st-focus font-handwriting text-2xl font-black text-slate-950">
                        Siap<span className="text-indigo-600">Tempur</span>.
                    </Link>
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black text-indigo-700">TKA {level}</span>
                </div>

                <div className="mx-auto w-full max-w-7xl">
                    {children}
                </div>
            </div>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl md:hidden"
                aria-label={`Navigasi utama TKA ${level}`}
            >
                <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
                    <MobileNavItem href={basePath} icon={<LayoutDashboard size={20} />} label="Beranda" exact variant="soft" />
                    <MobileNavItem href={`${basePath}/progress`} icon={<BarChart3 size={20} />} label="Progress" variant="soft" />
                    <MobileNavItem href={`${basePath}#tka-tryout`} icon={<ListChecks size={20} />} label="Tryout" variant="soft" />
                    <MobileNavItem href={`${basePath}/wrong-questions`} icon={<BookOpenCheck size={20} />} label="Review" variant="soft" />
                    <MobileNavItem href={`${basePath}#tempur-pass`} icon={<Ticket size={20} />} label="Akses" variant="soft" />
                </div>
            </nav>
        </div>
    )
}
