import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, LockKeyhole, School } from 'lucide-react'
import { activateTkaTrackAction } from '@/app/actions/user-track'
import TkaPassPackagesClient from '@/components/tka/TkaPassPackagesClient'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { catalogContextService } from '@/src/services/catalog-context.service'
import { commerceService } from '@/src/services/commerce.service'
import { userTrackService } from '@/src/services/user-track.service'
import { parseTkaLevel, tkaContext, tkaLevelPath, type TkaLevel } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEVEL_LABEL: Record<TkaLevel, string> = {
    SD: 'Sekolah Dasar',
    SMP: 'Sekolah Menengah Pertama',
    SMA: 'Sekolah Menengah Atas',
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

    const path = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`)

    const context = tkaContext(level)
    const [catalog, userTrack, rawPassOffers] = await Promise.all([
        catalogContextService.resolve(context),
        userTrackService.getForUser({ userId: user.id, context }),
        commerceService.listActiveProductOffers('TKA', level),
    ])
    const passOffers = rawPassOffers.filter((offer) => offer.code.startsWith(`TKA_${level}_PASS_`))

    const admin = await createV2AdminClient()
    const [{ data: exams, error: examError }, { data: examTypes, error: typeError }, { data: questionRows, error: questionError }] = await Promise.all([
        admin
            .from('exams')
            .select('id, exam_type_id, title, slug, duration_seconds, attempt_limit, access_type, required_feature_id, status, token_cost, starts_at, ends_at')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED'])
            .order('created_at', { ascending: true }),
        admin.from('exam_types').select('id, code, name'),
        admin
            .from('questions')
            .select('subject_id')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('status', ['published', 'PUBLISHED', 'active', 'ACTIVE'])
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
            ? admin
                .from('entitlements')
                .select('feature_id, starts_at, expires_at, usage_limit, usage_count, status')
                .eq('user_id', user.id)
                .in('feature_id', featureIds)
                .in('status', ['active', 'ACTIVE'])
            : Promise.resolve({ data: [], error: null }),
        examIds.length > 0
            ? admin
                .from('exam_attempts')
                .select('exam_id')
                .eq('user_id', user.id)
                .in('exam_id', examIds)
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
        const id = String(row.exam_id)
        attemptCountByExam.set(id, (attemptCountByExam.get(id) ?? 0) + 1)
    }

    const examTypeById = new Map((examTypes ?? []).map((row) => [String(row.id), row]))
    const questionCountBySubject = new Map<string, number>()
    for (const row of questionRows ?? []) {
        const id = String(row.subject_id)
        questionCountBySubject.set(id, (questionCountBySubject.get(id) ?? 0) + 1)
    }
    const activeTrack = userTrack?.status.toLowerCase() === 'active'

    return (
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-8 text-gray-900 md:px-8 md:py-12">
            <div className="mx-auto max-w-6xl space-y-8">
                <Link href="/tka" className="inline-flex items-center gap-2 font-black text-gray-700 hover:text-blue-700">
                    <ArrowLeft size={18} /> Semua jenjang TKA
                </Link>

                <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <span className="inline-flex border-2 border-gray-900 bg-cyan-100 px-3 py-1 text-xs font-black uppercase">
                                TKA / {level}
                            </span>
                            <h1 className="mt-3 font-handwriting text-4xl font-black md:text-5xl">TKA {LEVEL_LABEL[level]}</h1>
                            <p className="mt-2 max-w-2xl font-semibold text-gray-600">
                                {level === 'SMP'
                                    ? 'Blueprint TKA SMP 2026 memakai Matematika dan Bahasa Indonesia sebagai mata uji resmi. Bahasa Inggris dan IPA tetap tersedia sebagai pengayaan di SiapTempur.'
                                    : 'Track ini memakai catalog, bank soal, progress, attempt, dan entitlement yang terpisah dari CPNS/SKD.'}
                            </p>
                        </div>
                        <div className={`border-2 border-gray-900 px-4 py-3 font-black ${activeTrack ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}`}>
                            {activeTrack ? <span className="inline-flex items-center gap-2"><CheckCircle2 size={18}/> Track aktif</span> : <span className="inline-flex items-center gap-2"><LockKeyhole size={18}/> Belum diaktifkan</span>}
                        </div>
                    </div>
                </header>

                {query.activated === '1' && (
                    <div className="border-2 border-gray-900 bg-green-100 px-4 py-3 font-bold text-green-900 shadow-[3px_3px_0_0_#111]">
                        Jalur TKA {level} berhasil diaktifkan untuk akun ini.
                    </div>
                )}
                {query.error && (
                    <div className="border-2 border-gray-900 bg-red-100 px-4 py-3 font-bold text-red-800 shadow-[3px_3px_0_0_#111]">
                        {query.error}
                    </div>
                )}

                {!activeTrack && (
                    <section className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="text-xl font-black">Aktifkan jalur TKA {level}</h2>
                        <p className="mt-1 text-sm font-semibold text-gray-600">Aktivasi membuat progress jenjang ini disimpan di user_tracks. Data sekolah bersifat opsional.</p>
                        <form action={activateTkaTrackAction} className="mt-4 grid gap-3 md:grid-cols-4">
                            <input type="hidden" name="level" value={level} />
                            <label className="space-y-1">
                                <span className="block text-xs font-black uppercase text-gray-500">Nama sekolah</span>
                                <input name="school_name" className="w-full border-2 border-gray-900 bg-white px-3 py-2 font-semibold" placeholder="Opsional" />
                            </label>
                            <label className="space-y-1">
                                <span className="block text-xs font-black uppercase text-gray-500">Kelas</span>
                                <input name="school_grade" className="w-full border-2 border-gray-900 bg-white px-3 py-2 font-semibold" placeholder="Contoh: 9" />
                            </label>
                            <label className="space-y-1">
                                <span className="block text-xs font-black uppercase text-gray-500">Tahun target</span>
                                <input name="target_year" type="number" min="2025" max="2100" className="w-full border-2 border-gray-900 bg-white px-3 py-2 font-semibold" placeholder="2026" />
                            </label>
                            <button className="self-end border-2 border-gray-900 bg-gray-900 px-4 py-2 font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                                Aktifkan TKA {level}
                            </button>
                        </form>
                    </section>
                )}

                <section className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-black">Mapel</h2>
                        <p className="text-sm font-semibold text-gray-600">Bank soal dan progress dihitung per subject di track {level}.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {catalog.subjects.map((subject) => {
                            const enrichment = subject.subjectType.toLowerCase() === 'enrichment'
                            return (
                                <article key={subject.id} className={`border-2 border-gray-900 p-4 shadow-[3px_3px_0_0_#bbb] ${enrichment ? 'bg-amber-50' : 'bg-white'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-xs font-black uppercase text-blue-700">{subject.code}</div>
                                                <span className={`border border-gray-900 px-2 py-0.5 text-[10px] font-black uppercase ${enrichment ? 'bg-amber-200 text-amber-950' : 'bg-green-100 text-green-900'}`}>
                                                    {enrichment ? 'Pengayaan' : 'Wajib TKA'}
                                                </span>
                                            </div>
                                            <h3 className="mt-1 text-lg font-black">{subject.name}</h3>
                                        </div>
                                        <School size={20} />
                                    </div>
                                    <p className="mt-3 text-sm font-semibold text-gray-600">
                                        {questionCountBySubject.get(subject.id) ?? 0} soal published tersedia.
                                    </p>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-black">Tryout tersedia</h2>
                        <p className="text-sm font-semibold text-gray-600">Mini Tryout memiliki satu percobaan gratis per mapel. Setelah kuota gratis habis, Mini unlimited dan Full Tryout membutuhkan Tempur Pass aktif.</p>
                    </div>
                    {(exams ?? []).length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {(exams ?? []).map((exam) => {
                                const type = examTypeById.get(String(exam.exam_type_id))
                                const duration = minutes(exam.duration_seconds)
                                const windowReason = examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at })
                                const featureId = exam.required_feature_id ? String(exam.required_feature_id) : null
                                const hasEntitlement = featureId ? entitledFeatures.has(featureId) : false
                                const usedAttempts = attemptCountByExam.get(String(exam.id)) ?? 0
                                const access = String(exam.access_type ?? 'FREE').toUpperCase()
                                const freeLimit = Number(exam.attempt_limit ?? 1)
                                const freemiumLocked = access === 'FREEMIUM' && !hasEntitlement && usedAttempts >= freeLimit
                                const premiumLocked = access === 'PREMIUM' && !hasEntitlement
                                const accessLocked = freemiumLocked || premiumLocked
                                const accessReason = premiumLocked
                                    ? 'Butuh Tempur Pass'
                                    : freemiumLocked
                                        ? 'Kuota gratis habis · Butuh Tempur Pass'
                                        : null
                                const disabledReason = !activeTrack ? 'Aktifkan track terlebih dahulu' : windowReason || accessReason
                                const accessLabel = hasEntitlement
                                    ? 'Tempur Pass aktif'
                                    : access === 'FREEMIUM'
                                        ? `Gratis ${Math.max(0, freeLimit - usedAttempts)}x tersisa`
                                        : access === 'PREMIUM'
                                            ? 'Premium · Tempur Pass'
                                            : 'Gratis'

                                return (
                                    <article key={exam.id} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-black uppercase text-blue-700">{type?.name || type?.code || 'Exam'}</div>
                                                <h3 className="mt-1 text-xl font-black">{exam.title}</h3>
                                            </div>
                                            <BookOpenCheck />
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-gray-600">
                                            {duration && <span className="inline-flex items-center gap-1 border border-gray-300 bg-gray-50 px-2 py-1"><Clock3 size={15}/>{duration} menit</span>}
                                            <span className={`border border-gray-900 px-2 py-1 ${hasEntitlement ? 'bg-green-100 text-green-900' : access === 'FREEMIUM' && !accessLocked ? 'bg-cyan-100 text-cyan-900' : accessLocked ? 'bg-yellow-100 text-yellow-900' : 'bg-gray-100'}`}>{accessLabel}</span>
                                        </div>
                                        <TkaStartExamButton level={level} examSlug={exam.slug} disabledReason={disabledReason} />
                                    </article>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-400 bg-white/70 p-6 text-center">
                            <BookOpenCheck className="mx-auto" />
                            <h3 className="mt-3 font-black">Tryout belum dibuka</h3>
                            <p className="mt-1 text-sm font-semibold text-gray-600">Konfigurasi draft tidak ditampilkan sampai bank soal dan QA selesai.</p>
                        </div>
                    )}
                </section>

                <TkaPassPackagesClient
                    level={level}
                    packages={passOffers.map((offer) => ({
                        code: offer.code,
                        name: offer.name,
                        description: offer.description,
                        price: offer.price,
                        currency: offer.currency,
                        durationDays: offer.durationDays,
                    }))}
                />
            </div>
        </main>
    )
}
