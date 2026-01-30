import { Calendar, Trophy, Users, Zap, Clock, ArrowRight, Lock } from 'lucide-react'
import Link from 'next/link'

export default function TryoutAkbarPage() {
    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 md:p-12">
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 mb-6">
                        <Zap size={16} className="fill-current" />
                        <span className="text-sm font-bold uppercase tracking-wider">Coming Soon</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                        Tryout Akbar CPNS 2024
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                        Uji kemampuanmu bersama ribuan peserta lainnya dalam Tryout Nasional yang mensimulasikan kondisi ujian SKD CPNS sesungguhnya.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
                            <Calendar size={20} className="text-primary" />
                            <span className="font-medium">Jadwal: TBA</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
                            <Users size={20} className="text-primary" />
                            <span className="font-medium">Target: 10.000+ Peserta</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
                            <Clock size={20} className="text-primary" />
                            <span className="font-medium">Durasi: 100 Menit</span>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FeatureCard
                    icon={<Trophy className="text-yellow-500" size={24} />}
                    title="Ranking Nasional"
                    description="Bandingkan skormu dengan peserta dari seluruh Indonesia dan lihat posisimu di leaderboard."
                    status="coming"
                />
                <FeatureCard
                    icon={<Calendar className="text-blue-500" size={24} />}
                    title="Jadwal Terstruktur"
                    description="Tryout diadakan secara berkala dengan jadwal yang teratur seperti ujian CPNS asli."
                    status="coming"
                />
                <FeatureCard
                    icon={<Users className="text-green-500" size={24} />}
                    title="Kompetisi Real-Time"
                    description="Rasakan sensasi berkompetisi langsung dengan ribuan peserta lain secara bersamaan."
                    status="coming"
                />
                <FeatureCard
                    icon={<Zap className="text-orange-500" size={24} />}
                    title="Analisis Mendalam"
                    description="Dapatkan analisis detail tentang kekuatan dan kelemahanmu di setiap materi."
                    status="coming"
                />
                <FeatureCard
                    icon={<Clock className="text-purple-500" size={24} />}
                    title="Timer Realistis"
                    description="Simulasi lengkap dengan timer 100 menit dan sistem penilaian seperti SKD asli."
                    status="coming"
                />
                <FeatureCard
                    icon={<Lock className="text-red-500" size={24} />}
                    title="Anti-Kecurangan"
                    description="Sistem keamanan ketat untuk memastikan integritas dan fairness dalam kompetisi."
                    status="coming"
                />
            </div>

            {/* CTA Section */}
            <div className="rounded-xl border border-border bg-secondary/20 p-8 text-center">
                <h2 className="text-2xl font-bold mb-3">Ingin Segera Ikut Tryout Akbar?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Sementara menunggu Tryout Akbar diluncurkan, kamu bisa tetap berlatih dengan Simulasi SKD Mandiri yang sudah tersedia!
                </p>
                <Link
                    href="/dashboard/latihan"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                    Mulai Simulasi SKD Mandiri
                    <ArrowRight size={18} />
                </Link>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-6">
                <div className="flex gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Zap size={20} className="text-blue-500" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Notifikasi Peluncuran</h3>
                        <p className="text-sm text-muted-foreground">
                            Fitur Tryout Akbar sedang dalam tahap pengembangan intensif. Kami akan mengirimkan notifikasi
                            ke emailmu segera setelah Tryout Akbar pertama dibuka untuk pendaftaran. Stay tuned! 🚀
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureCard({ icon, title, description, status }: {
    icon: React.ReactNode
    title: string
    description: string
    status: 'coming' | 'active'
}) {
    return (
        <div className="relative group p-6 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-all duration-300">
            {status === 'coming' && (
                <div className="absolute top-4 right-4">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 font-bold uppercase">
                        Soon
                    </span>
                </div>
            )}

            <div className="mb-4 p-3 rounded-lg bg-background w-fit">
                {icon}
            </div>

            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
    )
}
