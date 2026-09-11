import Link from 'next/link'
import {
    ArrowRight,
    Check,
    CheckCircle2,
    Coins,
    Compass,
    GraduationCap,
    Layers,
    School,
    ShieldCheck,
    Sparkles,
} from 'lucide-react'

export type TrackId = 'cpns' | 'tka-sd' | 'tka-smp' | 'tka-sma'

interface TrackDefinition {
    id: TrackId
    title: string
    levelBadge: string
    baseStatus: 'available' | 'coming-soon'
    description: string
    href: string
    icon: typeof ShieldCheck
    theme: {
        accentBg: string
        accentText: string
        badgeClass: string
        iconBg: string
        cardHeaderBg: string
        topicPill: string
        checkmarkColor: string
        actionButton: string
    }
    topics: string[]
    features: string[]
    actionLabelAvailable: string
    actionLabelComingSoon?: string
}

const TRACK_DEFINITIONS: TrackDefinition[] = [
    {
        id: 'cpns',
        title: 'Persiapan SKD CPNS',
        levelBadge: 'CPNS / Kedinasan',
        baseStatus: 'available',
        description: 'Fokus persiapan Seleksi Kompetensi Dasar CAT dengan bank soal terbaru, drilling per materi, dan simulasi tryout nasional.',
        href: '/cpns/dashboard',
        icon: ShieldCheck,
        theme: {
            accentBg: 'bg-blue-50',
            accentText: 'text-blue-700',
            badgeClass: 'bg-blue-50 text-blue-700 ring-blue-200',
            iconBg: 'bg-blue-600 text-white',
            cardHeaderBg: 'border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-sky-50/30',
            topicPill: 'bg-blue-50/80 text-blue-800 ring-1 ring-blue-200/60',
            checkmarkColor: 'text-blue-600',
            actionButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow',
        },
        topics: ['TWK', 'TIU', 'TKP'],
        features: [
            'Drilling fokus 30 soal per materi',
            'Mini Tryout cepat 15–20 menit',
            'Simulasi CAT 110 soal / 100 menit',
            'Event akbar & pemeringkatan nasional',
        ],
        actionLabelAvailable: 'Masuk Dashboard CPNS',
    },
    {
        id: 'tka-smp',
        title: 'TKA Jenjang SMP',
        levelBadge: 'TKA SMP',
        baseStatus: 'available',
        description: 'Tes Kemampuan Akademik untuk siswa SMP. Kuatkan pemahaman konsep, evaluasi kemampuan, dan perbaiki materi yang belum tuntas.',
        href: '/tka/smp',
        icon: GraduationCap,
        theme: {
            accentBg: 'bg-indigo-50',
            accentText: 'text-indigo-700',
            badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
            iconBg: 'bg-indigo-600 text-white',
            cardHeaderBg: 'border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/30',
            topicPill: 'bg-indigo-50/80 text-indigo-800 ring-1 ring-indigo-200/60',
            checkmarkColor: 'text-indigo-600',
            actionButton: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow',
        },
        topics: ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA'],
        features: [
            'Tes diagnostik pengukur kesiapan',
            'Latihan fokus per sub-kompetensi',
            'Mini & full tryout berstandar CAT',
            'Bank soal salah & remedial terarah',
        ],
        actionLabelAvailable: 'Buka Dashboard TKA SMP',
    },
    {
        id: 'tka-sd',
        title: 'TKA Jenjang SD',
        levelBadge: 'TKA SD',
        baseStatus: 'coming-soon',
        description: 'Persiapan Tes Kemampuan Akademik jenjang Sekolah Dasar untuk mengasah kemampuan numerasi, literasi, dan nalar sains sejak dini.',
        href: '/tka/sd',
        icon: School,
        theme: {
            accentBg: 'bg-amber-50',
            accentText: 'text-amber-800',
            badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200',
            iconBg: 'bg-amber-500 text-white',
            cardHeaderBg: 'border-amber-100 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/30',
            topicPill: 'bg-amber-50/80 text-amber-800 ring-1 ring-amber-200/60',
            checkmarkColor: 'text-amber-500',
            actionButton: 'bg-white hover:bg-amber-50/70 text-slate-800 border border-slate-200 hover:border-amber-300 shadow-2xs',
        },
        topics: ['Numerasi Dasar', 'Literasi Membaca', 'Sains Dasar'],
        features: [
            'Latihan konsep dasar interaktif',
            'Pembahasan visual ramah siswa',
            'Pelacakan pemahaman bertahap',
        ],
        actionLabelAvailable: 'Buka Dashboard TKA SD',
        actionLabelComingSoon: 'Lihat Pratinjau TKA SD',
    },
    {
        id: 'tka-sma',
        title: 'TKA Jenjang SMA',
        levelBadge: 'TKA SMA',
        baseStatus: 'coming-soon',
        description: 'Pemantapan Tes Kemampuan Akademik jenjang Sekolah Menengah Atas untuk persiapan evaluasi berkala dan asesmen tingkat lanjut.',
        href: '/tka/sma',
        icon: Sparkles,
        theme: {
            accentBg: 'bg-purple-50',
            accentText: 'text-purple-700',
            badgeClass: 'bg-purple-50 text-purple-700 ring-purple-200',
            iconBg: 'bg-purple-600 text-white',
            cardHeaderBg: 'border-purple-100 bg-gradient-to-r from-purple-50/70 via-white to-fuchsia-50/30',
            topicPill: 'bg-purple-50/80 text-purple-800 ring-1 ring-purple-200/60',
            checkmarkColor: 'text-purple-600',
            actionButton: 'bg-white hover:bg-purple-50/70 text-slate-800 border border-slate-200 hover:border-purple-300 shadow-2xs',
        },
        topics: ['Matematika Lanjut', 'Literasi Analitis', 'Sains Terpadu'],
        features: [
            'Simulasi ujian berstandar nasional',
            'Analisis mendalam per materi uji',
            'Rekomendasi belajar adaptif',
        ],
        actionLabelAvailable: 'Buka Dashboard TKA SMA',
        actionLabelComingSoon: 'Lihat Pratinjau TKA SMA',
    },
]

export default function PilihJalurContent({ currentTrack }: { currentTrack: TrackId }) {
    return (
        <div className="space-y-6 md:space-y-8">
            {/* Standard TKA/CPNS Header */}
            <header className="border-b border-slate-200/80 pb-6 text-slate-950">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/50">
                    <Compass size={14} className="text-indigo-600" aria-hidden="true" />
                    <span>Pilih Jalur Belajar · Multi-Program</span>
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Pilih Program atau Jenjang Persiapanmu
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    Satu akun SiapTempur terintegrasi untuk seluruh jalur belajar. Pilih jalur yang ingin kamu tekuni sekarang untuk berpindah ke ruang belajar dan simulasi yang sesuai.
                </p>
            </header>

            {/* Quick Context / Value Props Banner */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60">
                        <Layers size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-900">Satu Akun Terpadu</p>
                        <p className="text-[11px] text-slate-500">Akses CPNS & TKA tanpa registrasi ulang</p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                        <Coins size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-900">Saldo Token Bersama</p>
                        <p className="text-[11px] text-slate-500">Token ujian dapat dipakai di semua jalur</p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-200/60">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-900">Progres Mandiri</p>
                        <p className="text-[11px] text-slate-500">Nilai & riwayat tiap jenjang tersimpan rapi</p>
                    </div>
                </div>
            </div>

            {/* Pathways Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {TRACK_DEFINITIONS.map((track) => {
                    const Icon = track.icon
                    const isCurrent = track.id === currentTrack
                    const isComingSoon = track.baseStatus === 'coming-soon' && !isCurrent
                    const isAvailable = track.baseStatus === 'available' && !isCurrent

                    const actionLabel = isCurrent
                        ? 'Sedang Digunakan'
                        : isComingSoon
                            ? (track.actionLabelComingSoon || 'Lihat Pratinjau')
                            : track.actionLabelAvailable

                    return (
                        <article
                            key={track.id}
                            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                isCurrent
                                    ? 'border-indigo-300 ring-2 ring-indigo-600/90 ring-offset-2'
                                    : 'border-slate-200/80 hover:border-slate-300'
                            }`}
                        >
                            <div>
                                {/* Card Header with Badge */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs ${track.theme.iconBg}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black tracking-wide ring-1 ${track.theme.badgeClass}`}>
                                            {track.levelBadge}
                                        </span>
                                        {isCurrent ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200/70">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                </span>
                                                <span>Jalur Aktif</span>
                                            </span>
                                        ) : isAvailable ? (
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200/80">
                                                Tersedia
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200/70">
                                                Segera Hadir
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors">
                                    {track.title}
                                </h2>
                                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                                    {track.description}
                                </p>

                                {/* Topics Pills */}
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {track.topics.map((topic) => (
                                        <span
                                            key={topic}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${track.theme.topicPill}`}
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>

                                {/* Feature List */}
                                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
                                    {track.features.map((feature) => (
                                        <div key={feature} className="flex items-center gap-2.5">
                                            <CheckCircle2
                                                size={15}
                                                className={`shrink-0 ${track.theme.checkmarkColor}`}
                                            />
                                            <span className="font-medium text-slate-700">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card Action */}
                            <div className="mt-6 border-t border-slate-100 pt-4">
                                {isCurrent ? (
                                    <div className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200/80">
                                        <Check size={16} className="text-emerald-600" />
                                        <span>{actionLabel}</span>
                                    </div>
                                ) : (
                                    <Link
                                        href={track.href}
                                        className={`flex w-full min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-[0.98] ${track.theme.actionButton}`}
                                    >
                                        <span>{actionLabel}</span>
                                        <ArrowRight size={15} />
                                    </Link>
                                )}
                            </div>
                        </article>
                    )
                })}
            </div>

            {/* Reassurance Footer Notice */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/40 p-4 text-xs text-indigo-950 shadow-xs sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Sparkles size={16} />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                        <p className="font-bold text-slate-900">Catatan Integrasi Multi-Jalur:</p>
                        <p className="mt-0.5">
                            Saldo token ujian, profil pengguna, dan riwayat belajar tersimpan aman dalam satu akun SiapTempur. Kamu dapat berpindah ke jalur manapun sewaktu-waktu tanpa khawatir kehilangan progres belajarmu.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
