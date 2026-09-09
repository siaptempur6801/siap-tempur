import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    BookOpenCheck,
    BrainCircuit,
    Calculator,
    CheckCircle2,
    Clock3,
    Dumbbell,
    GraduationCap,
    ListChecks,
    LockKeyhole,
    RotateCcw,
    School,
    Sparkles,
    Timer,
} from 'lucide-react'
import { activateTkaTrackAction } from '@/app/actions/user-track'
import TkaLearningHierarchy from '@/components/tka/TkaLearningHierarchy'
import TkaNextStep from '@/components/tka/TkaNextStep'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { parseTkaLevel, tkaContext, tkaLevelPath, type TkaLevel } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEVEL_LABEL: Record<TkaLevel, string> = {
    SD: 'Sekolah Dasar',
    SMP: 'Sekolah Menengah Pertama',
    SMA: 'Sekolah Menengah Atas',
}

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

export default async function TkaLevelPage({
    params,
    searchParams,
}: {
    params: Promise<{ level: string }>
    searchParams: Promise<{ activated?: string; error?: string }>
}) {
    const { level: levelParam } = await params
    const query = await searchParams
    const level = parseTkaLevel(levelParam)
    if (!level) notFound()

    if (level !== 'SMP') {
        return <TkaComingSoonPage level={level} />
    }

    const path = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`)

    const context = tkaContext(level)
    const stagingEnvironment = env.appEnvironment() !== 'production'
    const stagingSmpPilot = stagingEnvironment && level === 'SMP'

    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id, code, name')
        .eq('code', context.programCode)
        .maybeSingle()
    if (programError) throw programError
    if (!program) notFound()

    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('id, code, name')
        .eq('program_id', program.id)
        .eq('code', context.trackCode)
        .maybeSingle()
    if (trackError) throw trackError
    if (!track) notFound()

    const [{ data: subjectRows, error: subjectError }, { data: userTrack, error: userTrackError }] = await Promise.all([
        supabase
            .from('subjects')
            .select('id, code, name, subject_type')
            .eq('track_id', track.id)
            .order('sort_order', { ascending: true }),
        supabase
            .from('user_tracks')
            .select('status')
            .eq('user_id', user.id)
            .eq('track_id', track.id)
            .maybeSingle(),
    ])
    if (subjectError) throw subjectError
    if (userTrackError) throw userTrackError

    const catalog = {
        program: { id: String(program.id), code: String(program.code), name: String(program.name) },
        track: { id: String(track.id), code: String(track.code), name: String(track.name) },
        subjects: (subjectRows ?? []).map((subject) => ({
            id: String(subject.id),
            code: String(subject.code),
            name: String(subject.name),
            subjectType: String(subject.subject_type ?? 'mandatory'),
        })),
    }

    const questionStatuses = stagingSmpPilot ? ['approved', 'published'] : ['published']
    const [{ data: exams, error: examError }, { data: examTypes, error: typeError }, { data: questionRows, error: questionError }] = await Promise.all([
        supabase
            .from('exams')
            .select('id, exam_type_id, title, slug, duration_seconds, attempt_limit, access_type, required_feature_id, status, token_cost, starts_at, ends_at')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED'])
            .order('created_at', { ascending: true }),
        supabase.from('exam_types').select('id, code, name'),
        supabase
            .from('questions')
            .select('subject_id')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('status', questionStatuses)
            .limit(5000),
    ])
    if (examError) throw examError
    if (typeError) throw typeError
    if (questionError) throw questionError

    const examIds = (exams ?? []).map((exam) => String(exam.id))
    const featureIds = Array.from(new Set((exams ?? [])
        .map((exam) => exam.required_feature_id ? String(exam.required_feature_id) : '')
        .filter(Boolean)))

    const [{ data: entitlementRows, error: entitlementError }, { data: attemptRows, error: attemptError }] = await Promise.all([
        featureIds.length > 0
            ? supabase
                .from('entitlements')
                .select('feature_id, starts_at, expires_at, usage_limit, usage_count, status')
                .eq('user_id', user.id)
                .in('feature_id', featureIds)
                .in('status', ['active', 'ACTIVE'])
            : Promise.resolve({ data: [], error: null }),
        examIds.length > 0
            ? supabase
                .from('exam_attempts')
                .select('id, exam_id, attempt_number, status, started_at, submitted_at, total_score, percentage, updated_at')
                .eq('user_id', user.id)
                .in('exam_id', examIds)
                .order('updated_at', { ascending: false })
                .limit(20)
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

    const examTypeById = new Map((examTypes ?? []).map((row) => [String(row.id), row]))
    const examById = new Map((exams ?? []).map((exam) => [String(exam.id), exam]))
    const questionCountBySubject = new Map<string, number>()
    for (const row of questionRows ?? []) {
        const id = String(row.subject_id)
        questionCountBySubject.set(id, (questionCountBySubject.get(id) ?? 0) + 1)
    }

    const totalQuestions = (questionRows ?? []).length
    const studentName = user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : null) ||
        'Pejuang TKA'

    const activeTrack = userTrack?.status.toLowerCase() === 'active'
    const learnerAttempts = (attemptRows ?? []).filter((attempt) => {
        const exam = examById.get(String(attempt.exam_id))
        const typeCode = String(examTypeById.get(String(exam?.exam_type_id ?? ''))?.code ?? '').toUpperCase()
        return typeCode !== 'DIAGNOSTIC'
    })
    const recentAttempts = learnerAttempts.slice(0, 6)
    const activeAttempt = learnerAttempts.find((attempt) => String(attempt.status ?? '').toLowerCase() === 'in_progress') ?? null
    const activeExam = activeAttempt ? examById.get(String(activeAttempt.exam_id)) : null
    const activeExamType = activeExam ? examTypeById.get(String(activeExam.exam_type_id)) : null
    const activeTypeCode = String(activeExamType?.code ?? '').toUpperCase()
    const activeSlug = String(activeExam?.slug ?? '').toLowerCase()
    const activePracticeLabel = activeTypeCode.includes('DRILL') || activeSlug.includes('drill')
        ? 'Latihan Fokus'
        : activeSlug.includes('mini')
            ? 'Mini Tryout'
            : 'Full Tryout'
    const latestCompletedAttempt = recentAttempts.find((attempt) => ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase())) ?? null
    const latestCompletedExam = latestCompletedAttempt ? examById.get(String(latestCompletedAttempt.exam_id)) : null
    const hasTempurPass = entitledFeatures.size > 0
    const diagnosticExam = (exams ?? []).find((exam) => String(exam.slug).toLowerCase() === 'tka-smp-diagnostic-awal')
    const diagnosticAttempts = diagnosticExam
        ? (attemptRows ?? []).filter((attempt) => String(attempt.exam_id) === String(diagnosticExam.id))
        : []
    const diagnosticInProgress = diagnosticAttempts.find((attempt) => String(attempt.status ?? '').toLowerCase() === 'in_progress') ?? null
    const hasCompletedDiagnostic = diagnosticAttempts.some((attempt) => ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase()))

    const tryoutExams = (exams ?? []).filter((exam) => {
        const typeCode = String(examTypeById.get(String(exam.exam_type_id))?.code ?? '').toUpperCase()
        const slug = String(exam.slug ?? '').toLowerCase()
        return typeCode.includes('TRYOUT') || slug.includes('-mini-') || slug.endsWith('-full')
    })

    const activeAttemptByExam = new Map<string, string>()
    for (const attempt of learnerAttempts) {
        if (String(attempt.status ?? '').toLowerCase() !== 'in_progress') continue
        const examId = String(attempt.exam_id)
        if (!activeAttemptByExam.has(examId)) activeAttemptByExam.set(examId, String(attempt.id))
    }

    const attemptCountByExam = new Map<string, number>()
    for (const row of attemptRows ?? []) {
        const id = String(row.exam_id)
        attemptCountByExam.set(id, (attemptCountByExam.get(id) ?? 0) + 1)
    }

    const tryoutOptions: TryoutOption[] = tryoutExams.map((exam) => {
        const type = examTypeById.get(String(exam.exam_type_id))
        const typeCode = String(type?.code ?? '').toUpperCase()
        const slug = String(exam.slug)
        const full = slug.toLowerCase().includes('full') || typeCode.includes('FULL')
        const featureId = exam.required_feature_id ? String(exam.required_feature_id) : null
        const hasEntitlement = featureId ? entitledFeatures.has(featureId) : false
        const usedAttempts = attemptCountByExam.get(String(exam.id)) ?? 0
        const access = String(exam.access_type ?? 'FREE').toUpperCase()
        const freeLimit = Number(exam.attempt_limit ?? 1)
        const stagingFullExam = stagingSmpPilot && slug === 'tka-smp-full'
        const stagingMiniExam = stagingSmpPilot && slug.startsWith('tka-smp-mini-')
        const freemiumLocked = access === 'FREEMIUM' && !hasEntitlement && usedAttempts >= freeLimit
        const premiumLocked = !stagingFullExam && access === 'PREMIUM' && !hasEntitlement
        const accessReason = premiumLocked
            ? 'Butuh Tempur Pass'
            : freemiumLocked
                ? 'Kuota gratis habis · Butuh Tempur Pass'
                : null
        const accessLabel = stagingFullExam
            ? 'Akses uji coba'
            : hasEntitlement
                ? 'Tempur Pass aktif'
                : access === 'FREEMIUM'
                    ? `Gratis ${Math.max(0, freeLimit - usedAttempts)}x tersisa`
                    : access === 'PREMIUM'
                        ? 'Premium · Tempur Pass'
                        : 'Gratis'
        const details = stagingFullExam
            ? ['60 soal · 30 + 30', '75 menit per bagian']
            : stagingMiniExam
                ? ['15 soal · 1 mapel']
                : []

        return {
            id: String(exam.id),
            title: String(exam.title),
            slug,
            typeLabel: String(type?.name || type?.code || (full ? 'Full Tryout' : 'Mini Tryout')),
            duration: minutes(exam.duration_seconds),
            details,
            accessLabel,
            accessTone: hasEntitlement ? 'success' : accessReason ? 'warning' : 'default',
            disabledReason: !activeTrack ? 'Aktifkan jalur belajar terlebih dahulu' : examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at }) || accessReason,
            activeAttemptId: activeAttemptByExam.get(String(exam.id)) ?? null,
            full,
        }
    })

    const recommendation = !activeTrack
        ? {
            href: path,
            title: `Aktifkan Jalur TKA ${level} terlebih dahulu`,
            description: 'Aktifkan jalur belajar agar hasil diagnostik, latihan, dan riwayat tryout tersimpan di akunmu.',
            action: 'Aktifkan Jalur',
        }
        : activeAttempt
        ? {
            href: `${path}/tryout/${activeAttempt.id}`,
            title: `Lanjutkan ${activePracticeLabel} yang belum selesai`,
            description: `${activePracticeLabel} kamu masih berjalan. Lanjutkan dari soal terakhir agar progres tetap tersimpan rapi.`,
            action: 'Lanjutkan Sekarang',
        }
        : diagnosticInProgress
            ? {
                href: `${path}/diagnostic/${diagnosticInProgress.id}`,
                title: 'Lanjutkan Tes Diagnostik',
                description: 'Tes diagnostikmu belum selesai. Lanjutkan untuk mendapatkan peta kemampuan dan rekomendasi belajar.',
                action: 'Lanjutkan Diagnostik',
            }
            : !hasCompletedDiagnostic
                ? {
                    href: `${path}/diagnostic`,
                    title: 'Mulai dari Tes Diagnostik',
                    description: 'Petakan kemampuan awalmu lebih dulu agar latihan berikutnya langsung fokus pada topik yang paling perlu diperkuat.',
                    action: 'Mulai Diagnostik',
                }
                : latestCompletedAttempt
            ? {
                href: `${path}/wrong-questions`,
                title: 'Perbaiki soal yang masih lemah',
                description: 'Gunakan hasil tryout terakhir untuk mengulang soal yang belum dikuasai sebelum mencoba sesi berikutnya.',
                action: 'Mulai Perbaikan',
            }
            : {
                href: `${path}/focus`,
                title: 'Mulai Latihan Fokus',
                description: 'Gunakan rekomendasi diagnostik untuk memperkuat topik pertama sebelum masuk ke Mini Tryout.',
                action: 'Mulai Latihan',
            }

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div data-testid="tka-level-ready" className="mx-auto max-w-6xl space-y-8 md:space-y-10">
                {/* Welcoming Learner Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black tracking-wide text-indigo-700 ring-1 ring-indigo-200/50">
                            <Sparkles size={13} className="text-indigo-600" />
                            <span>TKA · {level}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-indigo-900 font-bold">{LEVEL_LABEL[level]}</span>
                        </div>
                        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                            Halo, {studentName}! Semangat belajar hari ini 🎯
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                            Latihan terarah, simulasi tryout berkala, evaluasi hasil, dan bank remedial dalam satu ruang belajar.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-2xs">
                            <BookOpenCheck size={14} className="text-indigo-600" />
                            <span className="text-slate-500 font-semibold">Bank Soal:</span>
                            <span className="font-bold text-slate-900">{totalQuestions} soal</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-2xs">
                            <CheckCircle2 size={14} className={activeTrack ? "text-emerald-600" : "text-amber-500"} />
                            <span className="text-slate-500 font-semibold">Jalur:</span>
                            <span className="font-bold text-slate-900">{activeTrack ? "Aktif" : "Belum Aktif"}</span>
                        </div>
                    </div>
                </header>

                {query.activated === '1' && (
                    <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        <span>Jalur belajar TKA {level} berhasil diaktifkan di akunmu. Selamat belajar!</span>
                    </div>
                )}
                {query.error && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 shadow-sm">
                        {query.error}
                    </div>
                )}

                {/* Hero Step & Access Status */}
                <section className="grid gap-5 lg:grid-cols-[1.65fr_0.85fr]" aria-label="Langkah berikutnya TKA">
                    <TkaNextStep recommendation={recommendation} />

                    <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Status Akses</span>
                                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${activeTrack ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
                                    {activeTrack ? <><CheckCircle2 size={13} /> Jalur Aktif</> : <><LockKeyhole size={13} /> Belum Aktif</>}
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="text-2xl font-black tracking-tight text-slate-950">
                                    {hasTempurPass ? 'Tempur Pass' : activeTrack ? 'Jalur Terhubung' : 'Belum Aktif'}
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                    {hasTempurPass
                                        ? 'Akses tak terbatas untuk semua Full Tryout, diagnostik kemampuan, dan latihan remedial.'
                                        : activeTrack
                                            ? 'Jalur belajar SMP aktif. Nilai dan progres latihanmu otomatis tersimpan di profil.'
                                            : 'Aktifkan jalur belajar di bawah agar riwayat tryout dan statistik belajar tersimpan.'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 border-t border-slate-100 pt-4">
                            <Link href={`${path}/pass`} className="st-focus inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline">
                                <span>{hasTempurPass ? 'Detail Tempur Pass' : 'Lihat Akses & Tempur Pass'}</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </article>
                </section>

                {/* Form Aktivasi Jalur (jika belum aktif) */}
                {!activeTrack && (
                    <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-6 shadow-sm">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                                <Sparkles size={13} /> Aktivasi Jalur
                            </div>
                            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Aktifkan Jalur TKA {level}</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                Aktifkan jalur ini agar hasil latihan, tryout, dan riwayat remedial tersimpan di akunmu. Data sekolah bersifat opsional.
                            </p>
                        </div>
                        <form action={activateTkaTrackAction} className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                            <input type="hidden" name="level" value={level} />
                            <Field label="Nama Sekolah"><input name="school_name" className="st-input rounded-xl" placeholder="Opsional" /></Field>
                            <Field label="Kelas"><input name="school_grade" className="st-input rounded-xl" placeholder="Contoh: 9" /></Field>
                            <Field label="Tahun Target"><input name="target_year" type="number" min="2025" max="2100" className="st-input rounded-xl" placeholder="2026" /></Field>
                            <Button type="submit" className="self-end rounded-xl font-bold">Aktifkan Jalur Belajar</Button>
                        </form>
                    </section>
                )}

                {/* Learning Hub: 4 Core Learning Modes */}
                <section aria-labelledby="tka-learning-hub" className="space-y-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Mode Belajar</p>
                        <h2 id="tka-learning-hub" className="mt-1 text-xl font-bold text-slate-950">Pusat Belajar TKA {level}</h2>
                        <p className="mt-1 text-sm text-slate-500">Pilih mode belajar sesuai dengan target dan waktu belajarmu hari ini.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <LearningModeCard
                            href={`${path}/focus`}
                            icon={<Dumbbell size={20} className="text-indigo-600" />}
                            iconBg="bg-indigo-50"
                            title="Latihan Fokus"
                            description="Berlatih per bab & kisi-kisi topik dengan umpan balik langsung."
                            action="Mulai Latihan"
                        />
                        <LearningModeCard
                            href={`${path}/mini-tryout`}
                            icon={<Timer size={20} className="text-violet-600" />}
                            iconBg="bg-violet-50"
                            title="Mini Tryout"
                            description="15 butir soal per mata pelajaran untuk evaluasi cepat."
                            action="Pilih Mini Tryout"
                        />
                        <LearningModeCard
                            href={`${path}/tryout`}
                            icon={<ListChecks size={20} className="text-blue-600" />}
                            iconBg="bg-blue-50"
                            title="Tryout & Simulasi"
                            description="Simulasi lengkap 60 soal bertempo standar ujian."
                            action="Buka Tryout"
                        />
                        <LearningModeCard
                            href={`${path}/diagnostic`}
                            icon={<BrainCircuit size={20} className="text-amber-600" />}
                            iconBg="bg-amber-50"
                            title="Tes Diagnostik"
                            description="Petakan kekuatan awal dan identifikasi topik yang perlu diperkuat."
                            action="Tes Diagnostik"
                        />
                        <LearningModeCard
                            href={`${path}/wrong-questions`}
                            icon={<RotateCcw size={20} className="text-rose-600" />}
                            iconBg="bg-rose-50"
                            title="Bank Soal Salah"
                            description="Ulangi soal yang belum tepat hingga benar-benar paham."
                            action="Perbaiki Soal"
                        />
                    </div>
                </section>

                <TkaLearningHierarchy activeTrack={activeTrack} />

                {/* Exam Cards for Quick Tryout Start */}
                {tryoutOptions.length > 0 && (
                    <section aria-labelledby="tka-tryout-section" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Simulasi & Ujian</p>
                                <h2 id="tka-tryout-section" className="mt-1 text-xl font-bold text-slate-950">Paket Tryout TKA {level}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link href={`${path}/mini-tryout`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                    Halaman Mini Tryout →
                                </Link>
                                <Link href={`${path}/tryout`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                    Halaman Full Tryout →
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            {tryoutOptions.map((exam) => (
                                <article key={exam.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{exam.typeLabel}</p>
                                                <h3 className="mt-2 text-xl font-bold text-slate-950">{exam.title}</h3>
                                            </div>
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                                {exam.full ? <ListChecks size={20} /> : <Timer size={20} />}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {exam.duration && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"><Clock3 size={13} />{exam.duration} menit</span>}
                                            {exam.details.map((detail) => <span key={detail} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{detail}</span>)}
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                exam.accessTone === 'success'
                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                                                    : exam.accessTone === 'warning'
                                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {exam.accessLabel}
                                            </span>
                                        </div>
                                    </div>
                            <TkaStartExamButton
                                level={level}
                                examSlug={exam.slug}
                                disabledReason={exam.disabledReason}
                                activeAttemptId={exam.activeAttemptId}
                            />
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {/* Summary & Subjects */}
                <section aria-labelledby="tka-learning-summary" className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Perkembangan & Mata Pelajaran</p>
                            <h2 id="tka-learning-summary" className="mt-1 text-xl font-bold text-slate-950">Ringkasan Capaian Terkini</h2>
                        </div>
                        {activeTrack && (
                            <Link href={`${path}/progress`} className="st-focus inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                <span>Lihat Analisis Lengkap</span> <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>

                    {latestCompletedAttempt ? (
                        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.65fr]">
                            {/* Latest Attempt Spotlight */}
                            <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-md">
                                <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" aria-hidden="true" />
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-indigo-200 backdrop-blur-sm">
                                            <Clock3 size={13} /> Tryout Terakhir
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {formatAttemptDate(latestCompletedAttempt.submitted_at || latestCompletedAttempt.updated_at)}
                                        </span>
                                    </div>

                                    <div className="mt-5 flex items-baseline gap-2">
                                        <span className="text-5xl font-black tracking-tight text-white">
                                            {latestCompletedAttempt.percentage !== null
                                                ? `${Number(latestCompletedAttempt.percentage).toFixed(0)}%`
                                                : Number(latestCompletedAttempt.total_score ?? 0).toFixed(0)}
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Skor Capaian</span>
                                    </div>

                                    <h3 className="mt-3 text-base font-bold text-slate-200 line-clamp-1">
                                        {latestCompletedExam?.title ?? 'Hasil TKA Terbaru'}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Pengerjaan #{latestCompletedAttempt.attempt_number} · Nilai tersimpan
                                    </p>
                                </div>

                                <div className="mt-6 pt-2">
                                    <Link
                                        href={`${path}/tryout/${latestCompletedAttempt.id}/result`}
                                        className="st-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-[0.98]"
                                    >
                                        <span>Buka Hasil & Pembahasan</span>
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </article>

                            {/* Subject Exploration Cards */}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {catalog.subjects.map((subject) => {
                                    const enrichment = subject.subjectType.toLowerCase() === 'enrichment'
                                    const count = questionCountBySubject.get(subject.id) ?? 0
                                    const isMath = subject.code.toLowerCase().includes('mat') || subject.name.toLowerCase().includes('matematika')
                                    const isIndo = subject.code.toLowerCase().includes('ind') || subject.name.toLowerCase().includes('indonesia')

                                    return (
                                        <article key={subject.id} className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                                                        enrichment
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : isMath
                                                                ? 'bg-violet-50 text-violet-700'
                                                                : 'bg-indigo-50 text-indigo-700'
                                                    }`}>
                                                        {isMath ? <Calculator size={19} /> : isIndo ? <BookOpen size={19} /> : <School size={19} />}
                                                    </div>
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide ${
                                                        enrichment ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50'
                                                    }`}>
                                                        {enrichment ? 'Pengayaan' : 'Wajib TKA'}
                                                    </span>
                                                </div>

                                                <div className="mt-4">
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{subject.code}</span>
                                                    <h3 className="mt-1 text-base font-bold text-slate-950 group-hover:text-indigo-600 transition-colors">{subject.name}</h3>
                                                </div>

                                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                                    {count} butir soal tersedia
                                                </p>
                                            </div>

                                            <div className="mt-5 border-t border-slate-100 pt-3">
                                                <Link
                                                    href={`${path}/focus`}
                                                    className="st-focus inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                                >
                                                    <span>Latihan materi ini</span>
                                                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                                                </Link>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <article className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm md:p-12">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                                <BarChart3 size={26} />
                            </div>
                            <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">Belum Ada Hasil yang Dicatat</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                                Kerjakan Mini Tryout atau Full Tryout pertamamu. Setelah itu, ringkasan capaian dan analisis penguasaan materi akan tampil di sini.
                            </p>
                            <Link href={`${path}/tryout`} className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98]">
                                <span>Mulai Mini Tryout Pertama</span> <ArrowRight size={16} />
                            </Link>
                        </article>
                    )}
                </section>

                {/* Recent Learning Activity Timeline */}
                {recentAttempts.length > 0 && (
                    <section aria-labelledby="recent-activity-title" className="space-y-3 pt-2">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Aktivitas</p>
                                <h2 id="recent-activity-title" className="mt-1 text-xl font-bold text-slate-950">
                                    Riwayat Sesi Terakhir
                                </h2>
                            </div>
                            <Link href={`${path}/progress`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                Semua Riwayat →
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                            {recentAttempts.slice(0, 4).map((attempt) => {
                                const exam = examById.get(String(attempt.exam_id))
                                if (!exam) return null
                                const completed = ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase())
                                const inProgress = String(attempt.status ?? '').toLowerCase() === 'in_progress'
                                const href = inProgress ? `${path}/tryout/${attempt.id}` : `${path}/tryout/${attempt.id}/result`

                                return (
                                    <div key={attempt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/80">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-bold text-slate-900">{exam.title}</p>
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${
                                                    completed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                                                }`}>
                                                    {completed ? 'Selesai' : 'Sedang Berjalan'}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Pengerjaan #{attempt.attempt_number} · {formatAttemptDate(attempt.updated_at || attempt.submitted_at || attempt.started_at)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {completed && attempt.percentage !== null && (
                                                <span className="text-sm font-black tabular-nums text-slate-900">
                                                    {Number(attempt.percentage).toFixed(0)}%
                                                </span>
                                            )}
                                            <Link
                                                href={href}
                                                className="st-focus inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                            >
                                                <span>{inProgress ? 'Lanjutkan' : 'Buka Pembahasan'}</span>
                                                <ArrowRight size={13} />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

            </div>
        </main>
    )
}

function LearningModeCard({
    href,
    icon,
    iconBg,
    title,
    description,
    action,
}: {
    href: string
    icon: React.ReactNode
    iconBg: string
    title: string
    description: string
    action: string
}) {
    return (
        <Link
            href={href}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
            <div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} transition-transform group-hover:scale-105`}>
                    {icon}
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-950 group-hover:text-indigo-600 transition-colors">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-3">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                    <span>{action}</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>
            </div>
        </Link>
    )
}

function TkaComingSoonPage({ level }: { level: Exclude<TkaLevel, 'SMP'> }) {
    const isSd = level === 'SD'
    const Icon = isSd ? School : GraduationCap
    const tone = isSd ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'

    return (
        <main data-experience-mode="marketing" data-program={`tka-${level.toLowerCase()}`} className="st-product min-h-screen px-4 py-8 md:px-8 md:py-14">
            <div className="mx-auto max-w-4xl">
                <section className="st-card-lg relative overflow-hidden p-7 md:p-12">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-50" aria-hidden="true" />
                    <div className={`relative flex h-14 w-14 items-center justify-center rounded-lg ${tone}`}><Icon size={27} /></div>
                    <p className="relative mt-7 text-xs font-black uppercase tracking-[0.16em] text-blue-700">TKA {level}</p>
                    <h1 className="relative mt-2 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Pengalaman belajar TKA {level} sedang kami siapkan.</h1>
                    <p className="relative mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-slate-500">
                        Saat tersedia nanti, jalur ini akan mengikuti pola SiapTempur yang sama: latihan, tryout, pembahasan, perkembangan belajar, dan rekomendasi langkah berikutnya.
                    </p>
                    <div className="relative mt-8 flex flex-wrap gap-3">
                        <Button asChild><Link href="/tka">Kembali ke TKA</Link></Button>
                        <Button variant="outline" asChild><Link href="/cpns">Lihat persiapan CPNS</Link></Button>
                    </div>
                </section>
            </div>
        </main>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="space-y-1.5"><span className="block text-xs font-black text-slate-700">{label}</span>{children}</label>
}
