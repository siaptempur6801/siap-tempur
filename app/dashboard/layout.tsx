import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutDashboard,
    BookOpen,
    Trophy,
    Calendar,
    User,
    LogOut,
    Zap
} from 'lucide-react'
import { signout } from '@/app/auth/actions'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile for status and details
    const { data: profile } = await supabase.from('profiles').select('subscription_status, full_name, avatar_url').eq('id', user.id).single()

    return (
        <div className="h-screen overflow-hidden bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 bg-secondary/20 border-r border-border hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        CPNS PRO
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavItem href="/dashboard/materi" icon={<BookOpen size={20} />} label="Materi Belajar" />
                    <NavItem href="/dashboard/latihan" icon={<Trophy size={20} />} label="Latihan Soal" />
                    <NavItem href="/dashboard/tryout" icon={<Calendar size={20} />} label="Tryout Akbar" />
                    <NavItem href="/dashboard/profile" icon={<User size={20} />} label="Profil" />
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden relative">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Ava" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user.email?.[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium truncate">{profile?.full_name || user.user_metadata?.full_name || 'User'}</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${profile?.subscription_status === 'premium'
                                    ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                    : 'bg-secondary text-muted-foreground border border-border'
                                    }`}>
                                    {profile?.subscription_status === 'premium' ? 'PREMIUM MEMBER' : 'FREE MEMBER'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <form action={signout}>
                        <button className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg w-full transition">
                            <LogOut size={18} />
                            Keluar
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {/* Mobile Header (Hidden on Desktop) */}
                <div className="md:hidden h-16 border-b border-border flex items-center px-6 justify-between transform sticky top-0 bg-background/80 backdrop-blur-md z-30">
                    <span className="font-bold">CPNS PRO</span>
                    <div className="w-8 h-8 bg-secondary rounded-full" />
                </div>

                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-40">
                <div className="grid grid-cols-5 gap-1 px-2 py-2">
                    <MobileNavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Home" />
                    <MobileNavItem href="/dashboard/materi" icon={<BookOpen size={20} />} label="Materi" />
                    <MobileNavItem href="/dashboard/latihan" icon={<Trophy size={20} />} label="Latihan" />
                    <MobileNavItem href="/dashboard/tryout" icon={<Calendar size={20} />} label="Tryout" />
                    <MobileNavItem href="/dashboard/profile" icon={<User size={20} />} label="Profil" />
                </div>
            </nav>
        </div>
    )
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200 font-medium"
        >
            {icon}
            <span>{label}</span>
            {label === 'Latihan Soal' && (
                <span className="ml-auto text-[10px] uppercase font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">XP</span>
            )}
        </Link>
    )
}

function MobileNavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all active:scale-95"
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
        </Link>
    )
}
