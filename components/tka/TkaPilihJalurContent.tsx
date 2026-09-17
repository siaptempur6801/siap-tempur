import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpenCheck, BrainCircuit, Compass, Dumbbell, History, ListChecks, ShieldCheck, Sparkles, Timer } from 'lucide-react'
import TkaLevelSwitcher from '@/components/tka/TkaLevelSwitcher'
import { TKA_AVAILABLE_LEVELS, tkaLevelPath, type TkaLevel } from '@/src/tka/context'

/**
 * Konten halaman **Pilih Jalur khusus TKA**.
 *
 * Fokus ke jenjang yang sedang dibuka: memilih jalur latihan (diagnostik → fokus → mini tryout →
 * full tryout), mengganti jenjang, dan status Tempur Pass jenjang tersebut. Berbeda dari halaman
 * CPNS yang berfokus pada subtes SKD.
 */
const LADDER = [
    {
        path: '/diagnostic',
        title: 'Tes diagnostik',
        description: 'Pemetaan awal untuk melihat bagian yang sudah kuat dan yang perlu dikejar.',
        icon: BrainCircuit,
    },
    {
        path: '/focus',
        title: 'Latihan fokus',
        description: 'Latihan terarah per materi, termasuk mengulang soal yang pernah salah.',
        icon: Dumbbell,
    },
    {
        path: '/mini-tryout',
        title: 'Mini tryout',
        description: 'Sesi singkat per mata pelajaran untuk mengukur kesiapan.',
        icon: Timer,
    },
    {
        path: '/tryout',
        title: 'Full tryout',
        description: 'Simulasi lengkap sesuai komposisi ujian jenjang ini.',
        icon: ListChecks,
    },
] as const

const EVALUATION = [
    { path: '/riwayat', title: 'Riwayat pengerjaan', icon: History },
    { path: '/wrong-questions', title: 'Bank soal salah', icon: BookOpenCheck },
    { path: '/progress', title: 'Perkembangan belajar', icon: BarChart3 },
] as const

export default function TkaPilihJalurContent({ level, hasActivePass }: { level: TkaLevel; hasActivePass: boolean }) {
    const base = tkaLevelPath(level)
    const otherLevels = TKA_AVAILABLE_LEVELS.filter((candidate) => candidate !== level)

    return (
        <div className="space-y-6 md:space-y-8">
            <header className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
                <p className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue-50)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700 ring-1 ring-blue-200/70">
                    <Compass size={14} /> Pilih jalur TKA {level}
                </p>
                <h1 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    Tentukan langkah belajar TKA {level} berikutnya
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                    Materi dan tryout mengikuti jenjang. Pilih salah satu jalur di bawah, atau ganti jenjang bila kamu
                    ingin berlatih untuk tingkat lain.
                </p>
                <div className="mt-4 max-w-sm">
                    <TkaLevelSwitcher activeLevel={level} compact />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    {otherLevels.map((candidate) => (
                        <Link
                            key={candidate}
                            href={`${tkaLevelPath(candidate)}/pilih-jalur`}
                            className="st-focus inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:bg-slate-50"
                        >
                            Lihat jalur {candidate} <ArrowRight size={13} />
                        </Link>
                    ))}
                </div>
            </header>

            <section aria-labelledby="jalur-latihan" className="space-y-3">
                <div>
                    <h2 id="jalur-latihan" className="text-base font-black tracking-tight text-slate-950">
                        Jalur latihan TKA {level}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Urutan yang disarankan: ukur dulu, latih yang lemah, lalu uji dengan tryout.</p>
                </div>
                <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {LADDER.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <li key={step.path}>
                                <Link
                                    href={`${base}${step.path}`}
                                    className="st-focus group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
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

            <section aria-labelledby="evaluasi-tka" className="space-y-3">
                <div>
                    <h2 id="evaluasi-tka" className="text-base font-black tracking-tight text-slate-950">
                        Evaluasi hasil
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Pakai data pengerjaanmu untuk memutuskan langkah berikutnya.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {EVALUATION.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.path}
                                href={`${base}${item.path}`}
                                className="st-focus group flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-md"
                            >
                                <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950 group-hover:text-blue-700">
                                    <Icon size={17} className="text-blue-700" /> {item.title}
                                </span>
                                <ArrowRight size={15} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        )
                    })}
                </div>
            </section>

            <section aria-labelledby="akses-tka" className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <h2 id="akses-tka" className="text-base font-black tracking-tight text-slate-950">
                    Akses Tempur Pass TKA {level}
                </h2>
                {hasActivePass ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <ShieldCheck size={16} /> Tempur Pass TKA {level} aktif — mini tryout dan full tryout tanpa hitung token.
                    </p>
                ) : (
                    <p className="mt-2 text-sm font-medium text-slate-600">
                        Pass TKA dihitung per jenjang. Pass untuk jenjang lain tidak berlaku di {level}.
                    </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        href={`${base}/pass`}
                        className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                    >
                        <Sparkles size={15} /> {hasActivePass ? `Kelola Tempur Pass ${level}` : `Lihat Tempur Pass ${level}`}
                    </Link>
                    <Link
                        href="/cpns/dashboard/pilih-jalur"
                        className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        Buka jalur CPNS
                    </Link>
                </div>
            </section>
        </div>
    )
}
