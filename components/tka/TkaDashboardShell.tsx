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
    Target,
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
    const isFocusedSession = pathname.includes('/tryout/') || pathname.includes('/remedial/')

    if (isFocusedSession) {
        return (
            <main data-experience-mode="exam" data-program={`tka-${level.toLowerCase()}`} className="st-product min-h-screen bg-[#fbfaf7]">
                {children}
            </main>
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
            className="st-product flex h-screen overflow-hidden bg-[#fbfaf7] font-body text-slate-950"
        >
            <aside className="relative z-20 hidden w-[17rem] min-h-0 flex-col border-r-2 border-slate-900 bg-[#fbfaf7] md:flex">
                <div className="shrink-0 border-b-2 border-slate-900 px-6 pb-5 pt-6">
                    <Link href="/tka" className="st-focus inline-flex items-center focus-visible:outline-none">
                        <span className="font-handwriting text-3xl font-black leading-tight text-slate-950">
                            Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </Link>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Persiapan TKA {level}</p>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4" aria-label={`Navigasi TKA ${level}`}>
                    <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Utama</p>
                    <div className="space-y-1.5">
                        <NavItem href={basePath} icon={<LayoutDashboard size={18} />} label="Beranda" exact />
                        <NavItem href={`${basePath}/progress`} icon={<BarChart3 size={18} />} label="Perkembangan" />
                        <NavItem href={`${basePath}#tka-tryout`} icon={<Target size={18} />} label="Tryout" />
                        <NavItem href={`${basePath}/wrong-questions`} icon={<BookOpenCheck size={18} />} label="Soal Salah" />
                    </div>

                    <div className="my-4 border-t-2 border-dashed border-slate-300" />
                    <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Lainnya</p>
                    <div className="space-y-1.5">
                        <NavItem href={`${basePath}#tempur-pass`} icon={<Ticket size={18} />} label="Tempur Pass" />
                        <NavItem href="/tka" icon={<ArrowLeftRight size={18} />} label="Ganti Jenjang" />
                        <NavItem href="/cpns/dashboard" icon={<ShieldCheck size={18} />} label="Dashboard CPNS" />
                    </div>
                </nav>

                <div className="shrink-0 border-t-2 border-slate-900 p-4">
                    <div className="flex items-center gap-3 border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0_0_#111827]">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-slate-900 bg-yellow-100 font-black text-slate-900">
                            {profile?.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Foto profil" fill className="object-cover" sizes="40px" />
                            ) : (
                                <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900">{displayName}</p>
                            <Link href={`${basePath}#tempur-pass`} className="st-focus mt-0.5 inline-flex min-h-7 items-center gap-1.5 text-xs font-black text-blue-700 hover:underline">
                                <Ticket size={13} /> Akses TKA {level}
                            </Link>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <SidebarSignoutButton signoutAction={signoutAction} />
                    </div>
                </div>
            </aside>

            <main className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-slate-900 bg-[#fbfaf7]/95 px-5 backdrop-blur-xl md:hidden">
                    <Link href="/tka" className="st-focus font-handwriting text-2xl font-black text-slate-950">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>
                    <span className="st-pill bg-blue-100 text-blue-700">TKA {level}</span>
                </div>

                <div className="mx-auto w-full max-w-7xl">
                    {children}
                </div>
            </main>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-slate-900 bg-[#fbfaf7]/98 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
                aria-label={`Navigasi utama TKA ${level}`}
            >
                <div className="grid grid-cols-5 gap-1 px-1.5 py-1.5">
                    <MobileNavItem href={basePath} icon={<LayoutDashboard size={20} />} label="Beranda" exact />
                    <MobileNavItem href={`${basePath}/progress`} icon={<BarChart3 size={20} />} label="Progress" />
                    <MobileNavItem href={`${basePath}#tka-tryout`} icon={<ListChecks size={20} />} label="Tryout" />
                    <MobileNavItem href={`${basePath}/wrong-questions`} icon={<BookOpenCheck size={20} />} label="Review" />
                    <MobileNavItem href={`${basePath}#tempur-pass`} icon={<Ticket size={20} />} label="Akses" />
                </div>
            </nav>
        </div>
    )
}
