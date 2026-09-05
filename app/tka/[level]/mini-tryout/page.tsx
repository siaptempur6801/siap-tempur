import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight, BookOpenCheck, Clock3, History, Sparkles, Timer } from 'lucide-react'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AccessTone = 'default' | 'success' | 'warning'

interface TryoutOption {
    id: string
    title: string
    slug: string
    typeLabel: string
    duration: number | null
    details: string[]
    accessLabel: string
    accessTone: AccessTone
    disabledReason: string | null
    full: boolean
}

function minutes(seconds: unknown) {
    const value = Number(seconds ?? 0)
    return value > 0 ? Math.round(value / 60) : null
}

function examWindowDisabledReason(input: { starts_at: string | null; ends_at: string | null }) {
    const now = Date.now()
    const startsAt = input.starts_at ? Date.parse(input.starts_at) : null
    const endsAt = input.ends_at ? Date.parse(input.ends_at) : null
    if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) return 'Belum dimulai'
    if (endsAt !== null && Number.isFinite(endsAt) && endsAt < now) return 'Sudah berakhir'
    return null
}

function entitlementUsable(input: {
    starts_at: string
    expires_at: string | null
    usage_limit: number | null
    usage_count: number
}) {
    const now = Date.now()
    const startsAt = Date.parse(input.starts_at)
    const expiresAt = input.expires_at ? Date.parse(input.expires_at) : null
    const withinWindow = Number.isFinite(startsAt) && startsAt <= now && (expiresAt === null || expiresAt > now)
    const withinUsage = input.usage_limit === null || input.usage_count < input.usage_limit
    return withinWindow && withinUsage
}

function attemptStatus(status: unknown) {
    const value = String(status ?? '').toLowerCase()
    if (value === 'completed' || value === 'submitted') return { label: 'Selesai', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
    if (value === 'in_progress') return { label: 'Sedang dikerjakan', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' }
    if (value === 'expired') return { label: 'Kedaluwarsa', className: 'bg-amber-50 text-amber-700 ring-amber-200' }
    return { label: value || 'Tidak diketahui', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
}

function formatAttemptDate(value: unknown) {
    if (!value) return 'Waktu tidak tersedia'
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return 'Waktu tidak tersedia'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(date)
}

export default async function TkaMiniTryoutPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || level !== 'SMP') notFound()

    const base = tkaLevelPath(level)
    const pagePath = `${base}/mini-tryout`
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`)

    const context = tkaContext(level)
    const stagingSmpPilot = env.appEnvironment() !== 'production'
    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', context.programCode)
        .maybeSingle()
    if (programError) throw programError
    if (!program) notFound()

    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('program_id', program.id)
        .eq('code', context.trackCode)
        .maybeSingle()
    if (trackError) throw trackError
    if (!track) notFound()

    const [{ data: userTrack, error: userTrackError }, { data: exams, error: examError }, { data: examTypes, error: typeError }] = await Promise.all([
        supabase
            .from('user_tracks')
            .select('status')
            .eq('user_id', user.id)
            .eq('track_id', track.id)
            .maybeSingle(),
        supabase
            .from('exams')
            .select('id, exam_type_id, title, slug, duration_seconds, attempt_limit, access_type, required_feature_id, starts_at, ends_at')
            .eq('program_id', program.id)
            .eq('track_id', track.id)
            .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED'])
            .order('created_at', { ascending: true }),
        supabase.from('exam_types').select('id, code, name'),
    ])
    if (userTrackError) throw userTrackError
    if (examError) throw examError
    if (typeError) throw typeError

    const examTypeById = new Map((examTypes ?? []).map((row) => [String(row.id), row]))
    const miniTryoutExams = (exams ?? []).filter((exam) => {
        const typeCode = String(examTypeById.get(String(exam.exam_type_id))?.code ?? '').toUpperCase()
        const slug = String(exam.slug ?? '').toLowerCase()
        const isTryout = typeCode.includes('TRYOUT') || slug.includes('-mini-') || slug.endsWith('-full')
        const isFull = slug.includes('full') || typeCode.includes('FULL')
        return isTryout && !isFull
    })
    const examIds = miniTryoutExams.map((exam) => String(exam.id))
    const featureIds = Array.from(new Set(miniTryoutExams
        .map((exam) => exam.required_feature_id ? String(exam.required_feature_id) : '')
        .filter(Boolean)))

    const [{ data: entitlementRows, error: entitlementError }, { data: attemptRows, error: attemptError }] = await Promise.all([
        featureIds.length > 0
            ? supabase
                .from('entitlements')
                .select('feature_id, starts_at, expires_at, usage_limit, usage_count')
                .eq('user_id', user.id)
                .in('feature_id', featureIds)
                .in('status', ['active', 'ACTIVE'])
            : Promise.resolve({ data: [], error: null }),
        examIds.length > 0
            ? supabase
                .from('exam_attempts')
                .select('id, exam_id, attempt_number, status, started_at, submitted_at, percentage, updated_at')
                .eq('user_id', user.id)
                .in('exam_id', examIds)
                .order('updated_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
    ])
    if (entitlementError) throw entitlementError
    if (attemptError) throw attemptError

    const entitledFeatures = new Set<string>()
    for (const row of entitlementRows ?? []) {
        if (entitlementUsable({
            starts_at: String(row.starts_at),
            expires_at: row.expires_at ? String(row.expires_at) : null,
            usage_limit: row.usage_limit === null ? null : Number(row.usage_limit),
            usage_count: Number(row.usage_count ?? 0),
        })) {
            entitledFeatures.add(String(row.feature_id))
        }
    }

    const attemptCountByExam = new Map<string, number>()
    for (const row of attemptRows ?? []) {
        const examId = String(row.exam_id)
        attemptCountByExam.set(examId, (attemptCountByExam.get(examId) ?? 0) + 1)
    }

    const examById = new Map(miniTryoutExams.map((exam) => [String(exam.id), exam]))
    const activeTrack = userTrack?.status.toLowerCase() === 'active'
    const recentAttempts = (attemptRows ?? []).slice(0, 6)
    const miniTryouts: TryoutOption[] = miniTryoutExams.map((exam) => {
        const type = examTypeById.get(String(exam.exam_type_id))
        const slug = String(exam.slug)
        const featureId = exam.required_feature_id ? String(exam.required_feature_id) : null
        const hasEntitlement = featureId ? entitledFeatures.has(featureId) : false
        const usedAttempts = attemptCountByExam.get(String(exam.id)) ?? 0
        const access = String(exam.access_type ?? 'FREE').toUpperCase()
        const freeLimit = Number(exam.attempt_limit ?? 1)
        const stagingMiniExam = stagingSmpPilot && slug.startsWith('tka-smp-mini-')
        const freemiumLocked = access === 'FREEMIUM' && !hasEntitlement && usedAttempts >= freeLimit
        const premiumLocked = !stagingMiniExam && access === 'PREMIUM' && !hasEntitlement
        const accessReason = premiumLocked
            ? 'Butuh Tempur Pass'
            : freemiumLocked
                ? 'Kuota gratis habis · Butuh Tempur Pass'
                : null
        const accessLabel = stagingMiniExam
            ? 'Akses uji coba'
            : hasEntitlement
                ? 'Tempur Pass aktif'
                : access === 'FREEMIUM'
                    ? `Gratis ${Math.max(0, freeLimit - usedAttempts)}x tersisa`
                    : access === 'PREMIUM'
                        ? 'Premium · Tempur Pass'
                        : 'Gratis'
        const details = stagingMiniExam
            ? ['15 soal · 1 mapel']
            : ['15 soal fokus']

        return {
            id: String(exam.id),
            title: String(exam.title),
            slug,
            typeLabel: String(type?.name || type?.code || 'Mini Tryout'),
            duration: minutes(exam.duration_seconds),
            details,
            accessLabel,
            accessTone: hasEntitlement ? 'success' : accessReason ? 'warning' : 'default',
            disabledReason: !activeTrack ? 'Aktifkan jalur belajar terlebih dahulu' : examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at }) || accessReason,
            full: false,
        }
    })

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <header className="border-b border-slate-200/80 pb-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black tracking-wide text-indigo-700 ring-1 ring-indigo-200/50">
                        <Timer size={14} className="text-indigo-600" />
                        <span>Mini Tryout · TKA {level}</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                        Mini Tryout per Mata Pelajaran
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Ukur penguasaan per mata pelajaran secara ringkas (15 butir soal · 35 menit). Cocok untuk evaluasi berkala dan menemukan topik yang perlu diperdalam.
                    </p>
                </header>

                {!activeTrack && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
                        <p className="font-bold">Jalur TKA SMP belum aktif.</p>
                        <p className="mt-1">Aktifkan jalur belajar dari dashboard sebelum memulai Mini Tryout agar nilai tersimpan rapi.</p>
                        <Link href={base} className="st-focus mt-3 inline-flex min-h-10 items-center gap-2 font-bold text-amber-950 hover:underline">
                            Aktifkan di dashboard <ArrowRight size={15} />
                        </Link>
                    </div>
                )}

                {/* Banner link to Full Tryout */}
                <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                            <Sparkles size={18} />
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Ingin simulasi menyeluruh bertempo standar ujian?</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Coba Full Tryout dengan 60 soal mencakup Bahasa Indonesia dan Matematika sekaligus.</p>
                        </div>
                    </div>
                    <Link
                        href={`${base}/tryout`}
                        className="st-focus inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 active:scale-[0.98]"
                    >
                        <span>Buka Full Tryout</span>
                        <ArrowRight size={14} />
                    </Link>
                </section>

                {/* Mini Tryout Exam Cards */}
                <section aria-labelledby="mini-tryout-list" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 id="mini-tryout-list" className="text-xl font-bold text-slate-950">Pilih Mini Tryout</h2>
                        <span className="text-xs font-semibold text-slate-500">{miniTryouts.length} paket tersedia</span>
                    </div>

                    {miniTryouts.length > 0 ? (
                        <div className="grid gap-5 md:grid-cols-2">
                            {miniTryouts.map((exam) => (
                                <article key={exam.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{exam.typeLabel}</p>
                                                <h3 className="mt-2 text-lg font-bold text-slate-950">{exam.title}</h3>
                                            </div>
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                                <Timer size={20} />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {exam.duration && <MetaChip icon={<Clock3 size={13} />} text={`${exam.duration} menit`} />}
                                            {exam.details.map((detail) => <MetaChip key={detail} text={detail} />)}
                                            <MetaChip text={exam.accessLabel} tone={exam.accessTone} />
                                        </div>
                                    </div>
                                    <TkaStartExamButton level={level} examSlug={exam.slug} disabledReason={exam.disabledReason} />
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            title="Mini Tryout belum tersedia"
                            description="Paket Mini Tryout sedang disiapkan untuk jenjang ini."
                        />
                    )}
                </section>

                {/* Riwayat Mini Tryout */}
                <section aria-labelledby="mini-tryout-history" className="space-y-4 border-t border-slate-200/80 pt-7">
                    <div>
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600">
                            <History size={15} /> Aktivitas Mini Tryout
                        </div>
                        <h2 id="mini-tryout-history" className="mt-1 text-xl font-bold text-slate-950">Riwayat Terkini</h2>
                    </div>

                    {recentAttempts.length > 0 ? (
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                            {recentAttempts.map((attempt) => {
                                const exam = examById.get(String(attempt.exam_id))
                                if (!exam) return null
                                const status = attemptStatus(attempt.status)
                                const completed = ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase())
                                const href = completed ? `${base}/tryout/${attempt.id}/result` : `${base}/tryout/${attempt.id}`
                                return (
                                    <Link
                                        key={attempt.id}
                                        href={href}
                                        className="st-focus group grid gap-3 px-5 py-4 transition hover:bg-slate-50/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-bold text-slate-950">{exam.title}</h3>
                                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${status.className}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Pengerjaan #{attempt.attempt_number} · {formatAttemptDate(attempt.updated_at || attempt.submitted_at || attempt.started_at)}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 group-hover:underline">
                                            {completed && attempt.percentage !== null
                                                ? `Skor ${Number(attempt.percentage).toFixed(0)}%`
                                                : completed
                                                    ? 'Lihat hasil'
                                                    : 'Lanjutkan'}
                                            <ArrowRight size={14} />
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            title="Belum ada riwayat Mini Tryout"
                            description="Mini Tryout yang kamu mulai atau selesaikan akan tercatat otomatis di sini."
                        />
                    )}
                </section>
            </div>
        </main>
    )
}

function MetaChip({ icon, text, tone = 'default' }: { icon?: React.ReactNode; text: string; tone?: AccessTone }) {
    const toneClass = tone === 'success'
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
        : tone === 'warning'
            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
            : 'bg-slate-100 text-slate-600'
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>
            {icon}
            {text}
        </span>
    )
}

function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-xs">
            <BookOpenCheck size={26} className="mx-auto text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-950">{title}</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">{description}</p>
        </div>
    )
}
