'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    Dumbbell,
    LayoutDashboard,
    ListChecks,
    ShieldCheck,
    Ticket,
    Timer,
    User,
} from 'lucide-react'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import styles from '@/components/tka/TkaLearning.module.css'
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
        '--st-paper': '#f8fafc',
        '--st-paper-strong': '#f1f5f9',
        '--st-border': '1px solid #e2e8f0',
        '--st-shadow-sm': '0 2px 8px rgba(15, 23, 42, 0.04)',
        '--st-shadow-md': '0 8px 24px rgba(15, 23, 42, 0.06)',
        '--st-shadow-lg': '0 16px 36px rgba(79, 70, 229, 0.08)',
        '--st-radius-sm': '0.625rem',
        '--st-radius-md': '0.875rem',
        '--st-radius-lg': '1rem',
    } as React.CSSProperties

    return (
        <div
            data-experience-mode="learning"
            data-program={`tka-${level.toLowerCase()}`}
            className={`${styles.learning} st-product flex h-dvh overflow-hidden bg-[#f8fafc] font-body text-slate-950`}
            style={learnerSurface}
        >
            <aside className="relative z-20 hidden w-[16.5rem] min-h-0 flex-col border-r border-slate-200/80 bg-white md:flex">
                <div className="shrink-0 px-4 pb-4 pt-5">
                    <div className="flex items-center justify-between">
                        <Link href="/tka" className="st-focus inline-flex items-center focus-visible:outline-none">
                            <span className="font-handwriting text-[1.65rem] font-black leading-tight text-slate-950">
                                Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                            </span>
                        </Link>
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black tracking-wide text-indigo-700">
                            TKA
                        </span>
                    </div>
                    <div className="mt-3.5">
                        <TkaLevelSwitcher activeLevel={level} />
                    </div>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2 scrollbar-none" aria-label={`Navigasi TKA ${level}`}>
                    <p className="mb-1.5 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Pusat Belajar</p>
                    <div className="space-y-1">
                        <NavItem href={basePath} icon={<LayoutDashboard size={17} />} label="Ringkasan" exact variant="soft" />
                        <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/diagnostic')} icon={<BrainCircuit size={17} />} label="Tes Diagnostik" variant="soft" />
                        <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/focus')} icon={<Dumbbell size={17} />} label="Latihan Fokus" variant="soft" />
                        <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/mini-tryout')} icon={<Timer size={17} />} label="Mini Tryout" variant="soft" />
                        <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/tryout')} icon={<ListChecks size={17} />} label="Tryout" variant="soft" />
                        <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={17} />} label="Bank Soal Salah" variant="soft" />
                        <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/progress')} icon={<BarChart3 size={17} />} label="Perkembangan" variant="soft" />
                    </div>

                    <div className="my-3.5 border-t border-slate-100" />
                    <p className="mb-1.5 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Akun & Akses</p>
                    <div className="space-y-1">
                        <NavItem href={`${basePath}/profile`} icon={<User size={17} />} label="Profil Siswa" variant="soft" />
                        <NavItem active={level === 'SMP' ? undefined : false} href={level === 'SMP' ? `${basePath}/pass` : basePath} icon={<Ticket size={17} />} label="Tempur Pass" variant="soft" />
                        <NavItem href={`${basePath}/beli-token`} icon={<Ticket size={17} />} label="Beli Token" variant="soft" />
                        <NavItem href="/cpns/dashboard" icon={<ShieldCheck size={17} />} label="Jalur CPNS" variant="soft" />
                    </div>
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-3">
                    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/60 p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Link href={`${basePath}/profile`} aria-label="Buka profil" className="st-focus relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100 text-sm font-black text-indigo-700 ring-2 ring-white shadow-sm">
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="40px" />
                                ) : (
                                    <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                                )}
                            </Link>
                            <div className="min-w-0 flex-1">
                                <Link href={`${basePath}/profile`} className="st-focus block truncate text-[13px] font-black text-slate-900 hover:text-indigo-600 transition-colors">{displayName}</Link>
                                <Link href={`${basePath}/beli-token`} className="st-focus mt-0.5 inline-flex min-h-5 items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:underline">
                                    <Ticket size={12} className="text-indigo-600" />
                                    <span>{tokenBalance} token</span>
                                </Link>
                            </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                            <Link href={`${basePath}/beli-token`} className="font-bold text-indigo-600 hover:text-indigo-800 text-[11px] hover:underline">
                                + Isi Token
                            </Link>
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" />
                        </div>
                    </div>
                </div>
            </aside>

            <div className="relative min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl md:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Link href="/tka" className="st-focus font-handwriting text-xl font-black text-slate-950">
                            Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </Link>
                        <div className="flex items-center gap-2">
                            <Link
                                href={`${basePath}/beli-token`}
                                aria-label={`${tokenBalance} token tersisa`}
                                className="st-focus inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 text-[11px] font-black text-indigo-700 shadow-xs"
                            >
                                <Ticket size={13} aria-hidden="true" />
                                <span className="tabular-nums">{tokenBalance}</span>
                                <span className="hidden min-[390px]:inline">token</span>
                            </Link>
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">TKA</span>
                            <Link href={`${basePath}/profile`} aria-label="Buka profil" title="Profil dan pengaturan" className="st-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                                <User size={17} />
                            </Link>
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" compact />
                        </div>
                    </div>
                    <div className="px-3 pb-2.5">
                        <TkaLevelSwitcher activeLevel={level} compact />
                    </div>
                </div>

                <div className="mx-auto w-full max-w-6xl">
                    {children}
                </div>
            </div>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl md:hidden"
                aria-label="Navigasi utama TKA"
            >
                <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
                    <MobileNavItem href={basePath} icon={<LayoutDashboard size={20} />} label="Ringkasan" exact variant="soft" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/diagnostic')} icon={<BrainCircuit size={20} />} label="Diagnostik" variant="soft" />
                    <MobileNavItem active={level === 'SMP' ? undefined : false} href={featureHref('/focus')} icon={<Dumbbell size={20} />} label="Latihan" variant="soft" />
                    <MobileNavItem active={level === 'SMP' ? undefined : false} href={featureHref('/tryout')} icon={<ListChecks size={20} />} label="Tryout" variant="soft" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={20} />} label="Soal Salah" variant="soft" />
                </div>
            </nav>
        </div>
    )
}
