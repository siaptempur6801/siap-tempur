import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowRight,
    BookOpen,
    BookOpenCheck,
    Calculator,
    Clock3,
    Sparkles,
    Timer,
    Zap,
} from 'lucide-react'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { createV2Client } from '@/lib/utils/supabase/server'
import { isTkaLevelAvailable, parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

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
    activeAttemptId: string | null
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

function getSubjectConfig(slug: string, title: string) {
    const s = `${slug} ${title}`.toLowerCase()
    if (s.includes('bahasa') || s.includes('indonesia')) {
        return {
            subjectName: 'Bahasa Indonesia',
            badgeBg: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60',
            cardBorder: 'border-2 border-indigo-100/90 hover:border-indigo-300',
            glowColor: 'from-indigo-100/40 via-blue-50/20 to-transparent',
            iconBg: 'bg-indigo-50 text-indigo-600',
            icon: <BookOpen size={18} />,
            chipIcon: <BookOpen size={12} className="text-indigo-600" />,
            topics: ['Pemahaman Teks', 'Ide Pokok', 'Penalaran Bahasa'],
            description: 'Latihan 15 butir soal untuk mengasah pemahaman wacana kritis, logika kalimat, dan tata bahasa baku.',
        }
    }
    if (s.includes('matematika') || s.includes('mat')) {
        return {
            subjectName: 'Matematika',
            badgeBg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
            cardBorder: 'border-2 border-blue-100/90 hover:border-blue-300',
            glowColor: 'from-blue-100/40 via-blue-50/20 to-transparent',
            iconBg: 'bg-blue-50 text-blue-600',
            icon: <Calculator size={18} />,
            chipIcon: <Calculator size={12} className="text-blue-600" />,
            topics: ['Aritmetika & Aljabar', 'Geometri Bangun', 'Logika Numerik'],
            description: 'Latihan 15 butir soal untuk melatih kecepatan berhitung, pemecahan masalah numerik, dan analisis pola.',
        }
    }
    return {
        subjectName: 'Mata Pelajaran',
        badgeBg: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
        cardBorder: 'border-2 border-slate-200 hover:border-indigo-200',
        glowColor: 'from-slate-100/40 via-white to-transparent',
        iconBg: 'bg-slate-100 text-slate-600',
        icon: <Timer size={18} />,
        chipIcon: <Timer size={12} className="text-slate-600" />,
        topics: ['Latihan Fokus', 'Standar CAT', 'Simpan Otomatis'],
        description: 'Latihan ringkas 15 butir soal berstandar ujian untuk mengukur penguasaan materi per mata pelajaran.',
    }
}

export default async function TkaMiniTryoutPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || !isTkaLevelAvailable(level)) notFound()

    const base = tkaLevelPath(level)
    const pagePath = `${base}/mini-tryout`
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`)

    const context = tkaContext(level)
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
    const activeAttemptByExam = new Map<string, string>()
    for (const row of attemptRows ?? []) {
        const examId = String(row.exam_id)
        attemptCountByExam.set(examId, (attemptCountByExam.get(examId) ?? 0) + 1)
        if (String(row.status ?? '').toLowerCase() === 'in_progress' && !activeAttemptByExam.has(examId)) {
            activeAttemptByExam.set(examId, String(row.id))
        }
    }

    const activeTrack = userTrack?.status.toLowerCase() === 'active'
    const miniTryouts: TryoutOption[] = miniTryoutExams.map((exam) => {
        const type = examTypeById.get(String(exam.exam_type_id))
        const slug = String(exam.slug)
        const featureId = exam.required_feature_id ? String(exam.required_feature_id) : null
        const hasEntitlement = featureId ? entitledFeatures.has(featureId) : false
        const usedAttempts = attemptCountByExam.get(String(exam.id)) ?? 0
        const access = String(exam.access_type ?? 'FREE').toUpperCase()
        const freeLimit = Number(exam.attempt_limit ?? 1)
        const freemiumLocked = access === 'FREEMIUM' && !hasEntitlement && usedAttempts >= freeLimit
        const premiumLocked = access === 'PREMIUM' && !hasEntitlement
        const accessReason = premiumLocked
            ? 'Butuh Tempur Pass'
            : freemiumLocked
                ? 'Kuota gratis habis · Butuh Tempur Pass'
                : null
        const accessLabel = hasEntitlement
            ? 'Tempur Pass aktif'
            : access === 'FREEMIUM'
                ? `Gratis ${Math.max(0, freeLimit - usedAttempts)}x tersisa`
                : access === 'PREMIUM'
                    ? 'Premium · Tempur Pass'
                    : 'Gratis'
        const details = ['15 soal fokus']

        return {
            id: String(exam.id),
            title: String(exam.title),
            slug,
            typeLabel: String(type?.name || type?.code || 'Mini Tryout'),
            duration: minutes(exam.duration_seconds),
            details,
            accessLabel,
            accessTone: hasEntitlement ? 'success' : accessReason ? 'warning' : 'default',
            disabledReason: activeAttemptByExam.has(String(exam.id))
                ? null
                : !activeTrack
                    ? 'Aktifkan jalur belajar terlebih dahulu'
                    : examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at }) || accessReason,
            activeAttemptId: activeAttemptByExam.get(String(exam.id)) ?? null,
            full: false,
        }
    })

    return (
        <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                {/* Header - 100% consistent with all TKA pages */}
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
                        <p className="font-bold">Jalur TKA {level} belum aktif.</p>
                        <p className="mt-1">Aktifkan jalur belajar dari dashboard sebelum memulai Mini Tryout agar nilai tersimpan rapi.</p>
                        <Link href={base} className="st-focus mt-3 inline-flex min-h-10 items-center gap-2 font-bold text-amber-950 hover:underline">
                            Aktifkan di dashboard <ArrowRight size={15} />
                        </Link>
                    </div>
                )}

                {/* Mini Tryout Subject Cards */}
                <section aria-labelledby="mini-tryout-list" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 id="mini-tryout-list" className="text-xl font-bold text-slate-950">Pilih Paket Ujian</h2>
                            <p className="text-xs text-slate-500">Pilih mata pelajaran yang ingin kamu uji secara terpisah hari ini.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {miniTryouts.length} modul aktif
                        </span>
                    </div>

                    {miniTryouts.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 items-stretch">
                            {miniTryouts.map((exam) => {
                                const config = getSubjectConfig(exam.slug, exam.title)
                                return (
                                    <article
                                        key={exam.id}
                                        className={`relative flex flex-col justify-between overflow-hidden rounded-3xl ${config.cardBorder} bg-white p-6 shadow-md shadow-blue-950/5 ring-1 ring-indigo-500/5 transition-all duration-200 hover:shadow-lg sm:p-7`}
                                    >
                                        {/* Ambient decorative glow in card corner */}
                                        <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${config.glowColor} blur-2xl`} />

                                        <div className="relative z-10 space-y-4">
                                            {/* Top Bar: Subject Badge + Access / Status */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${config.badgeBg}`}>
                                                        {config.chipIcon}
                                                        <span>{config.subjectName}</span>
                                                    </span>
                                                    <MetaChip text={exam.accessLabel} tone={exam.accessTone} />
                                                </div>
                                                {exam.activeAttemptId ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-500/30">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        Sesi Berjalan
                                                    </span>
                                                ) : (
                                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}>
                                                        {config.icon}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Title & Description */}
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">{exam.typeLabel}</p>
                                                <h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                                                    {exam.title}
                                                </h3>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                                                    {config.description}
                                                </p>
                                            </div>

                                            {/* Key Metrics Strip (3 tiles) */}
                                            <div className="grid grid-cols-3 gap-2.5 pt-1">
                                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-indigo-600">
                                                        <Clock3 size={13} />
                                                        <span className="text-[10px] font-bold uppercase text-slate-500">Durasi</span>
                                                    </div>
                                                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                                                        {exam.duration || 35} <span className="text-[11px] font-medium text-slate-500">menit</span>
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-indigo-600">
                                                        <BookOpenCheck size={13} />
                                                        <span className="text-[10px] font-bold uppercase text-slate-500">Jumlah</span>
                                                    </div>
                                                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                                                        15 <span className="text-[11px] font-medium text-slate-500">butir</span>
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-indigo-600">
                                                        <Zap size={13} />
                                                        <span className="text-[10px] font-bold uppercase text-slate-500">Sistem</span>
                                                    </div>
                                                    <p className="mt-1 text-sm font-extrabold text-slate-900">CAT</p>
                                                </div>
                                            </div>

                                            {/* Focus Topics */}
                                            <div className="space-y-1.5 pt-1">
                                                <p className="text-[11px] font-bold text-slate-700">Cakupan Materi:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {config.topics.map((topic) => (
                                                        <span
                                                            key={topic}
                                                            className="rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                                        >
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Start Button */}
                                        <div className="relative z-10 mt-5 border-t border-slate-100 pt-2">
                                            <TkaStartExamButton
                                                level={level}
                                                examSlug={exam.slug}
                                                disabledReason={exam.disabledReason}
                                                activeAttemptId={exam.activeAttemptId}
                                            />
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            title="Mini Tryout belum tersedia"
                            description="Paket Mini Tryout sedang disiapkan untuk jenjang ini."
                        />
                    )}
                </section>

                {/* Sleek Banner Bridge to Full Tryout */}
                <section className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 p-5 shadow-xs transition hover:border-indigo-200 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                            <Sparkles size={18} className="text-amber-300" />
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Siap untuk Simulasi Penuh 60 Soal (150 Menit)?</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Uji ketahanan dan ritme ujian sesungguhnya melalui Full Tryout terpadu (Bahasa Indonesia &amp; Matematika sekaligus).</p>
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
