'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    Home,
    LayoutDashboard,
    ListChecks,
    ShieldCheck,
    Ticket,
} from 'lucide-react'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import styles from '@/components/dashboard/CompactLearning.module.css'
import TkaLevelSwitcher from '@/components/tka/TkaLevelSwitcher'

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
    tokenBalance: number
    signoutAction: () => Promise<{ success: boolean }>
}

export default function TkaDashboardShell({
    children,
    level,
    user,
    profile,
    tokenBalance,
    signoutAction,
}: TkaDashboardShellProps) {
    const pathname = usePathname()
    const basePath = `/tka/${level.toLowerCase()}`
    const isTryoutSession = pathname.includes('/tryout/') && !pathname.endsWith('/result')
    const isDiagnosticSession = /\/diagnostic\/[0-9a-f-]+$/i.test(pathname)
    const isFocusedSession = isTryoutSession || isDiagnosticSession || pathname.includes('/remedial/')
    const featureHref = (path: string) => level === 'SMP' ? `${basePath}${path}` : basePath

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

    const learnerSurface = {
        '--st-paper': '#f6f7fb',
        '--st-paper-strong': '#eef1f7',
        '--st-border': '1px solid #e4e7f0',
        '--st-shadow-sm': '0 6px 18px rgba(15, 23, 42, 0.05)',
        '--st-shadow-md': '0 10px 28px rgba(15, 23, 42, 0.065)',
        '--st-shadow-lg': '0 16px 38px rgba(79, 70, 229, 0.10)',
        '--st-radius-sm': '0.75rem',
        '--st-radius-md': '0.95rem',
        '--st-radius-lg': '1.15rem',
    } as React.CSSProperties

    return (
        <div
            data-experience-mode="learning"
            data-program={`tka-${level.toLowerCase()}`}
            className={`${styles.compact} st-product flex h-screen overflow-hidden bg-[#f6f7fb] font-body text-slate-950`}
            style={learnerSurface}
        >
            <aside className="relative z-20 hidden w-[16rem] min-h-0 flex-col border-r border-slate-200/80 bg-white md:flex">
                <div className="shrink-0 px-4 pb-3.5 pt-5">
                    <Link href="/tka" className="st-focus inline-flex items-center focus-visible:outline-none">
                        <span className="font-handwriting text-[1.65rem] font-black leading-tight text-slate-950">
                            Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </span>
                    </Link>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">Dashboard TKA</p>
                    <div className="mt-3.5">
                        <TkaLevelSwitcher activeLevel={level} />
                    </div>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5" aria-label="Navigasi dashboard TKA">
                    <p className="mb-1.5 px-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Belajar</p>
                    <div className="space-y-1">
                        <NavItem href="/tka" icon={<Home size={17} />} label="Beranda" exact variant="soft" />
                        <NavItem href={basePath} icon={<LayoutDashboard size={17} />} label={`TKA ${level}`} exact variant="soft" />
                        <NavItem href={featureHref('/diagnostic')} icon={<BrainCircuit size={17} />} label="Tes Diagnostik" variant="soft" />
                        <NavItem href={featureHref('/progress')} icon={<BarChart3 size={17} />} label="Perkembangan" variant="soft" />
                        <NavItem href={level === 'SMP' ? `${basePath}#tka-tryout` : basePath} icon={<ListChecks size={17} />} label="Tryout" variant="soft" />
                        <NavItem href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={17} />} label="Soal Salah" variant="soft" />
                    </div>

                    <div className="my-3.5 border-t border-slate-100" />
                    <p className="mb-1.5 px-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Akun & akses</p>
                    <div className="space-y-1">
                        <NavItem href={level === 'SMP' ? `${basePath}#tempur-pass` : basePath} icon={<Ticket size={17} />} label="Tempur Pass" variant="soft" />
                        <NavItem href="/cpns/dashboard" icon={<ShieldCheck size={17} />} label="Dashboard CPNS" variant="soft" />
                    </div>
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="36px" />
                                ) : (
                                    <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-black text-slate-900">{displayName}</p>
                                <Link href={level === 'SMP' ? `${basePath}#tempur-pass` : basePath} className="st-focus mt-0.5 inline-flex min-h-6 items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:underline">
                                    <Ticket size={12} /> {tokenBalance} token tersisa
                                </Link>
                            </div>
                        </div>
                        <div className="mt-1.5 flex justify-end">
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" />
                        </div>
                    </div>
                </div>
            </aside>

            <div className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl md:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Link href="/tka" className="st-focus font-handwriting text-xl font-black text-slate-950">
                            Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </Link>
                        <div className="flex items-center gap-2">
                            <Link
                                href={level === 'SMP' ? `${basePath}#tempur-pass` : basePath}
                                aria-label={`${tokenBalance} token tersisa`}
                                className="st-focus inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-[11px] font-black text-indigo-700"
                            >
                                <Ticket size={13} aria-hidden="true" />
                                <span className="tabular-nums">{tokenBalance}</span>
                                <span className="hidden min-[390px]:inline">token</span>
                            </Link>
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">TKA</span>
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" compact />
                        </div>
                    </div>
                    <div className="px-3.5 pb-2.5">
                        <TkaLevelSwitcher activeLevel={level} compact />
                    </div>
                </div>

                <div className="mx-auto w-full max-w-6xl">
                    {children}
                </div>
            </div>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.045)] backdrop-blur-xl md:hidden"
                aria-label="Navigasi utama TKA"
            >
                <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
                    <MobileNavItem href="/tka" icon={<Home size={20} />} label="Beranda" exact variant="soft" />
                    <MobileNavItem href={featureHref('/diagnostic')} icon={<BrainCircuit size={20} />} label="Diagnostik" variant="soft" />
                    <MobileNavItem href={featureHref('/progress')} icon={<BarChart3 size={20} />} label="Progress" variant="soft" />
                    <MobileNavItem href={level === 'SMP' ? `${basePath}#tka-tryout` : basePath} icon={<ListChecks size={20} />} label="Tryout" variant="soft" />
                    <MobileNavItem href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={20} />} label="Review" variant="soft" />
                </div>
            </nav>
        </div>
    )
}
