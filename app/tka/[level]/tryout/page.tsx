import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowRight,
    BookOpenCheck,
    CheckCircle2,
    Clock3,
    Layers,
    ListChecks,
    Sparkles,
    Trophy,
} from 'lucide-react'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getAuthenticatedTkaCatalogContext, getTkaAttemptSummaries } from '@/src/repositories/tka-catalog-read.repository'
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
    drill: boolean
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

export default async function TkaTryoutPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || !isTkaLevelAvailable(level)) notFound()

    const base = tkaLevelPath(level)
    const pagePath = `${base}/tryout`
    const supabase = await createV2Client()

    const context = tkaContext(level)
    const { user, catalogContext } = await getAuthenticatedTkaCatalogContext(context.programCode, context.trackCode)
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`)
    if (!catalogContext) notFound()
    const program = { id: catalogContext.programId }
    const track = { id: catalogContext.trackId }

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
    const catalogExams = (exams ?? []).filter((exam) => {
        const typeCode = String(examTypeById.get(String(exam.exam_type_id))?.code ?? '').toUpperCase()
        const slug = String(exam.slug ?? '').toLowerCase()
        return typeCode.includes('TRYOUT') || (level === 'SMP' && typeCode.includes('DRILL')) || slug.includes('-mini-') || slug.endsWith('-full')
    })
    const examIds = catalogExams.map((exam) => String(exam.id))
    const featureIds = Array.from(new Set(catalogExams
        .map((exam) => exam.required_feature_id ? String(exam.required_feature_id) : '')
        .filter(Boolean)))

    const [{ data: entitlementRows, error: entitlementError }, attemptSummaries] = await Promise.all([
        featureIds.length > 0
            ? supabase
                .from('entitlements')
                .select('feature_id, starts_at, expires_at, usage_limit, usage_count')
                .eq('user_id', user.id)
                .in('feature_id', featureIds)
                .in('status', ['active', 'ACTIVE'])
            : Promise.resolve({ data: [], error: null }),
        getTkaAttemptSummaries(supabase, examIds, true),
    ])
    if (entitlementError) throw entitlementError

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

    const attemptCountByExam = new Map(attemptSummaries.map((row) => [row.exam_id, row.attempt_count]))
    const activeAttemptByExam = new Map(attemptSummaries.flatMap((row) =>
        row.active_attempt_id ? [[row.exam_id, row.active_attempt_id] as const] : []))
    const activeTrack = userTrack?.status.toLowerCase() === 'active'
    const catalogOptions: TryoutOption[] = catalogExams.map((exam) => {
        const type = examTypeById.get(String(exam.exam_type_id))
        const typeCode = String(type?.code ?? '').toUpperCase()
        const slug = String(exam.slug)
        const full = slug.toLowerCase().includes('full') || typeCode.includes('FULL')
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
                ? 'Kuota gratis habis - Butuh Tempur Pass'
                : null
        const accessLabel = hasEntitlement
            ? 'Tempur Pass aktif'
            : access === 'FREEMIUM'
                ? `Gratis ${Math.max(0, freeLimit - usedAttempts)}x tersisa`
                : access === 'PREMIUM'
                    ? 'Premium - Tempur Pass'
                    : 'Gratis'
        const drill = typeCode.includes('DRILL')
        const details = full
            ? ['60 soal - 30 + 30', '75 menit per bagian']
            : drill ? ['Latihan materi terarah'] : ['15 soal - 1 mapel']

        return {
            id: String(exam.id),
            title: String(exam.title),
            slug,
            typeLabel: String(type?.name || type?.code || (drill ? 'Drill' : full ? 'Full Tryout' : 'Mini Tryout')),
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
            full,
            drill,
        }
    })
    const tryoutOptions = catalogOptions.filter((exam) => !exam.drill)
    const drillOptions = catalogOptions.filter((exam) => exam.drill)
    const fullTryouts = tryoutOptions.filter((exam) => exam.full)
    const featuredTryout = fullTryouts[0] ?? null
    const additionalFullTryouts = fullTryouts.slice(1)

    return (
        <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                {/* Header - 100% consistent with all TKA pages */}
                <header className="border-b border-slate-200/80 pb-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black tracking-wide text-indigo-700 ring-1 ring-indigo-200/50">
                        <ListChecks size={14} className="text-indigo-600" />
                        <span>Simulasi &amp; Tryout · TKA {level}</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                        Tryout &amp; Simulasi Ujian
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Simulasi komprehensif berstandar CAT resmi (60 butir soal · 150 menit) untuk mengukur kesiapan mental dan penguasaan seluruh materi TKA {level}.
                    </p>
                </header>

                {!activeTrack && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
                        <p className="font-bold">Jalur TKA {level} belum aktif.</p>
                        <p className="mt-1">Aktifkan jalur dari dashboard sebelum memulai tryout agar riwayat dan analisis tersimpan.</p>
                        <Link href={base} className="st-focus mt-3 inline-flex min-h-10 items-center gap-2 font-bold text-amber-950 hover:underline">
                            Aktifkan di dashboard <ArrowRight size={15} />
                        </Link>
                    </div>
                )}

                {/* Dominant Featured Tryout - Single Screen Split Card */}
                {featuredTryout ? (
                    <article className="relative overflow-hidden rounded-3xl border-2 border-indigo-200/90 bg-white p-5 shadow-lg shadow-blue-950/5 ring-1 ring-indigo-500/10 transition-all hover:border-indigo-300 sm:p-7">
                        {/* Ambient decorative background glow */}
                        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-200/40 via-blue-100/20 to-transparent blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-100/30 via-indigo-50/20 to-transparent blur-2xl" />

                        <div className="relative z-10 grid gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">
                            {/* Left Column (Main Focus, Structure & Action Button) */}
                            <div className="flex flex-col justify-between space-y-4 lg:col-span-7">
                                <div className="space-y-3">
                                    {/* Badges row */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                                            <Sparkles size={12} className="text-amber-300" />
                                            <span>Simulasi Utama Resmi</span>
                                        </span>
                                        <MetaChip text={featuredTryout.accessLabel} tone={featuredTryout.accessTone} />
                                        {featuredTryout.activeAttemptId && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-500/30">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                Sesi Berjalan
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Description */}
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">{featuredTryout.typeLabel}</p>
                                        <h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                                            {featuredTryout.title}
                                        </h2>
                                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                                            Satu-satunya simulasi penuh berstandar resmi TKA {level}. Menguji ketahanan mental, alokasi waktu 150 menit, dan pemahaman materi secara utuh tanpa jeda.
                                        </p>
                                    </div>

                                    {/* 2-Part Compact Cards */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-indigo-700">Bagian 1</span>
                                                <span className="font-medium text-slate-500">75 Menit</span>
                                            </div>
                                            <p className="mt-1 text-sm font-bold text-slate-900">Bahasa Indonesia</p>
                                            <p className="text-[11px] text-slate-500">30 butir · Wacana &amp; Penalaran</p>
                                        </div>

                                        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-blue-700">Bagian 2</span>
                                                <span className="font-medium text-slate-500">75 Menit</span>
                                            </div>
                                            <p className="mt-1 text-sm font-bold text-slate-900">Matematika</p>
                                            <p className="text-[11px] text-slate-500">30 butir · Bilangan &amp; Geometri</p>
                                        </div>
                                    </div>

                                    {/* Value highlights */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                                        <span className="inline-flex items-center gap-1">
                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                            Simpan Otomatis
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                            Kunci &amp; Pembahasan Lengkap
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                            Rapor &amp; Remedial Pintar
                                        </span>
                                    </div>
                                </div>

                                {/* Prominent Action Container */}
                                <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 text-white shadow-md sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-white sm:text-base">
                                                {featuredTryout.activeAttemptId ? 'Lanjutkan Sesi Ujianmu' : 'Siap Mulai Simulasi Sekarang?'}
                                            </h3>
                                            <p className="text-xs text-slate-300">
                                                {featuredTryout.activeAttemptId
                                                    ? 'Kamu memiliki sesi yang sedang berjalan. Lanjutkan pengerjaan sekarang.'
                                                    : 'Pastikan waktu luang 150 menit tanpa gangguan dan koneksi internet stabil.'}
                                            </p>
                                        </div>
                                        <div className="w-full shrink-0 sm:w-56 [&>div]:mt-0">
                                            <TkaStartExamButton
                                                level={level}
                                                examSlug={featuredTryout.slug}
                                                disabledReason={featuredTryout.disabledReason}
                                                activeAttemptId={featuredTryout.activeAttemptId}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column (Specifications & Parameter Panel) */}
                            <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 lg:col-span-5">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Parameter Ujian</p>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                                            <Trophy size={12} className="text-amber-500" />
                                            Standar CAT
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm font-bold text-slate-900">Format Resmi TKA {level}</p>
                                </div>

                                {/* 4 Stat Tiles */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                                        <div className="flex items-center gap-1.5 text-indigo-600">
                                            <Clock3 size={15} />
                                            <span className="text-[11px] font-bold text-slate-500">Total Waktu</span>
                                        </div>
                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            {featuredTryout.duration || 150} <span className="text-xs font-medium text-slate-500">menit</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">2 sesi @ 75 menit</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                                        <div className="flex items-center gap-1.5 text-indigo-600">
                                            <BookOpenCheck size={15} />
                                            <span className="text-[11px] font-bold text-slate-500">Total Soal</span>
                                        </div>
                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            60 <span className="text-xs font-medium text-slate-500">butir</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">30 BI + 30 MTK</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                                        <div className="flex items-center gap-1.5 text-indigo-600">
                                            <Layers size={15} />
                                            <span className="text-[11px] font-bold text-slate-500">Sistem Sesi</span>
                                        </div>
                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            2 <span className="text-xs font-medium text-slate-500">bagian</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">Berurutan otomatis</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                                        <div className="flex items-center gap-1.5 text-indigo-600">
                                            <Trophy size={15} />
                                            <span className="text-[11px] font-bold text-slate-500">Output</span>
                                        </div>
                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            Rapor <span className="text-xs font-medium text-slate-500">&amp; Nilai</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">Analisis &amp; remedial</p>
                                    </div>
                                </div>

                                {/* Guidance & Mini Tryout Shortcut Box */}
                                <div className="rounded-xl border border-indigo-100 bg-white p-3.5 text-xs shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                            <Sparkles size={13} className="text-indigo-600" />
                                            <span>Latihan Kilat per Mapel?</span>
                                        </div>
                                        <Link
                                            href={`${base}/mini-tryout`}
                                            className="st-focus inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                                        >
                                            <span>Buka Mini Tryout</span>
                                            <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                        Tersedia paket Mini Tryout (15 butir soal · 25 menit) untuk mengasah topik tertentu sebelum memulai simulasi penuh.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </article>
                ) : (
                    <EmptyState
                        title="Full Tryout belum tersedia"
                        description={`Simulasi Full Tryout untuk jenjang TKA ${level} sedang disiapkan.`}
                    />
                )}

                {/* Future-proofing additional full tryouts */}
                {additionalFullTryouts.length > 0 && (
                    <section className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-slate-950">Simulasi Tryout Lainnya</h3>
                        <div className="grid gap-5 md:grid-cols-2">
                            {additionalFullTryouts.map((exam) => (
                                <article key={exam.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{exam.typeLabel}</p>
                                                <h4 className="mt-2 text-xl font-bold text-slate-950">{exam.title}</h4>
                                            </div>
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                                <BookOpenCheck size={20} />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {exam.duration && <MetaChip icon={<Clock3 size={13} />} text={`${exam.duration} menit`} />}
                                            {exam.details.map((detail) => <MetaChip key={detail} text={detail} />)}
                                            <MetaChip text={exam.accessLabel} tone={exam.accessTone} />
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <TkaStartExamButton
                                            level={level}
                                            examSlug={exam.slug}
                                            disabledReason={exam.disabledReason}
                                            activeAttemptId={exam.activeAttemptId}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {drillOptions.length > 0 && (
                    <section className="space-y-4 pt-4" aria-labelledby="tka-drill-catalog-title">
                        <div>
                            <h3 id="tka-drill-catalog-title" className="text-lg font-bold text-slate-950">Drill TKA {level}</h3>
                            <p className="mt-1 text-sm text-slate-600">Pilih latihan materi untuk mulai, menyimpan progres, dan melanjutkannya kapan saja.</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            {drillOptions.map((exam) => (
                                <article key={exam.id} data-testid="tka-catalog-drill" data-exam-id={exam.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{exam.typeLabel}</p>
                                        <h4 className="mt-2 text-xl font-bold text-slate-950">{exam.title}</h4>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {exam.duration && <MetaChip icon={<Clock3 size={13} />} text={`${exam.duration} menit`} />}
                                            {exam.details.map((detail) => <MetaChip key={detail} text={detail} />)}
                                            <MetaChip text={exam.accessLabel} tone={exam.accessTone} />
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <TkaStartExamButton
                                            level={level}
                                            examSlug={exam.slug}
                                            disabledReason={exam.disabledReason}
                                            activeAttemptId={exam.activeAttemptId}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
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
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>{icon}{text}</span>
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
