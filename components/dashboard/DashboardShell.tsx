'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutDashboard,
    BookOpen,
    Trophy,
    Calendar,
    User,
    Ticket,
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
        }
    }
    profile: {
        avatar_url?: string
        full_name?: string
        tryout_quota?: number
    } | null
    signoutAction: () => Promise<{ success: boolean }>
}

export default function DashboardShell({ children, user, profile, signoutAction }: DashboardShellProps) {
    const pathname = usePathname()

    // Check if we're on a practice session page (mengerjakan soal atau result)
    const isPracticeSession = /^\/dashboard\/latihan\/[^/]+/.test(pathname)

    // If on practice session, render minimal layout without sidebar
    if (isPracticeSession) {
        return (
            <div className="min-h-screen bg-[#fdfbf7]">
                {children}
            </div>
        )
    }

    // Normal dashboard layout with sidebar
    return (
        <div className="h-screen overflow-hidden flex font-body bg-[#fdfbf7]">
            {/* Sidebar */}
            <aside className="w-64 bg-[#fdfbf7] border-r-2 border-gray-900 hidden md:flex flex-col z-20 relative shadow-[4px_0px_0px_0px_rgba(0,0,0,0.1)]">
                {/* Sidebar Pattern Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "10px 10px" }}></div>

                <div className="p-6 relative z-10">
                    <Link href="/" className="text-3xl font-bold text-gray-800 rotate-[-2deg] block hover:scale-105 transition-transform">
                        Lulus<span className="text-blue-600 underline decoration-wavy decoration-2">Tryout</span>.
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-3 relative z-10">
                    <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavItem href="/dashboard/beli-paket" icon={<BookOpen size={20} />} label="Beli Paket" />
                    <NavItem href="/dashboard/latihan" icon={<Trophy size={20} />} label="Tryout" badge="XP" />
                    <NavItem href="/dashboard/profile" icon={<User size={20} />} label="Profil" />
                </nav>

                <div className="p-4 border-t-2 border-gray-900 relative z-10">
                    <div className="flex items-center gap-3 mb-4 px-2 p-3 bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-1 hover:rotate-0 transition-transform">
                        <div className="w-10 h-10 border-2 border-gray-900 flex items-center justify-center text-gray-900 font-bold overflow-hidden relative bg-yellow-200">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Ava" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-lg">{user.email?.[0]?.toUpperCase() || '?'}</span>
                            )}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate font-handwriting">
                                {profile?.full_name ||
                                    user.user_metadata?.full_name ||
                                    (user as any).user_metadata?.name ||
                                    'Pejuang Tryout'}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 border-2 border-gray-900 bg-blue-200 text-blue-900 font-bold uppercase inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" title="Sisa Kuota Tryout">
                                <Ticket size={10} className="fill-current" />
                                {profile?.tryout_quota ?? 0} Tiket
                            </span>
                        </div>
                    </div>
                    <SidebarSignoutButton signoutAction={signoutAction} />
                </div>
            </aside>

            {/* Main Content */}
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative scrollbar-hide">
                {/* Mobile Header (Hidden on Desktop) */}
                <div className="md:hidden h-16 border-b-2 border-gray-900 flex items-center px-6 justify-between transform sticky top-0 bg-[#fdfbf7]/90 backdrop-blur-md z-30 shadow-sm">
                    <Link href="/" className="text-2xl font-handwriting font-bold text-gray-800 rotate-[-1deg]">
                        Lulus<span className="text-blue-600 underline decoration-wavy decoration-2">Tryout</span>.
                    </Link>
                    <MobileProfileDropdown user={user} profile={profile} signoutAction={signoutAction} />
                </div>

                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fdfbf7]/90 backdrop-blur-xl border-t-2 border-gray-900 z-40">
                <div className="grid grid-cols-4 gap-1 px-2 py-2">
                    <MobileNavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Home" />
                    <MobileNavItem href="/dashboard/beli-paket" icon={<BookOpen size={20} />} label="Beli" />
                    <MobileNavItem href="/dashboard/latihan" icon={<Trophy size={20} />} label="Tryout" />

                    {/* Dynamic Profile Icon */}
                    <MobileNavItem
                        href="/dashboard/profile"
                        icon={
                            profile?.avatar_url ? (
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-900 relative">
                                    <img
                                        src={profile.avatar_url}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <User size={20} />
                            )
                        }
                        label="Profil"
                    />
                </div>
            </nav>
        </div>
    )
}
