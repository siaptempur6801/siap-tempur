import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    BarChart3,
    BookOpenText,
    BrainCircuit,
    CheckCircle2,
    Clock3,
    Sigma,
    Target,
} from 'lucide-react'
import TkaDiagnosticStartButton from '@/components/tka/TkaDiagnosticStartButton'
import { createClient } from '@/lib/utils/supabase/server'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DIAGNOSTIC_SLUG = 'tka-smp-diagnostic-awal'
const COMPETENCIES = [
    ['Bahasa Indonesia', 'Pemahaman Tekstual'],
    ['Bahasa Indonesia', 'Pemahaman Inferensial'],
    ['Bahasa Indonesia', 'Evaluasi dan Apresiasi'],
    ['Matematika', 'Bilangan'],
    ['Matematika', 'Aljabar'],
    ['Matematika', 'Geometri dan Pengukuran'],
    ['Matematika', 'Data dan Peluang'],
] as const

export default async function TkaDiagnosticPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()
    const base = tkaLevelPath(level)
    if (!isTkaLevelAvailable(level)) redirect(base)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/diagnostic`)}`)

    const { data: program } = await supabase.from('programs').select('id').eq('code', 'TKA').maybeSingle()
    const { data: track } = program?.id
        ? await supabase.from('tracks').select('id').eq('program_id', program.id).eq('code', 'SMP').maybeSingle()
        : { data: null }

    const [{ data: userTrack }, { data: exam }] = await Promise.all([
        track?.id
            ? supabase.from('user_tracks').select('status').eq('user_id', user.id).eq('track_id', track.id).maybeSingle()
            : Promise.resolve({ data: null }),
        track?.id
            ? supabase.from('exams').select('id, status').eq('track_id', track.id).eq('slug', DIAGNOSTIC_SLUG).maybeSingle()
            : Promise.resolve({ data: null }),
    ])

    const { data: attempts } = exam?.id
        ? await supabase
            .from('exam_attempts')
            .select('id, status, percentage, submitted_at, updated_at')
            .eq('user_id', user.id)
            .eq('exam_id', exam.id)
            .order('attempt_number', { ascending: false })
            .limit(2)
        : { data: [] }

    const activeTrack = String(userTrack?.status ?? '').toLowerCase() === 'active'
    const examActive = String(exam?.status ?? '').toLowerCase() === 'active'
    const inProgress = (attempts ?? []).find((attempt) => String(attempt.status).toLowerCase() === 'in_progress')
    const completed = (attempts ?? []).find((attempt) => ['completed', 'submitted'].includes(String(attempt.status).toLowerCase()))
    const disabledReason = !activeTrack
        ? `Aktifkan jalur TKA ${level} dulu`
        : !examActive
            ? 'Tes diagnostik belum dibuka'
            : null

    return (
        <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                {/* Hero Section */}
                <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-7">
                    <div className="grid gap-6 text-slate-950 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black tracking-wide text-indigo-700 ring-1 ring-indigo-200/50">
                                <BrainCircuit size={14} className="text-indigo-600" />
                                <span>Baseline Kemampuan · TKA {level}</span>
                            </div>
                            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                                Tes Diagnostik TKA {level}
                            </h1>
                            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                                Kerjakan 28 soal untuk memetakan kemampuan awalmu. Hasilnya membantu menentukan materi yang perlu diperkuat sebelum masuk ke latihan dan tryout.
                            </p>

                            <div data-testid="diagnostic-primary-action" className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                                <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Langkah berikutnya</p>
                                <div className="mt-2">
                                    {inProgress?.id ? (
                                        <div>
                                            <p className="mb-3 text-sm font-semibold leading-relaxed text-slate-600">Tesmu belum selesai. Lanjutkan dari bagian dan jawaban terakhir yang tersimpan.</p>
                                            <Link
                                                href={`${base}/diagnostic/${inProgress.id}`}
                                                className="st-focus inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] sm:w-auto"
                                            >
                                                <BrainCircuit size={17} />
                                                <span>Lanjutkan Tes Diagnostik</span>
                                            </Link>
                                        </div>
                                    ) : completed?.id ? (
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <Link
                                                href={`${base}/diagnostic/${completed.id}/result`}
                                                className="st-focus inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]"
                                            >
                                                <BarChart3 size={17} />
                                                <span>Lihat Hasil & Rekomendasi Diagnostik</span>
                                            </Link>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                                                <CheckCircle2 size={14} /> Baseline tersimpan
                                            </span>
                                        </div>
                                    ) : (
                                        <TkaDiagnosticStartButton disabledReason={disabledReason} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                            <Stat icon={<Target size={18} className="text-indigo-600" />} value="28" label="soal" />
                            <Stat icon={<BrainCircuit size={18} className="text-blue-600" />} value="7" label="kompetensi" />
                            <Stat icon={<Clock3 size={18} className="text-amber-600" />} value="35" label="menit" />
                            <Stat
                                icon={<CheckCircle2 size={18} className="text-emerald-600" />}
                                value={inProgress?.id ? 'Berjalan' : completed?.id ? 'Selesai' : '1x'}
                                label={completed?.id || inProgress?.id ? 'status' : 'gratis'}
                            />
                        </div>
                    </div>
                </section>

                {!activeTrack && (
                    <section className="flex flex-col gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-5 text-sm font-semibold text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <span>Jalur belajar TKA {level} belum aktif. Aktifkan dulu agar hasil pemetaan tersimpan di profilmu.</span>
                        <Link href={base} className="st-focus inline-flex min-h-9 shrink-0 items-center font-bold underline text-amber-950 hover:text-indigo-700">Aktifkan jalur</Link>
                    </section>
                )}

                {/* Cara Kerja & Yang Dipetakan */}
                <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-6">
                        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600">
                            <span>Alur Pengerjaan</span>
                        </div>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                            Dua bagian, satu peta kemampuan.
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                            Tes dibagi menjadi dua sesi terarah tanpa jeda berbelit:
                        </p>

                        <div className="mt-5 space-y-4 text-sm">
                            <Step
                                icon={<BookOpenText size={18} className="text-indigo-600" />}
                                title="Bagian 1: Bahasa Indonesia"
                                description="12 butir soal · 15 menit · 3 kompetensi literasi"
                            />
                            <Step
                                icon={<Sigma size={18} className="text-blue-600" />}
                                title="Bagian 2: Matematika"
                                description="16 butir soal · 20 menit · 4 elemen numerasi"
                            />
                            <Step
                                icon={<BarChart3 size={18} className="text-emerald-600" />}
                                title="Hasil Analisis Personal"
                                description="Peta baseline 7 kompetensi + 3 prioritas materi drill pertama"
                            />
                        </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-6">
                        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600">
                            <span>Cakupan Materi</span>
                        </div>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                            7 kompetensi utama yang dipetakan
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                            Mencakup seluruh standar kompetensi dasar TKA {level}:
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {COMPETENCIES.map(([subject, competency], index) => (
                                <div key={competency} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-colors hover:bg-slate-50">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/60">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{subject}</p>
                                        <p className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">{competency}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            </div>
        </main>
    )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                    {icon}
                </span>
                <span className="text-xs font-semibold text-slate-500">{label}</span>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</div>
        </div>
    )
}

function Step({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/60">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="font-bold text-slate-900 leading-snug">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{description}</p>
            </div>
        </div>
    )
}
