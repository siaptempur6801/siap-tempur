import Link from 'next/link'
import { ArrowRight, BrainCircuit, ClipboardCheck, Coins, Compass, Layers3, ShieldCheck, Sparkles, Target } from 'lucide-react'

/**
 * Konten halaman **Pilih Jalur khusus CPNS**.
 *
 * Halaman ini fokus ke jalur belajar SKD (TWK/TIU/TKP + tangga latihan), bukan ke pemilihan
 * jenjang TKA seperti sebelumnya. Tautan ke program TKA tetap ada di bagian bawah sebagai
 * lintas-program.
 */
const SUBTESTS = [
    {
        href: '/cpns/twk',
        code: 'TWK',
        title: 'Tes Wawasan Kebangsaan',
        description: 'Nasionalisme, integritas, bela negara, pilar negara, dan bahasa Indonesia.',
        icon: ShieldCheck,
        tone: 'bg-[var(--st-blue-soft)]',
    },
    {
        href: '/cpns/tiu',
        code: 'TIU',
        title: 'Tes Intelegensia Umum',
        description: 'Verbal, numerik, figural, penalaran, dan analisis informasi.',
        icon: BrainCircuit,
        tone: 'bg-[var(--st-yellow-soft)]',
    },
    {
        href: '/cpns/tkp',
        code: 'TKP',
        title: 'Tes Karakteristik Pribadi',
        description: 'Pelayanan publik, jejaring kerja, sosial budaya, dan teknologi informasi.',
        icon: Target,
        tone: 'bg-[var(--st-green-soft)]',
    },
] as const

const LADDER = [
    {
        href: '/cpns/drilling-materi',
        title: 'Drilling materi',
        description: 'Latihan pendek per materi untuk menutup bagian yang masih lemah.',
        icon: Layers3,
    },
    {
        href: '/cpns/mini-tryout',
        title: 'Mini tryout',
        description: 'Sesi singkat dengan komposisi seperti ujian untuk mengukur kesiapan.',
        icon: ClipboardCheck,
    },
    {
        href: '/cpns/full-tryout',
        title: 'Full tryout',
        description: 'Simulasi lengkap berstandar CAT dengan waktu dan susunan subtes penuh.',
        icon: Sparkles,
    },
] as const

export default function CpnsPilihJalurContent({ hasActivePass }: { hasActivePass: boolean }) {
    return (
        <div className="space-y-6 md:space-y-8">
            <header>
                <div className="st-kicker"><Compass size={14} /> Pilih jalur CPNS</div>
                <h1 className="st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl">
                    Mulai dari satu subtes, lalu naik ke tryout penuh.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    Jalur CPNS menekankan penguasaan SKD. Pilih fokus yang paling perlu dikejar sekarang, kerjakan
                    latihannya, lalu ukur lagi dengan mini tryout atau full tryout.
                </p>
            </header>

            <section aria-labelledby="fokus-skd" className="space-y-3">
                <div>
                    <h2 id="fokus-skd" className="st-heading text-xl md:text-2xl">
                        Pilih fokus SKD
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Tiga subtes SKD, masing-masing punya halaman latihan sendiri.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {SUBTESTS.map((subtest) => {
                        const Icon = subtest.icon
                        return (
                            <Link
                                key={subtest.code}
                                href={subtest.href}
                                className="st-flat-card st-focus group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                            >
                                <span className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 ${subtest.tone}`}>
                                    <Icon size={20} className="text-slate-900" />
                                </span>
                                <span className="mt-3 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">{subtest.code}</span>
                                <span className="mt-1 text-sm font-black text-slate-950 group-hover:text-blue-700">{subtest.title}</span>
                                <span className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">{subtest.description}</span>
                                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-blue-700">
                                    Buka latihan <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </section>

            <section aria-labelledby="tangga-latihan" className="space-y-3">
                <div>
                    <h2 id="tangga-latihan" className="st-heading text-xl md:text-2xl">
                        Tangga latihan
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Urutan yang disarankan: kuasai materi, ukur dengan mini tryout, lalu full tryout.</p>
                </div>
                <ol className="grid gap-3 md:grid-cols-3">
                    {LADDER.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <li key={step.href}>
                                <Link
                                    href={step.href}
                                    className="st-flat-card st-focus group flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                >
                                    <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] text-slate-600">{index + 1}</span>
                                        Langkah
                                    </span>
                                    <span className="mt-2 inline-flex items-center gap-2 text-sm font-black text-slate-950 group-hover:text-blue-700">
                                        <Icon size={17} className="text-blue-700" /> {step.title}
                                    </span>
                                    <span className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">{step.description}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ol>
            </section>

            <section aria-labelledby="akses-cpns" className="st-flat-card p-5">
                <h2 id="akses-cpns" className="st-heading text-xl md:text-2xl">
                    Akses &amp; token CPNS
                </h2>
                {hasActivePass ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <ShieldCheck size={16} /> Tempur Pass CPNS aktif — Mini Tryout dan Full Tryout tanpa hitung token.
                    </p>
                ) : (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Coins size={16} className="text-amber-600" /> Kamu masih memakai token per sesi. Tempur Pass CPNS membuat tryout
                        berulang tanpa token.
                    </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        href="/cpns/dashboard/pass"
                        className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                    >
                        <Sparkles size={15} /> {hasActivePass ? 'Kelola Tempur Pass CPNS' : 'Lihat Tempur Pass CPNS'}
                    </Link>
                    <Link
                        href="/tka"
                        className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        Buka jalur TKA
                    </Link>
                </div>
            </section>
        </div>
    )
}
