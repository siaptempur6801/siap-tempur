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
            <aside className="relative z-20 hidden w-[17rem] min-h-0 flex-col border-r-2 border-slate-900 bg-[#fbfaf7] md:flex">
                <div className="shrink-0 border-b-2 border-slate-900 px-4 pb-4 pt-5">
                    <div className="flex items-center justify-between">
                        <Link href="/tka" className="inline-flex items-center focus-visible:outline-none">
                            <span className="font-script text-[1.65rem] font-black leading-tight text-slate-950">
                                Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                            </span>
                        </Link>
                        <span className="inline-flex items-center rounded-full border-2 border-slate-900 bg-[var(--st-yellow-soft)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900">
                            TKA
                        </span>
                    </div>
                    <div className="mt-3.5">
                        <TkaLevelSwitcher activeLevel={level} />
                    </div>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 scrollbar-none space-y-4" aria-label={`Navigasi TKA ${level}`}>
                    <div>
                        <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Pusat Belajar</p>
                        <div className="space-y-1">
                            <NavItem href={basePath} icon={<LayoutDashboard size={17} />} label="Ringkasan" exact />
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/diagnostic')} icon={<BrainCircuit size={17} />} label="Tes Diagnostik" />
                            <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/focus')} icon={<Dumbbell size={17} />} label="Latihan Fokus" />
                            <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/mini-tryout')} icon={<Timer size={17} />} label="Mini Tryout" />
                            <NavItem active={level === 'SMP' ? undefined : false} href={featureHref('/tryout')} icon={<ListChecks size={17} />} label="Tryout" />
                        </div>
                    </div>

                    <div className="border-t-2 border-dashed border-slate-300 pt-3.5">
                        <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Evaluasi</p>
                        <div className="space-y-1">
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/riwayat')} icon={<History size={17} />} label="Riwayat" />
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={17} />} label="Bank Soal Salah" />
                            <NavItem active={level === "SMP" ? undefined : false} href={featureHref('/progress')} icon={<BarChart3 size={17} />} label="Perkembangan" />
                        </div>
                    </div>

                    <div className="border-t-2 border-dashed border-slate-300 pt-3.5">
                        <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Akun & Akses</p>
                        <div className="space-y-1">
                            <NavItem active={level === 'SMP' ? undefined : false} href={accessHref} icon={<Sparkles size={17} />} label="Tempur Pass" badge={hasActiveTempurPass ? 'Aktif' : undefined} />
                            <NavItem href={`${basePath}/pilih-jalur`} icon={<Compass size={17} />} label="Pilih Jalur" />
                            <NavItem href={`${basePath}/profile`} icon={<User size={17} />} label="Profil Siswa" />
                        </div>
                    </div>
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-3">
                    <div className="rounded-2xl border-2 border-slate-900 bg-white p-3.5">
                        <div className="flex items-center gap-3">
                            <Link href={`${basePath}/profile`} aria-label="Buka profil" className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-[var(--st-yellow-soft)] text-sm font-black text-slate-900 transition hover:scale-105">
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
                                    <Link href={accessHref} className="mt-1 inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-[var(--st-yellow-soft)] px-2.5 py-0.5 text-[11px] font-black text-slate-900 hover:bg-white transition">
                                        <Sparkles size={12} className="text-indigo-600" />
                                        <span>Tempur Pass</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-slate-300 pt-2.5 text-xs">
                            <Link href={accessHref} className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 text-[11px] hover:underline">
                                Kelola akses
                            </Link>
                            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/tka" />
                        </div>
                    </div>
                </div>
            </aside>

            <div className="relative min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 border-b-2 border-slate-900 bg-white/95 backdrop-blur-xl md:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Link href="/tka" className="font-script text-xl font-black text-slate-950">
                            Siap<span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </Link>
                        <div className="flex items-center gap-2">
                            {hasActiveTempurPass && <TempurPassIndicator href={accessHref} compact />}
                            <span className="rounded-full border-2 border-slate-900 bg-[var(--st-yellow-soft)] px-2 py-0.5 text-[10px] font-black text-slate-900">TKA</span>
                            <Link href={`${basePath}/profile`} aria-label="Buka profil" title="Profil dan pengaturan" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-700 hover:bg-[var(--st-yellow-soft)] transition">
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
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(13,43,69,0.04)] backdrop-blur-xl md:hidden"
                aria-label="Navigasi utama TKA"
            >
                <div className="grid grid-cols-6 gap-1 px-2 py-1.5">
                    <MobileNavItem href={basePath} icon={<LayoutDashboard size={20} />} label="Ringkasan" exact />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/diagnostic')} icon={<BrainCircuit size={20} />} label="Diagnostik" />
                    <MobileNavItem active={level === 'SMP' ? undefined : false} href={featureHref('/focus')} icon={<Dumbbell size={20} />} label="Latihan" />
                    <MobileNavItem active={level === 'SMP' ? isTryoutArea : false} href={featureHref('/tryout')} icon={<ListChecks size={20} />} label="Tryout" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/riwayat')} icon={<History size={20} />} label="Riwayat" />
                    <MobileNavItem active={level === "SMP" ? undefined : false} href={featureHref('/wrong-questions')} icon={<BookOpenCheck size={20} />} label="Soal Salah" />
                </div>
            </nav>
        </div>
    )
}
