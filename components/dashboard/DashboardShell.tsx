'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
    LayoutDashboard,
    BookOpen,
    CalendarDays,
    Clock3,
    Ticket,
    Target,
    Shield,
    Library,
    ListChecks,
    Dumbbell,
    PenLine,
    User,
} from 'lucide-react'

import MobileProfileDropdown from '@/components/dashboard/MobileProfileDropdown'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import styles from '@/components/dashboard/CompactLearning.module.css'

interface DashboardShellProps {
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
        avatar_url?: string
        full_name?: string
        tryout_quota?: number
    } | null
    signoutAction: () => Promise<{ success: boolean }>
    isAdmin?: boolean
    canAccessArticles?: boolean
}

export default function DashboardShell({
    children,
    user,
    profile,
    signoutAction,
    isAdmin = false,
    canAccessArticles = false,
}: DashboardShellProps) {
    const pathname = usePathname()

    const isPracticeSession = pathname.includes('/cpns/dashboard/tryout/') ||
        pathname.includes('/cpns/dashboard/result/')

    if (isPracticeSession) {
        return (
            <main data-experience-mode="exam" data-program="cpns" className="st-product min-h-screen bg-[#fbfaf7]">
                {children}
            </main>
        )
    }

    const displayName = profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Pejuang SiapTempur'

    return (
        <div
            data-experience-mode="learning"
            data-program="cpns"
            className={`${styles.compact} st-product flex h-screen overflow-hidden bg-[#fbfaf7] font-body text-slate-950`}
        >
            <aside className="relative z-20 hidden w-[15.75rem] min-h-0 flex-col border-r-2 border-slate-900 bg-[#fbfaf7] md:flex">
                <div className="shrink-0 border-b-2 border-slate-900 px-5 pb-4 pt-5">
                    <Link
                        href="/cpns"
                        className="st-focus inline-flex items-center focus-visible:outline-none"
                    >
                        <span className="font-handwriting text-[1.65rem] font-black leading-tight text-slate-950">
                            Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </Link>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Persiapan SKD CPNS</p>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3" aria-label="Navigasi CPNS">
                    <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Utama</p>
                    <div className="space-y-1">
                        <NavItem href="/cpns/dashboard" icon={<LayoutDashboard size={17} />} label="Beranda" />
                        <NavItem href="/cpns/dashboard/drilling-materi" icon={<Dumbbell size={17} />} label="Belajar" />
                        <NavItem href="/cpns/dashboard/tryout" icon={<Target size={17} />} label="Tryout" />
                        <NavItem href="/cpns/dashboard/riwayat" icon={<Clock3 size={17} />} label="Hasil" />
                        <NavItem href="/cpns/dashboard/profile" icon={<User size={17} />} label="Profil" />
                    </div>

                    <div className="my-3.5 border-t-2 border-dashed border-slate-300" />
                    <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Lainnya</p>
                    <div className="space-y-1">
                        <NavItem href="/cpns/dashboard/mini-tryout" icon={<ListChecks size={17} />} label="Mini Tryout" />
                        <NavItem href="/cpns/dashboard/event" icon={<CalendarDays size={17} />} label="Event" />
                        <NavItem href="/cpns/dashboard/materi" icon={<Library size={17} />} label="Kisi-Kisi" />
                        <NavItem href="/cpns/dashboard/beli-paket" icon={<BookOpen size={17} />} label="Beli Token" />
                    </div>

                    {(isAdmin || canAccessArticles) && (
                        <>
                            <div className="my-3.5 border-t-2 border-dashed border-slate-300" />
                            <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Workspace</p>
                            <div className="space-y-1">
                                {canAccessArticles && (
                                    <NavItem href="/cpns/admin/articles" icon={<PenLine size={17} />} label="Tulis Artikel" />
                                )}
                                {isAdmin && (
                                    <NavItem href="/cpns/admin" icon={<Shield size={17} />} label="Admin" />
                                )}
                            </div>
                        </>
                    )}
                </nav>

                <div className="shrink-0 border-t-2 border-slate-900 p-3">
                    <div className="flex items-center gap-2.5 border-2 border-slate-900 bg-white p-2.5 shadow-[2px_2px_0_0_#111827]">
                        <Link
                            href="/cpns/dashboard/profile"
                            aria-label="Buka profil"
                            className="st-focus relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border-2 border-slate-900 bg-yellow-100 text-sm font-black text-slate-900"
                        >
                            {profile?.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="36px" />
                            ) : (
                                <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                            )}
                        </Link>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-black text-slate-900">{displayName}</p>
                            <Link
                                href="/cpns/dashboard/beli-paket"
                                className="st-focus mt-0.5 inline-flex min-h-6 items-center gap-1.5 text-[11px] font-black text-blue-700 hover:underline"
                            >
                                <Ticket size={12} /> {profile?.tryout_quota ?? 0} token tersisa
                            </Link>
                        </div>
                    </div>
                    <div className="mt-1.5 flex justify-end">
                        <SidebarSignoutButton signoutAction={signoutAction} />
                    </div>
                </div>
            </aside>

            <main className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-2 border-slate-900 bg-[#fbfaf7]/95 px-4 backdrop-blur-xl md:hidden">
                    <Link
                        href="/cpns"
                        className="st-focus font-handwriting text-xl font-black text-slate-950"
                    >
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>
                    <MobileProfileDropdown
                        user={user}
                        profile={profile}
                        signoutAction={signoutAction}
                        canAccessArticles={canAccessArticles}
                        isAdmin={isAdmin}
                    />
                </div>

                <div className="mx-auto w-full max-w-6xl p-4 sm:p-5 md:p-6 lg:p-7">
                    {children}
                </div>
            </main>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-slate-900 bg-[#fbfaf7]/98 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
                aria-label="Navigasi utama"
            >
                <div className="grid grid-cols-5 gap-1 px-1.5 py-1.5">
                    <MobileNavItem href="/cpns/dashboard" icon={<LayoutDashboard size={20} />} label="Beranda" />
                    <MobileNavItem href="/cpns/dashboard/drilling-materi" icon={<Dumbbell size={20} />} label="Belajar" />
                    <MobileNavItem href="/cpns/dashboard/tryout" icon={<Target size={20} />} label="Tryout" />
                    <MobileNavItem href="/cpns/dashboard/riwayat" icon={<Clock3 size={20} />} label="Hasil" />
                    <MobileNavItem href="/cpns/dashboard/profile" icon={<User size={20} />} label="Profil" />
                </div>
            </nav>
        </div>
    )
}
