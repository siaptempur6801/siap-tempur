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
    if (value === 'completed' || value === 'submitted') return { label: 'Selesai', className: 'bg-emerald-100 text-emerald-800' }
    if (value === 'in_progress') return { label: 'Sedang dikerjakan', className: 'bg-blue-100 text-blue-700' }
    if (value === 'expired') return { label: 'Kedaluwarsa', className: 'bg-yellow-100 text-amber-800' }
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
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-6 md:px-8 md:py-10">
            <div data-testid="tka-level-ready" className="mx-auto max-w-6xl space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link href="/tka" className="st-focus inline-flex min-h-11 items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-700">
                        <ArrowLeft size={17} /> Semua jenjang TKA
                    </Link>
                    <Link href="/cpns" className="st-focus inline-flex min-h-11 items-center text-sm font-black text-slate-600 hover:text-blue-700">Persiapan CPNS</Link>
                </div>

                <header className="st-card-lg relative overflow-hidden p-6 md:p-8">
                    <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                    <div className="relative flex flex-wrap items-start justify-between gap-6">
                        <div className="max-w-3xl">
                            <span className="st-kicker">TKA · SMP</span>
                            <h1 className="st-heading-display mt-5 text-4xl md:text-5xl">TKA {LEVEL_LABEL[level]}</h1>
                            <p className="st-muted mt-3 font-semibold leading-relaxed md:text-lg">
                                SiapTempur memusatkan TKA SMP pada Matematika dan Bahasa Indonesia. Bahasa Inggris dan IPA tersedia sebagai materi pengayaan.
                            </p>
                        </div>
                        <div className={`st-pill ${activeTrack ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-amber-800'}`}>
                            {activeTrack ? <><CheckCircle2 size={15}/> Jalur belajar aktif</> : <><LockKeyhole size={15}/> Belum diaktifkan</>}
                        </div>
                    </div>
                </header>

                {query.activated === '1' && (
                    <div role="status" className="st-success px-4 py-3 text-sm font-black text-emerald-800">Jalur belajar TKA {level} sudah aktif di akunmu.</div>
                )}
                {query.error && (
                    <div role="alert" className="st-danger px-4 py-3 text-sm font-black text-red-800">{query.error}</div>
                )}

                {activeTrack && (
                    <section aria-label="Lanjutkan belajar TKA" className="grid gap-5 md:grid-cols-3">
                        <ShortcutCard href={`${path}/progress`} icon={<History size={20}/>} tone="bg-blue-100 text-blue-700" title="Perkembangan belajar" description="Lihat hasil latihan dan perubahan kemampuanmu dari waktu ke waktu." action="Lihat perkembangan" />
                        <ShortcutCard href={`${path}/wrong-questions`} icon={<BookOpenCheck size={20}/>} tone="bg-yellow-100 text-amber-800" title="Soal yang perlu diulang" description="Kembali ke soal yang masih perlu kamu pahami dan pelajari pembahasannya." action="Ulangi soal" />
                        <ShortcutCard href={`${path}/progress`} icon={<CheckCircle2 size={20}/>} tone="bg-emerald-100 text-emerald-700" title="Latihan perbaikan" description="Fokuskan latihan pada bagian yang masih lemah sebelum mencoba tryout berikutnya." action="Lihat rekomendasi" />
                    </section>
                )}

                {!activeTrack && (
                    <section className="st-warning p-5 md:p-6">
                        <h2 className="st-heading text-xl">Aktifkan jalur TKA {level}</h2>
                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">Aktifkan jalur ini agar hasil latihan dan tryout tersimpan dalam akunmu. Data sekolah boleh dikosongkan.</p>
                        <form action={activateTkaTrackAction} className="mt-5 grid gap-4 md:grid-cols-4">
                            <input type="hidden" name="level" value={level} />
                            <Field label="Nama sekolah"><input name="school_name" className="st-input" placeholder="Opsional" /></Field>
                            <Field label="Kelas"><input name="school_grade" className="st-input" placeholder="Contoh: 9" /></Field>
                            <Field label="Tahun target"><input name="target_year" type="number" min="2025" max="2100" className="st-input" placeholder="2026" /></Field>
                            <Button type="submit" className="self-end">Aktifkan jalur belajar</Button>
                        </form>
                    </section>
                )}

                <section className="space-y-4">
                    <SectionHeading title="Mata pelajaran" description="Lihat mata pelajaran yang tersedia di jenjang ini dan jumlah soal yang sudah dapat digunakan." />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {catalog.subjects.map((subject) => {
                            const enrichment = subject.subjectType.toLowerCase() === 'enrichment'
                            return (
                                <article key={subject.id} className="st-card p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-black uppercase tracking-wide text-blue-700">{subject.code}</span>
                                                <span className={`st-pill ${enrichment ? 'bg-yellow-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {enrichment ? 'Pengayaan' : 'Wajib TKA'}
                                                </span>
                                            </div>
                                            <h3 className="st-heading mt-2 text-lg">{subject.name}</h3>
                                        </div>
                                        <div className={`flex h-9 w-9 items-center justify-center border-2 border-slate-900 ${enrichment ? 'bg-yellow-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}><School size={18} /></div>
                                    </div>
                                    <p className="st-muted mt-4 text-sm font-bold">{questionCountBySubject.get(subject.id) ?? 0} soal tersedia untuk latihan.</p>
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
                        <div className="grid gap-5 md:grid-cols-2">
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
                                    <article key={exam.id} className="st-card-md p-5 md:p-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide text-blue-700">{type?.name || type?.code || 'Tryout'}</p>
                                                <h3 className="st-heading mt-2 text-xl">{exam.title}</h3>
                                            </div>
                                            <div className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-blue-50 text-blue-700"><BookOpenCheck size={19} /></div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                                            {duration && <MetaChip icon={<Clock3 size={13}/>} text={`${duration} menit`} />}
                                            {stagingFullExam && <MetaChip text="60 soal · 30 + 30" />}
                                            {stagingFullExam && <MetaChip text="75 menit / bagian" />}
                                            {stagingMiniExam && <MetaChip text="15 soal · 1 mapel" />}
                                            <span className={`st-pill ${stagingFullExam ? 'bg-blue-100 text-blue-700' : hasEntitlement ? 'bg-emerald-100 text-emerald-800' : access === 'FREEMIUM' && !accessLocked ? 'bg-blue-100 text-blue-700' : accessLocked ? 'bg-yellow-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{accessLabel}</span>
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
                                    <Link key={attempt.id} href={href} className="st-card st-focus group p-5 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Pengerjaan #{attempt.attempt_number}</p>
                                                <h3 className="mt-1 truncate font-black text-slate-950">{exam.title}</h3>
                                                <p className="st-muted mt-1 text-xs font-bold">{formatAttemptDate(attempt.updated_at || attempt.submitted_at || attempt.started_at)}</p>
                                            </div>
                                            <span className={`st-pill shrink-0 ${status.className}`}>{status.label}</span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between gap-3 border-t-2 border-dashed border-slate-200 pt-4 text-sm">
                                            <span className="st-muted font-bold">{completed && attempt.percentage !== null ? `Skor ${Number(attempt.percentage).toFixed(0)}%` : completed ? 'Lihat hasil' : 'Lanjutkan tryout'}</span>
                                            <span className="inline-flex items-center gap-1 font-black text-blue-700 group-hover:underline">Buka <ArrowRight size={15}/></span>
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
    const tone = isSd ? 'bg-yellow-100 text-amber-800' : 'bg-violet-100 text-violet-700'

    return (
        <main data-experience-mode="marketing" data-program={`tka-${level.toLowerCase()}`} className="st-product min-h-screen px-4 py-8 md:px-8 md:py-14">
            <div className="mx-auto max-w-4xl">
                <Link href="/tka" className="st-focus inline-flex min-h-11 items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-700"><ArrowLeft size={17}/> Semua jenjang TKA</Link>
                <section className="st-card-lg relative mt-8 overflow-hidden p-7 md:p-12">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                    <div className={`relative flex h-14 w-14 items-center justify-center border-2 border-slate-900 ${tone}`}><Icon size={27}/></div>
                    <p className="relative mt-7 text-xs font-black uppercase tracking-[0.16em] text-blue-700">TKA {level}</p>
                    <h1 className="st-heading-display relative mt-2 text-4xl md:text-6xl">Pengalaman belajar TKA {level} sedang kami siapkan.</h1>
                    <p className="st-muted relative mt-5 max-w-2xl text-lg font-semibold leading-relaxed">
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

function ShortcutCard({ href, icon, tone, title, description, action }: { href: string; icon: React.ReactNode; tone: string; title: string; description: string; action: string }) {
    return (
        <Link href={href} className="st-card st-focus group p-5 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
            <div className={`flex h-10 w-10 items-center justify-center border-2 border-slate-900 ${tone}`}>{icon}</div>
            <h2 className="st-heading mt-4 text-lg">{title}</h2>
            <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{description}</p>
            <span className="mt-4 inline-flex min-h-8 items-center gap-1.5 text-sm font-black text-blue-700 group-hover:underline">{action} <ArrowRight size={15}/></span>
        </Link>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="space-y-1.5"><span className="block text-xs font-black text-slate-700">{label}</span>{children}</label>
}

function SectionHeading({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{icon ? <span className="inline-flex items-center gap-2">{icon} TKA SMP</span> : 'TKA SMP'}</p>
            <h2 className="st-heading-display mt-1 text-3xl md:text-4xl">{title}</h2>
            <p className="st-muted mt-2 max-w-3xl text-sm font-semibold leading-relaxed">{description}</p>
        </div>
    )
}

function MetaChip({ icon, text }: { icon?: React.ReactNode; text: string }) {
    return <span className="st-pill bg-slate-100 text-slate-700">{icon}{text}</span>
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="st-card p-7 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center border-2 border-slate-900 bg-slate-100 text-slate-600">{icon}</div>
            <h3 className="st-heading mt-4">{title}</h3>
            <p className="st-muted mx-auto mt-1 max-w-lg text-sm font-semibold leading-relaxed">{description}</p>
        </div>
    )
}
