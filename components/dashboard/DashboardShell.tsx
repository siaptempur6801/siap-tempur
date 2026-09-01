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
            <main className="min-h-screen bg-[#fdfbf7]">
                {children}
            </main>
        )
    }

    const displayName = profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Pejuang SiapTempur'

    return (
        <div className="flex h-screen overflow-hidden bg-[#fdfbf7] font-body">
            <aside className="relative z-20 hidden w-64 min-h-0 flex-col border-r-2 border-gray-900 bg-[#fdfbf7] md:flex">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }}
                />

                <div className="relative z-10 shrink-0 px-6 pb-5 pt-6">
                    <Link href="/cpns" className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                        <span className="font-handwriting text-3xl font-bold leading-tight text-gray-800">
                            Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </Link>
                    <p className="mt-2 text-xs font-semibold text-gray-500">Persiapan SKD CPNS</p>
                </div>

                <nav className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                    <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Utama</p>
                    <div className="space-y-1.5">
                        <NavItem href="/cpns/dashboard" icon={<LayoutDashboard size={20} />} label="Beranda" />
                        <NavItem href="/cpns/dashboard/drilling-materi" icon={<Dumbbell size={20} />} label="Belajar" />
                        <NavItem href="/cpns/dashboard/tryout" icon={<Target size={20} />} label="Tryout" />
                        <NavItem href="/cpns/dashboard/riwayat" icon={<Clock3 size={20} />} label="Hasil" />
                        <NavItem href="/cpns/dashboard/profile" icon={<User size={20} />} label="Profil" />
                    </div>

                    <div className="my-5 border-t-2 border-dashed border-gray-300" />
                    <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Lainnya</p>
                    <div className="space-y-1.5">
                        <NavItem href="/cpns/dashboard/mini-tryout" icon={<ListChecks size={20} />} label="Mini Tryout" />
                        <NavItem href="/cpns/dashboard/event" icon={<CalendarDays size={20} />} label="Event" />
                        <NavItem href="/cpns/dashboard/materi" icon={<Library size={20} />} label="Kisi-Kisi" />
                        <NavItem href="/cpns/dashboard/beli-paket" icon={<BookOpen size={20} />} label="Beli Token" />
                    </div>

                    {(isAdmin || canAccessArticles) && (
                        <>
                            <div className="my-5 border-t-2 border-dashed border-gray-300" />
                            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Workspace</p>
                            <div className="space-y-1.5">
                                {canAccessArticles && (
                                    <NavItem href="/cpns/admin/articles" icon={<PenLine size={20} />} label="Tulis Artikel" />
                                )}
                                {isAdmin && (
                                    <NavItem href="/cpns/admin" icon={<Shield size={20} />} label="Admin" />
                                )}
                            </div>
                        </>
                    )}
                </nav>

                <div className="relative z-10 shrink-0 border-t-2 border-gray-900 p-4">
                    <div className="flex items-center gap-3 border-2 border-gray-900 bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Link
                            href="/cpns/dashboard/profile"
                            aria-label="Buka profil"
                            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-gray-900 bg-yellow-100 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                            {profile?.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="40px" />
                            ) : (
                                <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                            )}
                        </Link>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-900">{displayName}</p>
                            <Link
                                href="/cpns/dashboard/beli-paket"
                                className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                            >
                                <Ticket size={13} /> {profile?.tryout_quota ?? 0} token tersisa
                            </Link>
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <SidebarSignoutButton signoutAction={signoutAction} />
                    </div>
                </div>
            </aside>

            <main className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-gray-900 bg-[#fdfbf7]/95 px-5 backdrop-blur-md md:hidden">
                    <Link href="/cpns" className="font-handwriting text-2xl font-bold text-gray-800">
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

                <div className="mx-auto max-w-7xl p-4 md:p-8">
                    {children}
                </div>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-gray-900 bg-[#fdfbf7]/95 backdrop-blur-xl md:hidden" aria-label="Navigasi utama">
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
