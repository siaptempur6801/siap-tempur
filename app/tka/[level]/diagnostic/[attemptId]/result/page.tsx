import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowRight,
    BrainCircuit,
    CheckCircle2,
    CircleAlert,
    Sparkles,
    Target,
} from 'lucide-react'
import TkaStartDrillButton from '@/components/tka/TkaStartDrillButton'
import ProgressBar from '@/components/ui/ProgressBar'
import { createClient } from '@/lib/utils/supabase/server'
import { cn } from '@/lib/utils'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

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
    if (!isTkaLevelAvailable(level)) redirect(base)

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
    const primaryRecommendation = recommendations[0] ?? null
    const primaryCompetency = primaryRecommendation ? competencyByNode.get(primaryRecommendation.knowledge_node_id) : null
    const primaryNode = primaryRecommendation ? nodeById.get(primaryRecommendation.knowledge_node_id) : null
    const primarySubject = primaryCompetency ? subjectById.get(primaryCompetency.subject_id) : null
    const primaryDrillReady = Boolean(primarySubject?.code && primaryNode?.name)
    const overall = Number(profile.overall_score ?? attempt.percentage ?? 0)
    const strongest = [...competencies].sort((a, b) => Number(b.baseline_score) - Number(a.baseline_score))[0]
    const weakest = competencies[0]

    return (
        <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div data-testid="tka-diagnostic-result" className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200/70">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Baseline tersimpan
                    </span>
                    <Link
                        href={`${base}/diagnostic`}
                        className="st-focus inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-indigo-600 transition"
                    >
                        Kembali ke Ringkasan Diagnostik
                    </Link>
                </div>

                <section className="grid gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 p-6 text-white shadow-xl shadow-blue-600/15 lg:grid-cols-[1.4fr_0.6fr] lg:items-center md:p-8">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-100 backdrop-blur-sm">
                            <Sparkles size={14} /> Hasil Diagnostik
                        </span>
                        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl text-white">Peta kemampuan awalmu sudah siap.</h1>
                        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-indigo-100/90 md:text-base">
                            Ini bukan nilai kelulusan. Baseline ini dipakai untuk menentukan kompetensi mana yang paling berguna kamu perkuat lebih dulu.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur-md">
                        <div className="text-xs font-black uppercase tracking-wider text-indigo-200">Baseline keseluruhan</div>
                        <div className="mt-2 text-5xl font-black tracking-tight text-white">{overall.toFixed(0)}%</div>
                        <div className="mt-2 text-xs font-bold text-indigo-100">{Number(profile.evidence_count ?? 0)} soal dipetakan</div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <Summary icon={<BrainCircuit size={18} className="text-indigo-600" />} label="Kompetensi dipetakan" value={`${competencies.length}/7`} />
                    <Summary icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Terkuat saat ini" value={strongest ? nodeById.get(strongest.knowledge_node_id)?.name ?? '—' : '—'} />
                    <Summary icon={<Target size={18} className="text-amber-600" />} label="Prioritas pertama" value={weakest ? nodeById.get(weakest.knowledge_node_id)?.name ?? '—' : '—'} />
                </section>

                <section className="space-y-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Peta kompetensi</p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">7 kompetensi, satu baseline yang mudah dibaca</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {competencies.map((row) => {
                            const node = nodeById.get(row.knowledge_node_id)
                            const subject = subjectById.get(row.subject_id)
                            const score = Number(row.baseline_score ?? 0)
                            return (
                                <article
                                    key={row.knowledge_node_id}
                                    data-testid="diagnostic-competency-card"
                                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{subject?.name ?? subject?.code ?? `TKA ${level}`}</p>
                                                <h3 className="mt-1 text-base font-black text-slate-900">{node?.name ?? 'Kompetensi'}</h3>
                                            </div>
                                            <Strength label={row.strength_label} />
                                        </div>
                                        <div className="mt-4 flex items-end justify-between gap-3">
                                            <div className="text-3xl font-black tracking-tight text-slate-900">{score.toFixed(0)}%</div>
                                            <div className="text-xs font-bold text-slate-500">{Number(row.correct_questions)}/{Number(row.attempted_questions)} benar</div>
                                        </div>
                                        <ProgressBar
                                            value={score}
                                            label={`Skor diagnostik ${node?.name ?? subject?.name ?? 'kompetensi'}`}
                                            size="sm"
                                            className="mt-3 border-slate-200"
                                            indicatorClassName={score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-500'}
                                        />
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
                                        <span>Prioritas #{Number(row.priority_rank)}</span>
                                        <span>Keyakinan {(Number(row.confidence ?? 0) * 100).toFixed(0)}%</span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-indigo-50/30 p-6 md:p-7 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-blue-200">
                            <BrainCircuit size={20} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Rekomendasi personal</p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Mulai dari prioritas utama</h2>
                            <p className="mt-1.5 max-w-2xl text-sm font-semibold text-slate-500 leading-relaxed">
                                Kerjakan prioritas pertama terlebih dahulu. Setelah punya bukti belajar baru, rekomendasi diagnostik akan digantikan oleh rekomendasi berbasis perkembangan aktual.
                            </p>
                        </div>
                    </div>
                    {primaryRecommendation && (
                        <div className="mt-6 flex flex-col gap-4 rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="inline-flex rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-black text-white">
                                    Prioritas utama
                                </div>
                                <h3 className="mt-3 text-xl font-black text-slate-900">{primaryNode?.name ?? 'Fokus belajar'}</h3>
                                <p className="mt-1 text-sm font-bold text-slate-500">{primarySubject?.name ?? `TKA ${level}`} · 10 soal fokus · sekitar 15 menit</p>
                            </div>
                            <div className="shrink-0 md:w-56">
                                <TkaStartDrillButton
                                    level={level}
                                    subjectCode={primarySubject?.code ?? ''}
                                    knowledgeNodeName={primaryNode?.name ?? 'Fokus belajar'}
                                    disabledReason={primaryDrillReady ? null : 'Latihan fokus belum tersedia untuk topik ini.'}
                                    compact
                                />
                            </div>
                        </div>
                    )}
                    {recommendations.length > 1 && (
                        <p className="mt-6 text-xs font-black uppercase tracking-wider text-slate-400">Pilihan fokus berikutnya</p>
                    )}
                    {recommendations.length > 1 && (
                        <div className="mt-6 grid gap-4 lg:grid-cols-3">
                            {recommendations.slice(1, 3).map((row) => {
                            const competency = competencyByNode.get(row.knowledge_node_id)
                            const node = nodeById.get(row.knowledge_node_id)
                            const subject = competency ? subjectById.get(competency.subject_id) : null
                            const resource = row.resource_id ? resourceById.get(row.resource_id) : null
                            const drillReady = Boolean(subject?.code && node?.name)
                            return (
                                <article
                                    key={row.knowledge_node_id}
                                    data-testid="diagnostic-recommendation-card"
                                    className="flex flex-col justify-between rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                                                Prioritas {Number(row.priority)}
                                            </span>
                                            {competency && (
                                                <span className="text-xs font-bold text-slate-400">
                                                    Baseline {Number(competency.baseline_score).toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="mt-3 text-lg font-black text-slate-900">{node?.name ?? 'Fokus belajar'}</h3>
                                        <p className="mt-1 text-xs font-bold text-slate-500">{subject?.name ?? `TKA ${level}`}</p>
                                        {resource?.title && (
                                            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
                                                Jalur terkait: {resource.title}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <TkaStartDrillButton
                                            level={level}
                                            subjectCode={subject?.code ?? ''}
                                            knowledgeNodeName={node?.name ?? 'Fokus belajar'}
                                            disabledReason={drillReady ? null : 'Latihan fokus belum tersedia untuk topik ini.'}
                                        />
                                    </div>
                                </article>
                            )
                            })}
                        </div>
                    )}
                </section>

                <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                            <CircleAlert size={16} /> Langkah berikutnya
                        </div>
                        <h2 className="mt-1.5 text-xl font-black text-slate-900">Gunakan baseline ini, lalu kumpulkan bukti belajar nyata.</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500 leading-relaxed">
                            Mulai dari Latihan Fokus rekomendasi di atas. Hasil latihan akan memperbarui penguasaan dan fokus belajar berikutnya.
                        </p>
                    </div>
                    <Link
                        href={`${base}/progress`}
                        className="st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition"
                    >
                        Lihat perkembangan <ArrowRight size={16} />
                    </Link>
                </section>
            </div>
        </main>
    )
}

function Strength({ label }: { label: string }) {
    const normalized = String(label).toUpperCase()
    const text = normalized === 'KUAT' ? 'Kuat' : normalized === 'CUKUP' ? 'Cukup' : 'Perlu dikuatkan'
    const className = normalized === 'KUAT'
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
        : normalized === 'CUKUP'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70'
        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
    return <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide', className)}>{text}</span>
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                {icon}
                {label}
            </div>
            <div className="mt-2 line-clamp-2 text-lg font-black text-slate-900">{value}</div>
        </div>
    )
}
