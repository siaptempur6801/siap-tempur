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
import {
  getAuthenticatedTkaCatalogContext,
  getTkaAttemptSummaries,
} from '@/src/repositories/tka-catalog-read.repository'
import { isTkaLevelAvailable, parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'
import PageHeader from '@/components/ui/PageHeader'
import TkaFeatureNotice from '@/components/tka/TkaFeatureNotice'
import TkaTokenAccessSummary from '@/components/tka/TkaTokenAccessSummary'
import { walletService } from '@/src/services/wallet.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AccessTone = 'default' | 'success' | 'warning'

interface TryoutOption {
  id: string
  title: string
  slug: string
  typeLabel: string
  duration: number | null
  questionCount: number
  sections: Array<{ title: string; questionCount: number; duration: number | null }>
  details: string[]
  accessLabel: string
  accessTone: AccessTone
  tokenCost: number
  disabledReason: string | null
  activeAttemptId: string | null
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

export default async function TkaTryoutPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level || !isTkaLevelAvailable(level)) notFound()

  if (level !== 'SMP') {
    const base = tkaLevelPath(level)
    return (
      <TkaFeatureNotice
        level={level}
        title={`Tryout TKA ${level}`}
        description={`Katalog evaluasi TKA ${level} sedang dirapikan agar alur pengerjaan, hasil, dan riwayatnya konsisten.`}
        actionHref={base}
        actionLabel="Kembali ke dashboard"
        noticeTitle="Alur tryout sedang disiapkan"
        noticeDescription={`Tryout TKA ${level} belum dapat dimulai. Kembali ke dashboard untuk melanjutkan kegiatan belajar yang tersedia.`}
      />
    )
  }

  const base = tkaLevelPath(level)
  const pagePath = `${base}/tryout`
  const supabase = await createV2Client()

  const context = tkaContext(level)
  const { user, catalogContext } = await getAuthenticatedTkaCatalogContext(
    context.programCode,
    context.trackCode,
  )
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`)
  if (!catalogContext) notFound()
  const program = { id: catalogContext.programId }
  const track = { id: catalogContext.trackId }

  const [
    { data: userTrack, error: userTrackError },
    { data: exams, error: examError },
    { data: examTypes, error: typeError },
  ] = await Promise.all([
    supabase
      .from('user_tracks')
      .select('status')
      .eq('user_id', user.id)
      .eq('track_id', track.id)
      .maybeSingle(),
    supabase
      .from('exams')
      .select(
        'id, exam_type_id, title, slug, duration_seconds, token_cost, starts_at, ends_at',
      )
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
    return typeCode.includes('FULL') || slug.includes('full')
  })
  const examIds = catalogExams.map((exam) => String(exam.id))
  const { data: sectionRows, error: sectionError } =
    examIds.length > 0
      ? await supabase
          .from('exam_sections')
          .select('exam_id, title, question_count, duration_seconds, sort_order')
          .in('exam_id', examIds)
          .order('sort_order', { ascending: true })
      : { data: [], error: null }
  if (sectionError) throw sectionError
  const sectionsByExam = new Map<
    string,
    Array<{ title: string; questionCount: number; durationSeconds: number | null }>
  >()
  for (const row of sectionRows ?? []) {
    const examId = String(row.exam_id)
    const sections = sectionsByExam.get(examId) ?? []
    sections.push({
      title: String(row.title ?? '').trim(),
      questionCount: Math.max(0, Number(row.question_count ?? 0)),
      durationSeconds:
        row.duration_seconds === null ? null : Math.max(0, Number(row.duration_seconds)),
    })
    sectionsByExam.set(examId, sections)
  }
  const [attemptSummaries, tokenBalance] = await Promise.all([
    getTkaAttemptSummaries(supabase, examIds, true),
    walletService.getExamTokenBalance(user.id, program.id),
  ])

  const activeAttemptByExam = new Map(
    attemptSummaries.flatMap((row) =>
      row.active_attempt_id ? [[row.exam_id, row.active_attempt_id] as const] : [],
    ),
  )
  const activeTrack = userTrack?.status.toLowerCase() === 'active'
  const catalogOptions: TryoutOption[] = catalogExams.map((exam) => {
    const type = examTypeById.get(String(exam.exam_type_id))
    const typeCode = String(type?.code ?? '').toUpperCase()
    const slug = String(exam.slug)
    const tokenCost = Math.max(1, Number(exam.token_cost ?? 1))
    const sections = sectionsByExam.get(String(exam.id)) ?? []
    const questionCount = sections.reduce((total, section) => total + section.questionCount, 0)
    const sectionDurationSeconds = sections.reduce(
      (total, section) => total + (section.durationSeconds ?? 0),
      0,
    )
    const duration =
      sectionDurationSeconds > 0 ? minutes(sectionDurationSeconds) : minutes(exam.duration_seconds)
    const details = [
      ...(questionCount > 0 ? [`${questionCount} soal`] : []),
      ...(sections.length > 0 ? [`${sections.length} bagian`] : []),
    ]

    return {
      id: String(exam.id),
      title: String(exam.title),
      slug,
      typeLabel: String(type?.name || type?.code || 'Full Tryout'),
      duration,
      questionCount,
      sections: sections.map((section, index) => ({
        title: section.title || `Bagian ${index + 1}`,
        questionCount: section.questionCount,
        duration: section.durationSeconds ? minutes(section.durationSeconds) : null,
      })),
      details,
      accessLabel: `${tokenCost} token per sesi baru`,
      accessTone: 'default',
      tokenCost,
      disabledReason: activeAttemptByExam.has(String(exam.id))
        ? null
        : !activeTrack
          ? 'Aktifkan jalur belajar terlebih dahulu'
          : examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at }),
      activeAttemptId: activeAttemptByExam.get(String(exam.id)) ?? null,
    }
  })
  const featuredTryout = catalogOptions[0] ?? null
  const additionalFullTryouts = catalogOptions.slice(1)

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <PageHeader
          className="border-b border-slate-200/80 pb-6"
          eyebrow={
            <>
              <ListChecks size={14} aria-hidden="true" /> Full Tryout · TKA {level}
            </>
          }
          title="Full Tryout TKA"
          description={
            featuredTryout
              ? `Simulasi berstandar CAT dengan ${featuredTryout.questionCount || 'jumlah soal sesuai paket'} butir soal${featuredTryout.duration ? ` · ${featuredTryout.duration} menit` : ''} untuk mengukur kesiapan TKA ${level}.`
              : `Lihat paket simulasi dan tryout yang tersedia untuk TKA ${level}.`
          }
        />

        <TkaTokenAccessSummary tokenBalance={tokenBalance} href={`${base}/beli-token`} />

        {!activeTrack && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
            <p className="font-bold">Jalur TKA {level} belum aktif.</p>
            <p className="mt-1">
              Aktifkan jalur dari dashboard sebelum memulai tryout agar riwayat dan analisis
              tersimpan.
            </p>
            <Link
              href={base}
              className="st-focus mt-3 inline-flex min-h-10 items-center gap-2 font-bold text-amber-950 hover:underline"
            >
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
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Sesi Berjalan
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                      {featuredTryout.typeLabel}
                    </p>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                      {featuredTryout.title}
                    </h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      Simulasi penuh berstandar CAT untuk mengukur kesiapan dan pemahaman materi TKA{' '}
                      {level}.
                      {featuredTryout.duration
                        ? ` Alokasikan sekitar ${featuredTryout.duration} menit untuk menyelesaikannya.`
                        : ''}
                    </p>
                  </div>

                  {/* 2-Part Compact Cards */}
                  <div className="grid gap-3 pt-1 sm:grid-cols-2">
                    {featuredTryout.sections.map((section, index) => (
                      <div
                        key={`${section.title}-${index}`}
                        className="rounded-lg border border-slate-200 bg-muted/40 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-foreground">{section.title}</span>
                          {section.duration && (
                            <span className="text-muted-foreground">{section.duration} menit</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {section.questionCount} butir soal
                        </p>
                      </div>
                    ))}
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
                        {featuredTryout.activeAttemptId
                          ? 'Lanjutkan Sesi Ujianmu'
                          : 'Siap Mulai Simulasi Sekarang?'}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {featuredTryout.activeAttemptId
                          ? 'Kamu memiliki sesi yang sedang berjalan. Lanjutkan pengerjaan sekarang.'
                          : `Pastikan waktu luang${featuredTryout.duration ? ` sekitar ${featuredTryout.duration} menit` : ''} dan koneksi internet stabil.`}
                      </p>
                    </div>
                    <div className="w-full shrink-0 sm:w-56 [&>div]:mt-0">
                      <TkaStartExamButton
                        level={level}
                        examSlug={featuredTryout.slug}
                        examTitle={featuredTryout.title}
                        disabledReason={featuredTryout.disabledReason}
                        activeAttemptId={featuredTryout.activeAttemptId}
                        tokenBalance={tokenBalance}
                        tokenCost={featuredTryout.tokenCost}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Specifications & Parameter Panel) */}
              <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Parameter Ujian
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                      <Trophy size={12} className="text-amber-500" />
                      Standar CAT
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    Format Resmi TKA {level}
                  </p>
                </div>

                {/* 4 Stat Tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border-strong bg-white p-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <Clock3 size={15} />
                      <span className="text-xs font-medium text-slate-600">Total Waktu</span>
                    </div>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {featuredTryout.duration ?? '—'}{' '}
                      <span className="text-xs font-medium text-slate-500">menit</span>
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Mengikuti batas waktu tiap bagian
                    </p>
                  </div>

                  <div className="rounded-xl border border-border-strong bg-white p-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <BookOpenCheck size={15} />
                      <span className="text-xs font-medium text-slate-600">Total Soal</span>
                    </div>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {featuredTryout.questionCount || '—'}{' '}
                      <span className="text-xs font-medium text-slate-500">butir</span>
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Jumlah sesuai paket yang dipilih
                    </p>
                  </div>

                  <div className="rounded-xl border border-border-strong bg-white p-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <Layers size={15} />
                      <span className="text-xs font-medium text-slate-600">Sistem Sesi</span>
                    </div>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {featuredTryout.sections.length || '—'}{' '}
                      <span className="text-xs font-medium text-slate-500">bagian</span>
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">Berurutan otomatis</p>
                  </div>

                  <div className="rounded-xl border border-border-strong bg-white p-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <Trophy size={15} />
                      <span className="text-xs font-medium text-slate-600">Output</span>
                    </div>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      Rapor <span className="text-xs font-medium text-slate-500">&amp; Nilai</span>
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Analisis &amp; remedial
                    </p>
                  </div>
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
                <article
                  key={exam.id}
                  className="flex flex-col justify-between rounded-2xl border border-border-strong bg-white p-6 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                          {exam.typeLabel}
                        </p>
                        <h4 className="mt-2 text-xl font-bold text-slate-950">{exam.title}</h4>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <BookOpenCheck size={20} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {exam.duration && (
                        <MetaChip icon={<Clock3 size={13} />} text={`${exam.duration} menit`} />
                      )}
                      {exam.details.map((detail) => (
                        <MetaChip key={detail} text={detail} />
                      ))}
                      <MetaChip text={exam.accessLabel} tone={exam.accessTone} />
                    </div>
                  </div>
                  <div className="mt-6">
                    <TkaStartExamButton
                      level={level}
                      examSlug={exam.slug}
                      examTitle={exam.title}
                      disabledReason={exam.disabledReason}
                      activeAttemptId={exam.activeAttemptId}
                      tokenBalance={tokenBalance}
                      tokenCost={exam.tokenCost}
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

function MetaChip({
  icon,
  text,
  tone = 'default',
}: {
  icon?: React.ReactNode
  text: string
  tone?: AccessTone
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
        : 'bg-slate-100 text-slate-600'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}
    >
      {icon}
      {text}
    </span>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-white px-6 py-10 text-center shadow-xs">
      <BookOpenCheck size={26} className="mx-auto text-slate-400" />
      <h3 className="mt-3 text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">{description}</p>
    </div>
  )
}
