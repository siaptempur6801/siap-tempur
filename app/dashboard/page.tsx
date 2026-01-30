import { startPracticeSession } from '@/app/actions/session'

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Halo, Calon ASN! 👋</h2>
                <p className="text-muted-foreground">Siap untuk mempertahankan streak belajarmu hari ini?</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Streak Harian"
                    value="3 Hari"
                    icon="🔥"
                    desc="Luar biasa! Pertahankan ritmenya."
                    color="bg-orange-500/10 text-orange-500 border-orange-500/20"
                />
                <StatCard
                    title="Total XP"
                    value="1,250"
                    icon="⚡"
                    desc="Level 5 - Pejuang NIP"
                    color="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                />
                <StatCard
                    title="Tryout Berikutnya"
                    value="2 Hari Lagi"
                    icon="📅"
                    desc="Tryout Nasional Batch 4"
                    color="bg-blue-500/10 text-blue-500 border-blue-500/20"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border bg-secondary/20 p-6">
                    <h3 className="text-xl font-bold mb-4">Lanjut Belajar</h3>
                    <div className="space-y-4">
                        <form action={startPracticeSession.bind(null, 'TWK')}>
                            <button className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition cursor-pointer w-full text-left">
                                <div className="p-3 rounded-full bg-primary/20 text-primary">
                                    📖
                                </div>
                                <div>
                                    <h4 className="font-semibold">Bela Negara (TWK)</h4>
                                    <p className="text-sm text-muted-foreground">Mulai Latihan</p>
                                </div>
                            </button>
                        </form>
                        <form action={startPracticeSession.bind(null, 'TIU')}>
                            <button className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition cursor-pointer w-full text-left">
                                <div className="p-3 rounded-full bg-accent/20 text-accent">
                                    🧮
                                </div>
                                <div>
                                    <h4 className="font-semibold">Deret Angka (TIU)</h4>
                                    <p className="text-sm text-muted-foreground">Mulai Latihan</p>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-6">
                    <h3 className="text-xl font-bold mb-4">Leaderboard Mingguan</h3>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold w-6 text-center ${i === 1 ? 'text-yellow-500' : 'text-muted-foreground'}`}>#{i}</span>
                                    <div className="w-8 h-8 rounded-full bg-secondary text-xs flex items-center justify-center">U{i}</div>
                                    <span className="font-medium">User {i * 123}</span>
                                </div>
                                <span className="font-mono text-sm text-primary">{2000 - i * 50} XP</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, desc, color }: any) {
    return (
        <div className={`p-6 rounded-xl border ${color} relative overflow-hidden`}>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium opacity-80">{title}</h3>
                    <span className="text-2xl">{icon}</span>
                </div>
                <div className="text-3xl font-bold mb-1">{value}</div>
                <p className="text-sm opacity-70">{desc}</p>
            </div>
        </div>
    )
}
