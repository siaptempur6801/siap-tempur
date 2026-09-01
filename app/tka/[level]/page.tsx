import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Clock3, GraduationCap, History, LockKeyhole, School } from 'lucide-react'
import { activateTkaTrackAction } from '@/app/actions/user-track'
import TkaPassPackagesClient from '@/components/tka/TkaPassPackagesClient'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { commerceService } from '@/src/services/commerce.service'
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

function attemptStatus(status: unknown) {
    const value = String(status ?? '').toLowerCase()
    if (value === 'completed' || value === 'submitted') return { label: 'Selesai', className: 'bg-emerald-50 text-emerald-700' }
    if (value === 'in_progress') return { label: 'Sedang dikerjakan', className: 'bg-blue-50 text-blue-700' }
    if (value === 'expired') return { label: 'Kedaluwarsa', className: 'bg-amber-50 text-amber-700' }
    return { label: value || 'Tidak diketahui', className: 'bg-slate-100 text-slate-600' }
}

function formatAttemptDate(value: unknown) {
    if (!value) return 'Waktu tidak tersedia'
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return 'Waktu tidak tersedia'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

    const rawPassOffers = stagingEnvironment
        ? []
        : await commerceService.listActiveProductOffers('TKA', level)
    const passOffers = rawPassOffers.filter((offer) => offer.code.startsWith(`TKA_${level}_PASS_`))

    const questionStatuses = stagingSmpPilot
        ? ['approved', 'published']
        : ['published']
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

    const attemptCountByExam = new Map<string, number>()
    for (const row of attemptRows ?? []) {
        const id = String(row.exam_id)
        attemptCountByExam.set(id, (attemptCountByExam.get(id) ?? 0) + 1)
    }

    const examTypeById = new Map((examTypes ?? []).map((row) => [String(row.id), row]))
    const examById = new Map((exams ?? []).map((exam) => [String(exam.id), exam]))
    const questionCountBySubject = new Map<string, number>()
    for (const row of questionRows ?? []) {
        const id = String(row.subject_id)
        questionCountBySubject.set(id, (questionCountBySubject.get(id) ?? 0) + 1)
    }
    const activeTrack = userTrack?.status.toLowerCase() === 'active'
    const recentAttempts = (attemptRows ?? []).slice(0, 6)

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 md:py-10">
            <div data-testid="tka-level-ready" className="mx-auto max-w-6xl space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link href="/tka" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:px-3 hover:text-slate-950">
                        <ArrowLeft size={17} /> Semua jenjang TKA
                    </Link>
                    <Link href="/cpns" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-950">Persiapan CPNS</Link>
                </div>

                <header className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[var(--px-shadow-sm)] md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                        <div className="max-w-3xl">
                            <p className="text-sm font-semibold text-emerald-700">TKA · SMP</p>
                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">TKA {LEVEL_LABEL[level]}</h1>
                            <p className="mt-3 leading-relaxed text-slate-600 md:text-lg">
                                SiapTempur memusatkan TKA SMP pada Matematika dan Bahasa Indonesia. Bahasa Inggris dan IPA tersedia sebagai materi pengayaan.
                            </p>
                        </div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${activeTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {activeTrack ? <><CheckCircle2 size={16}/> Jalur belajar aktif</> : <><LockKeyhole size={16}/> Belum diaktifkan</>}
                        </div>
                    </div>
                </header>

                {query.activated === '1' && (
                    <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                        Jalur belajar TKA {level} sudah aktif di akunmu.
                    </div>
                )}
                {query.error && (
                    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                        {query.error}
                    </div>
                )}

                {activeTrack && (
                    <section aria-label="Lanjutkan belajar TKA" className="grid gap-4 md:grid-cols-3">
                        <ShortcutCard href={`${path}/progress`} icon={<History size={20}/>} tone="bg-blue-50 text-blue-700" title="Perkembangan belajar" description="Lihat hasil latihan dan perubahan kemampuanmu dari waktu ke waktu." action="Lihat perkembangan" />
                        <ShortcutCard href={`${path}/wrong-questions`} icon={<BookOpenCheck size={20}/>} tone="bg-amber-50 text-amber-700" title="Soal yang perlu diulang" description="Kembali ke soal yang masih perlu kamu pahami dan pelajari pembahasannya." action="Ulangi soal" />
                        <ShortcutCard href={`${path}/progress`} icon={<CheckCircle2 size={20}/>} tone="bg-emerald-50 text-emerald-700" title="Latihan perbaikan" description="Fokuskan latihan pada bagian yang masih lemah sebelum mencoba tryout berikutnya." action="Lihat rekomendasi" />
                    </section>
                )}

                {!activeTrack && (
                    <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 md:p-6">
                        <h2 className="text-xl font-bold text-slate-950">Aktifkan jalur TKA {level}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">Aktifkan jalur ini agar hasil latihan dan tryout tersimpan dalam akunmu. Data sekolah boleh dikosongkan.</p>
                        <form action={activateTkaTrackAction} className="mt-5 grid gap-4 md:grid-cols-4">
                            <input type="hidden" name="level" value={level} />
                            <Field label="Nama sekolah"><input name="school_name" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="Opsional" /></Field>
                            <Field label="Kelas"><input name="school_grade" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="Contoh: 9" /></Field>
                            <Field label="Tahun target"><input name="target_year" type="number" min="2025" max="2100" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="2026" /></Field>
                            <Button type="submit" className="self-end bg-emerald-600 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700">Aktifkan jalur belajar</Button>
                        </form>
                    </section>
                )}

                <section className="space-y-4">
                    <SectionHeading title="Mata pelajaran" description="Lihat mata pelajaran yang tersedia di jenjang ini dan jumlah soal yang sudah dapat digunakan." />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {catalog.subjects.map((subject) => {
                            const enrichment = subject.subjectType.toLowerCase() === 'enrichment'
                            return (
                                <article key={subject.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{subject.code}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enrichment ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                    {enrichment ? 'Pengayaan' : 'Wajib TKA'}
                                                </span>
                                            </div>
                                            <h3 className="mt-2 text-lg font-bold text-slate-950">{subject.name}</h3>
                                        </div>
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${enrichment ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}><School size={18} /></div>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500">{questionCountBySubject.get(subject.id) ?? 0} soal tersedia untuk latihan.</p>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeading
                        title="Tryout tersedia"
                        description={stagingSmpPilot
                            ? 'Pilih Mini Tryout untuk mengukur satu mata pelajaran atau Full Tryout untuk mengukur kemampuan dalam sesi yang lebih lengkap.'
                            : 'Mini Tryout memiliki satu kesempatan gratis per mata pelajaran. Akses lanjutan dan Full Tryout mengikuti paket yang aktif di akunmu.'}
                    />
                    {(exams ?? []).length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {(exams ?? []).map((exam) => {
                                const type = examTypeById.get(String(exam.exam_type_id))
                                const duration = minutes(exam.duration_seconds)
                                const windowReason = examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at })
                                const featureId = exam.required_feature_id ? String(exam.required_feature_id) : null
                                const hasEntitlement = featureId ? entitledFeatures.has(featureId) : false
                                const usedAttempts = attemptCountByExam.get(String(exam.id)) ?? 0
                                const access = String(exam.access_type ?? 'FREE').toUpperCase()
                                const freeLimit = Number(exam.attempt_limit ?? 1)
                                const stagingFullExam = stagingSmpPilot && exam.slug === 'tka-smp-full'
                                const stagingMiniExam = stagingSmpPilot && exam.slug.startsWith('tka-smp-mini-')
                                const freemiumLocked = access === 'FREEMIUM' && !hasEntitlement && usedAttempts >= freeLimit
                                const premiumLocked = !stagingFullExam && access === 'PREMIUM' && !hasEntitlement
                                const accessLocked = freemiumLocked || premiumLocked
                                const accessReason = premiumLocked
                                    ? 'Butuh Tempur Pass'
                                    : freemiumLocked
                                        ? 'Kuota gratis habis · Butuh Tempur Pass'
                                        : null
                                const disabledReason = !activeTrack ? 'Aktifkan jalur belajar terlebih dahulu' : windowReason || accessReason
                                const accessLabel = stagingFullExam
                                    ? 'Akses uji coba'
                                    : hasEntitlement
                                        ? 'Tempur Pass aktif'
                                        : access === 'FREEMIUM'
                                            ? `Gratis ${Math.max(0, freeLimit - usedAttempts)}x tersisa`
                                            : access === 'PREMIUM'
                                                ? 'Premium · Tempur Pass'
                                                : 'Gratis'

                                return (
                                    <article key={exam.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)] md:p-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{type?.name || type?.code || 'Tryout'}</p>
                                                <h3 className="mt-2 text-xl font-bold text-slate-950">{exam.title}</h3>
                                            </div>
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BookOpenCheck size={19} /></div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                                            {duration && <MetaChip icon={<Clock3 size={13}/>} text={`${duration} menit`} />}
                                            {stagingFullExam && <MetaChip text="60 soal · 30 + 30" />}
                                            {stagingFullExam && <MetaChip text="75 menit / bagian" />}
                                            {stagingMiniExam && <MetaChip text="15 soal · 1 mapel" />}
                                            <span className={`rounded-full px-2.5 py-1 ${stagingFullExam ? 'bg-blue-50 text-blue-700' : hasEntitlement ? 'bg-emerald-50 text-emerald-700' : access === 'FREEMIUM' && !accessLocked ? 'bg-blue-50 text-blue-700' : accessLocked ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{accessLabel}</span>
                                        </div>
                                        <TkaStartExamButton level={level} examSlug={exam.slug} disabledReason={disabledReason} />
                                    </article>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={<BookOpenCheck size={22}/>} title="Tryout belum dibuka" description="Pilihan tryout akan muncul di sini setelah siap digunakan." />
                    )}
                </section>

                <section className="space-y-4">
                    <SectionHeading title="Riwayat terbaru" description="Lanjutkan pengerjaan yang belum selesai atau buka kembali hasil dan pembahasan." icon={<History size={20}/>} />
                    {recentAttempts.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {recentAttempts.map((attempt) => {
                                const exam = examById.get(String(attempt.exam_id))
                                if (!exam) return null
                                const status = attemptStatus(attempt.status)
                                const completed = ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase())
                                const href = completed ? `${path}/tryout/${attempt.id}/result` : `${path}/tryout/${attempt.id}`
                                return (
                                    <Link key={attempt.id} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--px-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Pengerjaan #{attempt.attempt_number}</p>
                                                <h3 className="mt-1 truncate font-bold text-slate-950">{exam.title}</h3>
                                                <p className="mt-1 text-xs text-slate-500">{formatAttemptDate(attempt.updated_at || attempt.submitted_at || attempt.started_at)}</p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                                            <span className="text-slate-500">{completed && attempt.percentage !== null ? `Skor ${Number(attempt.percentage).toFixed(0)}%` : completed ? 'Lihat hasil' : 'Lanjutkan tryout'}</span>
                                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">Buka <ArrowRight size={15}/></span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={<History size={22}/>} title="Belum ada riwayat tryout" description="Mulai Mini Tryout atau Full Tryout pertama untuk membangun riwayat belajarmu." />
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

function TkaComingSoonPage({ level }: { level: Exclude<TkaLevel, 'SMP'> }) {
    const isSd = level === 'SD'
    const Icon = isSd ? School : GraduationCap
    const tone = isSd ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'

    return (
        <main data-experience-mode="marketing" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8 md:py-14">
            <div className="mx-auto max-w-4xl">
                <Link href="/tka" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={17}/> Semua jenjang TKA</Link>
                <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[var(--px-shadow-md)] md:p-12">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}><Icon size={27}/></div>
                    <p className="mt-7 text-sm font-semibold text-slate-500">TKA {level}</p>
                    <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950 md:text-6xl">Pengalaman belajar TKA {level} sedang kami siapkan.</h1>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                        Saat tersedia nanti, jalur ini akan mengikuti pola SiapTempur yang sama: latihan, tryout, pembahasan, perkembangan belajar, dan rekomendasi langkah berikutnya.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button asChild><Link href="/tka">Kembali ke TKA</Link></Button>
                        <Button variant="outline" asChild><Link href="/cpns">Lihat persiapan CPNS</Link></Button>
                    </div>
                </section>
            </div>
        </main>
    )
}

function ShortcutCard({ href, icon, tone, title, description, action }: { href: string; icon: React.ReactNode; tone: string; title: string; description: string; action: string }) {
    return (
        <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)] transition hover:-translate-y-0.5 hover:shadow-[var(--px-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
            <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            <span className="mt-4 inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-emerald-700">{action} <ArrowRight size={15}/></span>
        </Link>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="space-y-1.5"><span className="block text-xs font-semibold text-slate-600">{label}</span>{children}</label>
}

function SectionHeading({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
    return (
        <div>
            <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-950">{icon}{title}</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
    )
}

function MetaChip({ icon, text }: { icon?: React.ReactNode; text: string }) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{icon}{text}</span>
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-7 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">{icon}</div>
            <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
    )
}
