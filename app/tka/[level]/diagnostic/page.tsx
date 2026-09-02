import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowLeft,
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
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

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
    if (level !== 'SMP') redirect(base)

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
        ? 'Aktifkan jalur TKA SMP dulu'
        : !examActive
            ? 'Tes diagnostik belum dibuka'
            : null

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-5 md:px-7 md:py-7">
            <div className="mx-auto max-w-6xl space-y-6">
                <Link href={base} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-indigo-700">
                    <ArrowLeft size={17} /> Kembali ke TKA SMP
                </Link>

                <section className="grid gap-5 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-5 text-white shadow-[0_18px_42px_rgba(79,70,229,0.18)] lg:grid-cols-[1.4fr_0.6fr] lg:items-center md:p-7">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                            <BrainCircuit size={15} /> Baseline kemampuan
                        </span>
                        <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.035em] md:text-4xl">Temukan fokus belajar sebelum mulai banyak tryout.</h1>
                        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-indigo-100 md:text-base">
                            Kerjakan 28 soal singkat untuk memetakan 7 kompetensi utama TKA SMP. Setelah selesai, SiapTempur akan menunjukkan tiga prioritas belajar pertamamu.
                        </p>
                        <div className="mt-5">
                            {completed?.id ? (
                                <Link href={`${base}/diagnostic/${completed.id}/result`} className="st-focus inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-sm">
                                    <BarChart3 size={17} /> Lihat Hasil Diagnostik
                                </Link>
                            ) : inProgress?.id ? (
                                <Link href={`${base}/diagnostic/${inProgress.id}`} className="st-focus inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-sm">
                                    <BrainCircuit size={17} /> Lanjutkan Tes Diagnostik
                                </Link>
                            ) : (
                                <TkaDiagnosticStartButton disabledReason={disabledReason} />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Stat icon={<Target size={17} />} value="28" label="soal" />
                        <Stat icon={<BrainCircuit size={17} />} value="7" label="kompetensi" />
                        <Stat icon={<Clock3 size={17} />} value="35" label="menit" />
                        <Stat icon={<CheckCircle2 size={17} />} value="1x" label="gratis" />
                    </div>
                </section>

                {!activeTrack && (
                    <section className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                        Jalur TKA SMP belum aktif. <Link href={base} className="font-black underline">Aktifkan jalur belajar</Link> terlebih dahulu, lalu kembali ke tes diagnostik.
                    </section>
                )}

                <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
                    <article className="rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">Cara kerja</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Dua bagian, satu peta kemampuan.</h2>
                        <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                            <Step icon={<BookOpenText size={16} />} title="Bahasa Indonesia" description="12 soal · 15 menit · 3 kompetensi" />
                            <Step icon={<Sigma size={16} />} title="Matematika" description="16 soal · 20 menit · 4 elemen" />
                            <Step icon={<BarChart3 size={16} />} title="Hasil personal" description="Baseline 7 kompetensi + 3 prioritas belajar" />
                        </div>
                    </article>

                    <article className="rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">Yang dipetakan</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">7 kompetensi utama</h2>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {COMPETENCIES.map(([subject, competency], index) => (
                                <div key={competency} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">{index + 1}</span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{subject}</p>
                                        <p className="mt-0.5 text-sm font-black text-slate-800">{competency}</p>
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
        <div className="rounded-xl border border-white/15 bg-white/12 p-3 backdrop-blur-sm">
            <div className="text-indigo-100">{icon}</div>
            <div className="mt-2 text-2xl font-black">{value}</div>
            <div className="text-[11px] font-bold text-indigo-100">{label}</div>
        </div>
    )
}

function Step({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">{icon}</span>
            <div><p className="font-black text-slate-800">{title}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>
        </div>
    )
}
