'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
    LayoutDashboard,
    BookOpen,
    Clock3,
    User,
    Ticket,
    Target,
    BarChart3,
    Shield,
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
}

export default function DashboardShell({ children, user, profile, signoutAction, isAdmin = false }: DashboardShellProps) {
    const pathname = usePathname()

    // Check if we're on a practice session page (mengerjakan soal atau result)
    const isPracticeSession = pathname.includes('/cpns/dashboard/latihan/') ||
                              pathname.includes('/cpns/dashboard/result/')

    // If on practice session, render minimal layout without sidebar
    if (isPracticeSession) {
        return (
            <main className="min-h-screen bg-[#fdfbf7]">
                {children}
            </main>
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
                    <Link href="/cpns" className="flex flex-col items-start group">
                        <span className="text-xl font-handwriting font-bold text-gray-800 rotate-[-1deg] group-hover:rotate-0 transition-transform leading-tight uppercase">
                            CPNS & KEDINASAN
                        </span>
                        <span className="text-xs font-handwriting font-bold text-gray-500 ml-1 -mt-1 group-hover:text-gray-900 transition-colors">
                            by Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-3 relative z-10">
                    <NavItem href="/cpns/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavItem href="/cpns/dashboard/ranking" icon={<BarChart3 size={20} />} label="Ranking Nasional" />
                    <NavItem href="/cpns/dashboard/beli-paket" icon={<BookOpen size={20} />} label="Beli Paket" />
                    <NavItem href="/cpns/dashboard/latihan" icon={<Target size={20} />} label="Tryout" badge="XP" />
                    <NavItem href="/cpns/dashboard/riwayat" icon={<Clock3 size={20} />} label="Riwayat" />

                    <NavItem href="/cpns/dashboard/profile" icon={<User size={20} />} label="Profil" />

                    {isAdmin && (
                        <div className="pt-4 mt-4 border-t-2 border-dashed border-gray-300">
                            <NavItem href="/cpns/dashboard/admin" icon={<Shield size={20} />} label="Admin" />
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t-2 border-gray-900 relative z-10">
                    <div className="flex items-center gap-3 mb-4 px-2 p-3 bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-1 hover:rotate-0 transition-transform">
                        <div className="w-10 h-10 border-2 border-gray-900 flex items-center justify-center text-gray-900 font-bold overflow-hidden relative bg-yellow-200">
                            {profile?.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt="Ava"
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                />
                            ) : (
                                <span className="text-lg">{user.email?.[0]?.toUpperCase() || '?'}</span>
                            )}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate font-handwriting">
                                {profile?.full_name ||
                                    user.user_metadata?.full_name ||
                                    user.user_metadata?.name ||
                                    'Pejuang Tryout'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] px-1.5 py-0.5 border border-gray-900 bg-blue-100 text-blue-900 font-bold uppercase inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-xs" title="Sisa Token SKD CPNS & Kedinasan">
                                    <Ticket size={12} className="fill-current" />
                                    {profile?.tryout_quota ?? 0} Token
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t-2 border-gray-900">
                        <SidebarSignoutButton signoutAction={signoutAction} />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative scrollbar-hide">
                {/* Mobile Header (Hidden on Desktop) */}
                <div className="md:hidden h-16 border-b-2 border-gray-900 flex items-center px-6 justify-between sticky top-0 bg-[#fdfbf7]/90 backdrop-blur-md z-30 shadow-sm">
                    <Link href="/" className="flex flex-col items-start group">
                        <span className="text-lg font-handwriting font-bold text-gray-800 rotate-[-1deg] group-hover:rotate-0 transition-transform leading-tight uppercase">
                            CPNS & KEDINASAN
                        </span>
                        <span className="text-[10px] font-handwriting font-bold text-gray-500 ml-1 -mt-1 group-hover:text-gray-900 transition-colors">
                            by Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </Link>
                    <MobileProfileDropdown 
                        user={user} 
                        profile={profile} 
                        signoutAction={signoutAction}
                    />
                </div>

                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fdfbf7]/90 backdrop-blur-xl border-t-2 border-gray-900 z-40">
                <div className="grid grid-cols-5 gap-1 px-2 py-2">
                    <MobileNavItem href="/cpns/dashboard" icon={<LayoutDashboard size={20} />} label="Home" />
                    <MobileNavItem href="/cpns/dashboard/ranking" icon={<BarChart3 size={20} />} label="Ranking" />
                    <MobileNavItem href="/cpns/dashboard/beli-paket" icon={<BookOpen size={20} />} label="Beli" />
                    <MobileNavItem href="/cpns/dashboard/latihan" icon={<Target size={20} />} label="Tryout" />

                    {/* Dynamic Profile Icon */}
                    <MobileNavItem
                        href="/cpns/dashboard/profile"
                        icon={
                            profile?.avatar_url ? (
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-900 relative">
                                    <Image
                                        src={profile.avatar_url}
                                        alt="Profile"
                                        fill
                                        className="object-cover"
                                        sizes="20px"
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
