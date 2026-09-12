'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    Compass,
    Dumbbell,
    History,
    LayoutDashboard,
    ListChecks,
    Sparkles,
    Timer,
    User,
} from 'lucide-react'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import TempurPassIndicator from '@/components/dashboard/TempurPassIndicator'
import styles from '@/components/tka/TkaLearning.module.css'
import TkaLevelSwitcher from '@/components/tka/TkaLevelSwitcher'
import { parseTkaLevel } from '@/src/tka/context'

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
    hasActiveTempurPass: boolean
    signoutAction: () => Promise<{ success: boolean }>
}

export default function TkaDashboardShell({
    children,
    level: initialLevel,
    user,
    profile,
    hasActiveTempurPass,
    signoutAction,
}: TkaDashboardShellProps) {
    const pathname = usePathname()
    const levelFromPath = pathname?.match(/^\/tka\/(sd|smp|sma)(?:\/|$)/i)?.[1]
    const level = parseTkaLevel(levelFromPath) ?? initialLevel
    const basePath = `/tka/${level.toLowerCase()}`
    const isReviewSession = pathname.includes('/review') || pathname.includes('/pembahasan')
    const isTryoutSession = pathname.includes('/tryout/')
    const isDiagnosticSession = /\/diagnostic\/[0-9a-f-]+$/i.test(pathname)
    const isFocusedSession = isTryoutSession || isDiagnosticSession || pathname.includes('/remedial/') || isReviewSession
    const isTryoutArea = pathname.startsWith(`${basePath}/tryout`) || pathname.startsWith(`${basePath}/mini-tryout`)
    const featureHref = (path: string) => level === 'SMP' ? `${basePath}${path}` : basePath
    const accessHref = level === 'SMP' ? `${basePath}/pass` : basePath

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
            className={`${styles.learning} flex h-dvh overflow-hidden bg-slate-50/60 font-body text-slate-950`}
            style={learnerSurface}
        >
            <aside className="relative z-20 hidden w-[17rem] min-h-0 flex-col border-r border-slate-200/80 bg-white shadow-xs md:flex">
                <div className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-5">
                    <div className="flex items-center justify-between">
                        <Link href="/tka" className="inline-flex items-center focus-visible:outline-none">
                            <span className="font-handwriting text-[1.65rem] font-black leading-tight text-slate-950">
                                Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                            </span>
                        </Link>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-700 ring-1 ring-indigo-200/70 shadow-2xs uppercase">
                            TKA
                        </span>
                    </div>
                    <div className="mt-3.5">
                        <TkaLevelSwitcher activeLevel={level} />
                    </div>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 scrollbar-none space-y-4" aria-label={`Navigasi TKA ${level}`}>
                    <div>
                        <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pusat Belajar</p>
                        <div className="space-y-1">
                            <NavItem href={basePath} icon={<LayoutDashboard size={17} />} label="Ringkasan" exact variant="soft" />
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/diagnostic')} icon={<BrainCircuit size={17} />} label="Tes Diagnostik" variant="soft" />
                            <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/focus')} icon={<Dumbbell size={17} />} label="Latihan Fokus" variant="soft" />
                            <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/mini-tryout')} icon={<Timer size={17} />} label="Mini Tryout" variant="soft" />
                            <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/tryout')} icon={<ListChecks size={17} />} label="Tryout" variant="soft" />
                        </div>
                    </div>

                    <div>
                        <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Evaluasi</p>
                        <div className="space-y-1">
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/riwayat')} icon={<History size={17} />} label="Riwayat" variant="soft" />
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={17} />} label="Bank Soal Salah" variant="soft" />
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/progress')} icon={<BarChart3 size={17} />} label="Perkembangan" variant="soft" />
                        </div>
                    </div>

                    <div>
                        <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Akun & Akses</p>
                        <div className="space-y-1">
                            <NavItem active={level === 'SMP' ? undefined : false} href={accessHref} icon={<Sparkles size={17} />} label="Tempur Pass" badge={hasActiveTempurPass ? 'Aktif' : undefined} variant="soft" />
                            <NavItem href={`${basePath}/pilih-jalur`} icon={<Compass size={17} />} label="Pilih Jalur" variant="soft" />
                            <NavItem href={`${basePath}/profile`} icon={<User size={17} />} label="Profil Siswa" variant="soft" />
                        </div>
                    </div>
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/30 p-3.5 shadow-xs">
                        <div className="flex items-center gap-3">
                            <Link href={`${basePath}/profile`} aria-label="Buka profil" className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700 ring-2 ring-indigo-100 shadow-xs transition hover:scale-105">
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="40px" />
                                ) : (
                                    <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                                )}
                            </Link>
                            <div className="min-w-0 flex-1">
                                <Link href={`${basePath}/profile`} className="block truncate text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors">{displayName}</Link>
                                {hasActiveTempurPass ? (
                                    <TempurPassIndicator href={accessHref} className="mt-1" compact />
                                ) : (
                                    <Link href={accessHref} className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs hover:bg-indigo-100/70 transition">
                                        <Sparkles size={12} className="text-indigo-600" />
                                        <span>Tempur Pass</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                            <Link href={accessHref} className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 text-[11px] hover:underline">
                                Kelola akses
                            </Link>
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" variant="soft" />
                        </div>
                    </div>
                </div>
            </aside>

            <div className="relative min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl md:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Link href="/tka" className="font-handwriting text-xl font-black text-slate-950">
                            Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </Link>
                        <div className="flex items-center gap-2">
                            {hasActiveTempurPass && <TempurPassIndicator href={accessHref} compact />}
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200/60">TKA</span>
                            <Link href={`${basePath}/profile`} aria-label="Buka profil" title="Profil dan pengaturan" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition">
                                <User size={17} />
                            </Link>
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" compact variant="soft" />
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
                <div className="grid grid-cols-6 gap-1 px-2 py-1.5">
                    <MobileNavItem href={basePath} icon={<LayoutDashboard size={20} />} label="Ringkasan" exact variant="soft" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/diagnostic')} icon={<BrainCircuit size={20} />} label="Diagnostik" variant="soft" />
                    <MobileNavItem active={level === 'SMP' ? undefined : false} href={featureHref('/focus')} icon={<Dumbbell size={20} />} label="Latihan" variant="soft" />
                    <MobileNavItem active={level === 'SMP' ? isTryoutArea : false} href={featureHref('/tryout')} icon={<ListChecks size={20} />} label="Tryout" variant="soft" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/riwayat')} icon={<History size={20} />} label="Riwayat" variant="soft" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={20} />} label="Soal Salah" variant="soft" />
                </div>
            </nav>
        </div>
    )
}
