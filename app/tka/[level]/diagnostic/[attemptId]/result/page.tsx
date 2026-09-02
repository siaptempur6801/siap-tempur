import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BrainCircuit,
    CheckCircle2,
    CircleAlert,
    Sparkles,
    Target,
} from 'lucide-react'
import { createClient } from '@/lib/utils/supabase/server'
import { cn } from '@/lib/utils'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DIAGNOSTIC_SLUG = 'tka-smp-diagnostic-awal'

type CompetencyRow = {
    subject_id: string
    knowledge_node_id: string
    attempted_questions: number
    correct_questions: number
    baseline_score: number
    confidence: number
    strength_label: string
    priority_rank: number
}

type RecommendationRow = {
    knowledge_node_id: string
    resource_id: string | null
    priority: number
    score: number
}

export default async function TkaDiagnosticResultPage({
    params,
}: {
    params: Promise<{ level: string; attemptId: string }>
}) {
    const { level: rawLevel, attemptId } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()
    const base = tkaLevelPath(level)
    if (level !== 'SMP') redirect(base)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/diagnostic/${attemptId}/result`)}`)

    const { data: attempt } = await supabase
        .from('exam_attempts')
        .select('id, exam_id, status, percentage')
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .maybeSingle()
    if (!attempt?.id) redirect(`${base}/diagnostic`)
    if (!['completed', 'submitted'].includes(String(attempt.status).toLowerCase())) redirect(`${base}/diagnostic/${attemptId}`)

    const { data: exam } = await supabase.from('exams').select('id, slug').eq('id', attempt.exam_id).maybeSingle()
    if (!exam?.id || exam.slug !== DIAGNOSTIC_SLUG) redirect(base)

    const { data: profile, error: profileError } = await supabase
        .from('diagnostic_profiles')
        .select('id, overall_score, evidence_count, recommendation_reason, recommended_knowledge_node_id, track_id, completed_at')
        .eq('user_id', user.id)
        .eq('exam_attempt_id', attemptId)
        .maybeSingle()
    if (profileError) throw profileError
    if (!profile?.id) redirect(`${base}/diagnostic`)

    const [{ data: competencyData, error: competencyError }, { data: recommendationData, error: recommendationError }] = await Promise.all([
        supabase
            .from('diagnostic_competency_results')
            .select('subject_id, knowledge_node_id, attempted_questions, correct_questions, baseline_score, confidence, strength_label, priority_rank')
            .eq('diagnostic_profile_id', profile.id)
            .order('priority_rank', { ascending: true }),
        supabase
            .from('learning_recommendations')
            .select('knowledge_node_id, resource_id, priority, score')
            .eq('user_id', user.id)
            .eq('track_id', profile.track_id)
            .eq('recommendation_type', 'diagnostic_baseline_v1')
            .eq('status', 'active')
            .order('priority', { ascending: true })
            .limit(3),
    ])
    if (competencyError) throw competencyError
    if (recommendationError) throw recommendationError

    const competencies = (competencyData ?? []) as CompetencyRow[]
    const storedRecommendations = (recommendationData ?? []) as RecommendationRow[]
    const nodeIds = Array.from(new Set([
        ...competencies.map((row) => row.knowledge_node_id),
        ...storedRecommendations.map((row) => row.knowledge_node_id),
    ]))
    const subjectIds = Array.from(new Set(competencies.map((row) => row.subject_id)))
    const resourceIds = Array.from(new Set(storedRecommendations.map((row) => row.resource_id).filter((value): value is string => Boolean(value))))

    const [{ data: nodes }, { data: subjects }, { data: resources }] = await Promise.all([
        nodeIds.length ? supabase.from('knowledge_nodes').select('id, code, name').in('id', nodeIds) : Promise.resolve({ data: [] }),
        subjectIds.length ? supabase.from('subjects').select('id, code, name').in('id', subjectIds) : Promise.resolve({ data: [] }),
        resourceIds.length ? supabase.from('exams').select('id, slug, title').in('id', resourceIds) : Promise.resolve({ data: [] }),
    ])

    const nodeById = new Map((nodes ?? []).map((row) => [String(row.id), { code: String(row.code ?? ''), name: String(row.name) }]))
    const subjectById = new Map((subjects ?? []).map((row) => [String(row.id), { code: String(row.code), name: String(row.name) }]))
    const resourceById = new Map((resources ?? []).map((row) => [String(row.id), { slug: String(row.slug), title: String(row.title) }]))

    const recommendations = storedRecommendations.length > 0
        ? storedRecommendations
        : competencies.slice(0, 3).map((row) => ({
            knowledge_node_id: row.knowledge_node_id,
            resource_id: null,
            priority: row.priority_rank,
            score: Math.max(0, 1 - Number(row.baseline_score) / 100),
        }))
    const competencyByNode = new Map(competencies.map((row) => [row.knowledge_node_id, row]))
    const overall = Number(profile.overall_score ?? attempt.percentage ?? 0)
    const strongest = [...competencies].sort((a, b) => Number(b.baseline_score) - Number(a.baseline_score))[0]
    const weakest = competencies[0]

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-5 md:px-7 md:py-7">
            <div data-testid="tka-diagnostic-result" className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`${base}/diagnostic`} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 hover:bg-white hover:text-indigo-700"><ArrowLeft size={17} /> Tes Diagnostik</Link>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">Baseline tersimpan</span>
                </div>

                <section className="grid gap-5 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-5 text-white shadow-[0_18px_42px_rgba(79,70,229,0.18)] lg:grid-cols-[1.4fr_0.6fr] lg:items-center md:p-7">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]"><Sparkles size={15} /> Hasil Diagnostik</span>
                        <h1 className="mt-4 text-3xl font-black tracking-[-0.035em] md:text-4xl">Peta kemampuan awalmu sudah siap.</h1>
                        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-indigo-100 md:text-base">Ini bukan nilai kelulusan. Baseline ini dipakai untuk menentukan kompetensi mana yang paling berguna kamu perkuat lebih dulu.</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/20 bg-white/15 p-4 text-center backdrop-blur-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Baseline keseluruhan</div>
                        <div className="mt-1 text-5xl font-black">{overall.toFixed(0)}%</div>
                        <div className="mt-1 text-xs font-bold text-indigo-100">{Number(profile.evidence_count ?? 0)} soal dipetakan</div>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-3">
                    <Summary icon={<BrainCircuit size={17} />} label="Kompetensi dipetakan" value={`${competencies.length}/7`} />
                    <Summary icon={<CheckCircle2 size={17} />} label="Terkuat saat ini" value={strongest ? nodeById.get(strongest.knowledge_node_id)?.name ?? '—' : '—'} />
                    <Summary icon={<Target size={17} />} label="Prioritas pertama" value={weakest ? nodeById.get(weakest.knowledge_node_id)?.name ?? '—' : '—'} />
                </section>

                <section>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">Peta kompetensi</p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">7 kompetensi, satu baseline yang mudah dibaca</h2>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {competencies.map((row) => {
                            const node = nodeById.get(row.knowledge_node_id)
                            const subject = subjectById.get(row.subject_id)
                            const score = Number(row.baseline_score ?? 0)
                            return (
                                <article key={row.knowledge_node_id} data-testid="diagnostic-competency-card" className="rounded-[1.1rem] border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{subject?.name ?? subject?.code ?? 'TKA SMP'}</p>
                                            <h3 className="mt-1 text-base font-black text-slate-900">{node?.name ?? 'Kompetensi'}</h3>
                                        </div>
                                        <Strength label={row.strength_label} />
                                    </div>
                                    <div className="mt-4 flex items-end justify-between gap-3">
                                        <div className="text-3xl font-black tracking-tight text-slate-950">{score.toFixed(0)}%</div>
                                        <div className="text-xs font-bold text-slate-500">{Number(row.correct_questions)}/{Number(row.attempted_questions)} benar</div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-500')} style={{ width: `${Math.max(3, Math.min(100, score))}%` }} /></div>
                                    <p className="mt-2 text-[11px] font-bold text-slate-400">Prioritas #{Number(row.priority_rank)} · keyakinan data {(Number(row.confidence ?? 0) * 100).toFixed(0)}%</p>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="rounded-[1.2rem] border border-indigo-100 bg-indigo-50/60 p-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><BrainCircuit size={18} /></span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">Rekomendasi personal</p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Mulai dari tiga prioritas ini</h2>
                            <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">Urutan dibuat dari baseline terendah. Setelah kamu punya bukti belajar baru, rekomendasi diagnostik akan digantikan oleh rekomendasi berbasis perkembangan aktual.</p>
                        </div>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {recommendations.slice(0, 3).map((row) => {
                            const competency = competencyByNode.get(row.knowledge_node_id)
                            const node = nodeById.get(row.knowledge_node_id)
                            const subject = competency ? subjectById.get(competency.subject_id) : null
                            const resource = row.resource_id ? resourceById.get(row.resource_id) : null
                            return (
                                <article key={row.knowledge_node_id} data-testid="diagnostic-recommendation-card" className="rounded-[1rem] border border-indigo-100 bg-white p-4 shadow-sm">
                                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-black text-indigo-700">Prioritas {Number(row.priority)}</span>
                                    <h3 className="mt-3 text-lg font-black text-slate-950">{node?.name ?? 'Fokus belajar'}</h3>
                                    <p className="mt-1 text-xs font-bold text-slate-500">{subject?.name ?? 'TKA SMP'} · baseline {competency ? Number(competency.baseline_score).toFixed(0) : '—'}%</p>
                                    <Link href={`${base}#tka-tryout`} className="st-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl text-sm font-black text-indigo-700 hover:underline">
                                        {resource?.title ? `Latih lewat ${resource.title}` : 'Pilih latihan berikutnya'} <ArrowRight size={15} />
                                    </Link>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="flex flex-col gap-4 rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"><CircleAlert size={15} /> Langkah berikutnya</div>
                        <h2 className="mt-1 text-xl font-black text-slate-950">Gunakan baseline ini, lalu kumpulkan bukti belajar nyata.</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Mini Tryout dan latihan berikutnya akan memperbarui fokusmu berdasarkan performa terbaru.</p>
                    </div>
                    <Link href={`${base}#tka-tryout`} className="st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Mulai belajar <ArrowRight size={16} /></Link>
                </section>
            </div>
        </main>
    )
}

function Strength({ label }: { label: string }) {
    const normalized = String(label).toUpperCase()
    const text = normalized === 'KUAT' ? 'Kuat' : normalized === 'CUKUP' ? 'Cukup' : 'Perlu dikuatkan'
    const className = normalized === 'KUAT' ? 'bg-emerald-50 text-emerald-700' : normalized === 'CUKUP' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
    return <span className={cn('rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide', className)}>{text}</span>
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{icon}{label}</div>
            <div className="mt-2 line-clamp-2 text-lg font-black text-slate-950">{value}</div>
        </div>
    )
}
