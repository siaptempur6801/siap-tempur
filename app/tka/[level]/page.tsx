import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  History,
  LockKeyhole,
  RotateCcw,
  School,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { activateTkaTrackAction } from '@/app/actions/user-track'
import PageHeader from '@/components/ui/PageHeader'
import TkaNextStep from '@/components/tka/TkaNextStep'
import { Mascot } from '@/components/brand/Mascot'
import { MascotBubble } from '@/components/brand/playful'
import TkaSurfaceLink from '@/components/tka/TkaSurfaceLink'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getAuthenticatedTkaCatalogContext } from '@/src/repositories/tka-catalog-read.repository'
import { walletService } from '@/src/services/wallet.service'
import {
  isTkaLevelAvailable,
  parseTkaLevel,
  tkaContext,
  tkaLevelPath,
  type TkaLevel,
} from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEVEL_LABEL: Record<TkaLevel, string> = {
  SD: 'Sekolah Dasar',
  SMP: 'Sekolah Menengah Pertama',
  SMA: 'Sekolah Menengah Atas',
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

  if (!isTkaLevelAvailable(level)) {
    return <TkaComingSoonPage level={level} />
  }

  const path = tkaLevelPath(level)
  const supabase = await createV2Client()

  const context = tkaContext(level)
  const stagingEnvironment = env.appEnvironment() !== 'production'
  const stagingPilot = stagingEnvironment

  const { user, catalogContext } = await getAuthenticatedTkaCatalogContext(
    context.programCode,
    context.trackCode,
  )
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`)
  if (!catalogContext) notFound()
  const program = { id: catalogContext.programId }
  const track = { id: catalogContext.trackId }

  const questionStatuses = stagingPilot ? ['approved', 'published'] : ['published']
  const [
    { data: userTrack, error: userTrackError },
    { data: exams, error: examError },
    { data: examTypes, error: typeError },
    { count: questionCount, error: questionError },
  ] = await Promise.all([
    supabase
      .from('user_tracks')
      .select('status')
      .eq('user_id', user.id)
      .eq('track_id', track.id)
      .maybeSingle(),
    supabase
      .from('exams')
      .select('id, exam_type_id, title, slug')
      .eq('program_id', program.id)
      .eq('track_id', track.id)
      .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED'])
      .order('created_at', { ascending: true }),
    supabase.from('exam_types').select('id, code, name'),
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', program.id)
      .eq('track_id', track.id)
      .in('status', questionStatuses),
  ])
  if (userTrackError) throw userTrackError
  if (examError) throw examError
  if (typeError) throw typeError
  if (questionError) throw questionError

  if ((exams ?? []).length === 0) {
    return <TkaAssessmentUnavailablePage level={level} />
  }

  const examIds = (exams ?? []).map((exam) => String(exam.id))
  const [{ data: attemptRows, error: attemptError }, tokenBalance] = await Promise.all([
    examIds.length > 0
      ? supabase
          .from('exam_attempts')
          .select(
            'id, exam_id, attempt_number, status, started_at, submitted_at, total_score, percentage, updated_at',
          )
          .eq('user_id', user.id)
          .in('exam_id', examIds)
          .order('updated_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    walletService.getExamTokenBalance(user.id, program.id),
  ])
  if (attemptError) throw attemptError

  const examTypeById = new Map((examTypes ?? []).map((row) => [String(row.id), row]))
  const examById = new Map((exams ?? []).map((exam) => [String(exam.id), exam]))

  const totalQuestions = questionCount ?? 0
  const studentName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : null) ||
    'Pejuang TKA'

  const activeTrack = userTrack?.status.toLowerCase() === 'active'
  const learnerAttempts = (attemptRows ?? []).filter((attempt) => {
    const exam = examById.get(String(attempt.exam_id))
    const typeCode = String(
      examTypeById.get(String(exam?.exam_type_id ?? ''))?.code ?? '',
    ).toUpperCase()
    return typeCode !== 'DIAGNOSTIC'
  })
  const activeAttempt =
    learnerAttempts.find(
      (attempt) => String(attempt.status ?? '').toLowerCase() === 'in_progress',
    ) ?? null
  const activeExam = activeAttempt ? examById.get(String(activeAttempt.exam_id)) : null
  const activeExamType = activeExam ? examTypeById.get(String(activeExam.exam_type_id)) : null
  const activeTypeCode = String(activeExamType?.code ?? '').toUpperCase()
  const activeSlug = String(activeExam?.slug ?? '').toLowerCase()
  const activePracticeLabel =
    activeTypeCode.includes('DRILL') || activeSlug.includes('drill')
      ? 'Latihan Fokus'
      : activeSlug.includes('mini')
        ? 'Mini Tryout'
        : 'Full Tryout'
  const latestCompletedAttempt =
    learnerAttempts.find((attempt) =>
      ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase()),
    ) ?? null
  const latestCompletedExam = latestCompletedAttempt
    ? examById.get(String(latestCompletedAttempt.exam_id))
    : null
  const latestScore = latestCompletedAttempt
    ? latestCompletedAttempt.percentage !== null && latestCompletedAttempt.percentage !== undefined
      ? `${Number(latestCompletedAttempt.percentage).toFixed(0)}%`
      : Number(latestCompletedAttempt.total_score ?? 0).toFixed(0)
    : '-'
  const diagnosticExam = (exams ?? []).find(
    (exam) => String(exam.slug).toLowerCase() === 'tka-smp-diagnostic-awal',
  )
  const diagnosticAttempts = diagnosticExam
    ? (attemptRows ?? []).filter((attempt) => String(attempt.exam_id) === String(diagnosticExam.id))
    : []
  const diagnosticInProgress =
    diagnosticAttempts.find(
      (attempt) => String(attempt.status ?? '').toLowerCase() === 'in_progress',
    ) ?? null
  const hasCompletedDiagnostic = diagnosticAttempts.some((attempt) =>
    ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase()),
  )

  const recommendation = !activeTrack
    ? {
        href: path,
        title: `Aktifkan Jalur TKA ${level} terlebih dahulu`,
        description:
          level === 'SMP'
            ? 'Aktifkan jalur belajar agar hasil diagnostik, latihan, dan riwayat tryout tersimpan di akunmu.'
            : `Aktifkan jalur belajar agar status akses dan riwayat TKA ${level} yang tersedia terhubung ke akunmu.`,
        action: 'Aktifkan Jalur',
      }
    : activeAttempt
      ? {
          href: `${path}/tryout/${activeAttempt.id}`,
          title: `Lanjutkan ${activePracticeLabel} yang belum selesai`,
          description: `${activePracticeLabel} kamu masih berjalan. Lanjutkan dari soal terakhir agar progres tetap tersimpan rapi.`,
          action: 'Lanjutkan Sekarang',
        }
      : level === 'SMP' && diagnosticInProgress
        ? {
            href: `${path}/diagnostic/${diagnosticInProgress.id}`,
            title: 'Lanjutkan Tes Diagnostik',
            description:
              'Tes diagnostikmu belum selesai. Lanjutkan untuk mendapatkan peta kemampuan dan rekomendasi belajar.',
            action: 'Lanjutkan Diagnostik',
          }
        : level === 'SMP' && !hasCompletedDiagnostic
          ? {
              href: `${path}/diagnostic`,
              title: 'Mulai dari Tes Diagnostik',
              description:
                'Petakan kemampuan awalmu lebih dulu agar latihan berikutnya langsung fokus pada topik yang paling perlu diperkuat.',
              action: 'Mulai Diagnostik',
            }
          : latestCompletedAttempt && level === 'SMP'
            ? {
                href: `${path}/wrong-questions`,
                title: 'Perbaiki soal yang masih lemah',
                description:
                  'Gunakan hasil tryout terakhir untuk mengulang soal yang belum dikuasai sebelum mencoba sesi berikutnya.',
                action: 'Mulai Perbaikan',
              }
            : latestCompletedAttempt
              ? {
                  href: `${path}/riwayat`,
                  title: 'Tinjau evaluasi yang sudah selesai',
                  description:
                    'Buka riwayat untuk meninjau hasil dan memilih evaluasi berikutnya sesuai jenjangmu.',
                  action: 'Buka Riwayat',
                }
              : {
                  href: level === 'SMP' ? `${path}/focus` : `${path}/tryout`,
                  title: level === 'SMP' ? 'Mulai Latihan Fokus' : 'Pilih evaluasi TKA',
                  description:
                    level === 'SMP'
                      ? 'Gunakan rekomendasi diagnostik untuk memperkuat topik pertama sebelum masuk ke Mini Tryout.'
                      : `Lihat status tryout TKA ${level} dan riwayat evaluasi yang tersedia.`,
                  action: level === 'SMP' ? 'Mulai Latihan' : 'Lihat Evaluasi',
                }

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen overflow-x-clip px-4 py-6 md:px-8 md:py-8"
    >
      <div data-testid="tka-level-ready" className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        {/* Welcoming Learner Header */}
        <PageHeader
          className="border-b border-slate-200/80 pb-6"
          eyebrow={
            <>
              <Sparkles size={13} aria-hidden="true" />
              <span>TKA · {level}</span>
              <span aria-hidden="true">·</span>
              <span>{LEVEL_LABEL[level]}</span>
            </>
          }
          title={`Ringkasan TKA ${level}`}
          description={
            <>
              Halo, {studentName}. Pantau langkah belajar, status jalur, dan capaian terakhirmu dari
              sini.
            </>
          }
          aside={
            <>
              <Mascot
                name="tama"
                size="sm"
                tone="plain"
                className="hidden shrink-0 sm:inline-flex xl:hidden"
              />
              <MascotBubble
                name="tama"
                size="sm"
                soft
                bubbleTone="blue"
                className="hidden shrink-0 xl:flex"
                bubbleClassName="max-w-[15rem]"
              >
                Kita latih pelan-pelan, ya. Pilih satu langkah dulu, sisanya nanti mengikuti.
              </MascotBubble>
            </>
          }
        />

        {query.activated === '1' && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm"
          >
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>Jalur belajar TKA {level} berhasil diaktifkan di akunmu. Selamat belajar!</span>
          </div>
        )}
        {query.error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 shadow-sm"
          >
            {query.error}
          </div>
        )}

        {/* Hero Step & Access Status */}
        <section
          className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]"
          aria-label="Langkah berikutnya TKA"
        >
          <TkaNextStep recommendation={recommendation} />

          <article
            data-testid={activeTrack ? 'tka-track-active' : 'tka-track-inactive'}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border-strong bg-white p-4 shadow-xs transition-shadow duration-200 hover:shadow-sm md:p-5"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Saldo Token TKA
                </span>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${activeTrack ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}
                >
                  {activeTrack ? (
                    <>
                      <CheckCircle2 size={13} /> Jalur Aktif
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={13} /> Belum Aktif
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
                  <Ticket size={22} className="shrink-0 text-indigo-700" aria-hidden="true" />
                  {tokenBalance} token
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Tryout, Mini Tryout, dan Latihan Fokus memakai 1 token untuk setiap sesi baru.
                  Sesi aktif bisa dilanjutkan tanpa biaya tambahan.
                </p>
                {level === 'SMP' && (
                  <Link
                    href={`${path}/beli-token`}
                    className="st-focus mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
                  >
                    Kelola token <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>

          </article>
        </section>

        {/* Form Aktivasi Jalur (jika belum aktif) */}
        {!activeTrack && (
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 shadow-xs md:p-5">
            <div className="max-w-2xl">
              <div className="st-kicker bg-white">
                <Sparkles size={13} /> Aktivasi Jalur
              </div>
              <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                Aktifkan Jalur TKA {level}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {level === 'SMP'
                  ? 'Aktifkan jalur ini agar hasil latihan, tryout, dan riwayat remedial tersimpan di akunmu.'
                  : 'Aktifkan jalur ini untuk menyimpan status akses dan riwayat evaluasi yang tersedia di akunmu.'}{' '}
                Data sekolah bersifat opsional.
              </p>
            </div>
            <form
              action={activateTkaTrackAction}
              className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4"
            >
              <input type="hidden" name="level" value={level} />
              <Field label="Nama Sekolah">
                <input name="school_name" className="st-input rounded-xl" placeholder="Opsional" />
              </Field>
              <Field label="Kelas">
                <input
                  name="school_grade"
                  className="st-input rounded-xl"
                  placeholder="Contoh: 9"
                />
              </Field>
              <Field label="Tahun Target">
                <input
                  name="target_year"
                  type="number"
                  min="2025"
                  max="2100"
                  className="st-input rounded-xl"
                  placeholder="2026"
                />
              </Field>
              <Button type="submit" className="self-end rounded-xl font-bold">
                Aktifkan Jalur Belajar
              </Button>
            </form>
          </section>
        )}

        <section aria-labelledby="tka-learning-summary" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <div className="st-kicker">Ringkasan</div>
              <h2
                id="tka-learning-summary"
                className="mt-1.5 text-lg font-black tracking-tight text-slate-950"
              >
                Ringkasan Belajar
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Angka penting dan capaian terakhir dalam satu tampilan.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`${path}/riwayat`}
                className="st-focus inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <History size={14} /> Riwayat
              </Link>
              {activeTrack && level === 'SMP' && (
                <Link
                  href={`${path}/progress`}
                  className="st-focus inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <BarChart3 size={14} /> Perkembangan
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              icon={<BookOpenCheck size={17} />}
              label="Bank soal"
              value={String(totalQuestions)}
              detail={level === 'SMP' ? 'soal tersedia' : 'soal terdata'}
            />
            <SummaryMetric
              icon={<History size={17} />}
              label="Sesi belajar"
              value={String(learnerAttempts.length)}
              detail="sesi tersimpan"
            />
            <SummaryMetric
              icon={<BarChart3 size={17} />}
              label="Skor terakhir"
              value={latestScore}
              detail={latestCompletedAttempt ? 'hasil terakhir' : 'belum ada hasil'}
            />
          </div>

          {latestCompletedAttempt ? (
            <article className="grid gap-3 rounded-2xl border border-border-strong bg-white p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 size={13} /> Capaian terakhir
                </div>
                <h3 className="mt-3 truncate text-base font-bold text-slate-950">
                  {latestCompletedExam?.title ?? 'Hasil TKA Terbaru'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Pengerjaan #{latestCompletedAttempt.attempt_number} ·{' '}
                  {formatAttemptDate(
                    latestCompletedAttempt.submitted_at || latestCompletedAttempt.updated_at,
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-center ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Skor</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-slate-950">
                  {latestScore}
                </p>
              </div>
              <Link
                href={`${path}/tryout/${latestCompletedAttempt.id}/result`}
                className="st-focus inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 sm:w-auto"
              >
                Lihat hasil <ArrowRight size={14} />
              </Link>
            </article>
          ) : (
            <article className="rounded-2xl border border-dashed border-border-strong bg-white p-5 text-center">
              <h3 className="text-base font-black tracking-tight text-slate-950">
                Belum ada capaian
              </h3>
              <p className="st-muted mx-auto mt-1 max-w-md text-sm font-semibold">
                {level === 'SMP'
                  ? 'Mulai Tes Diagnostik atau Mini Tryout untuk mengisi ringkasan belajarmu.'
                  : `Riwayat evaluasi TKA ${level} akan muncul di sini setelah tersedia.`}
              </p>
              <Link
                href={level === 'SMP' ? `${path}/diagnostic` : `${path}/pilih-jalur`}
                className="st-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                {level === 'SMP' ? 'Mulai Tes Diagnostik' : 'Lihat status evaluasi'}{' '}
                <ArrowRight size={14} />
              </Link>
            </article>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="rounded-xl border border-border-strong bg-white p-3.5 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
        <span className="text-blue-700">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-xl font-black tracking-tight text-slate-950">{value}</span>
        <span className="text-[11px] font-semibold text-slate-500">{detail}</span>
      </div>
    </article>
  )
}

function TkaComingSoonPage({ level }: { level: TkaLevel }) {
  const isSd = level === 'SD'
  const Icon = isSd ? School : GraduationCap
  const iconTone = isSd
    ? 'bg-[var(--st-yellow-soft)] text-amber-800'
    : 'bg-[var(--st-blue-soft)] text-blue-700'

  return (
    <main
      data-experience-mode="marketing"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen overflow-x-clip px-4 py-8 md:px-8 md:py-14 font-sans text-slate-900"
    >
      <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-border-strong bg-white p-6 shadow-xs sm:p-9 md:p-12">
          <div
            className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border-2 border-dashed ${
              isSd
                ? 'border-amber-300 bg-[var(--st-yellow-soft)]'
                : 'border-blue-300 bg-[var(--st-blue-soft)]'
            }`}
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconTone}`}>
                <Icon size={28} />
              </div>
              <div>
                <span className="st-kicker">
                  <Sparkles size={13} />
                  <span>
                    TKA {level} · {LEVEL_LABEL[level]}
                  </span>
                </span>
              </div>
            </div>

            <h1 className="st-heading-display mt-4 text-xl leading-tight sm:text-2xl md:text-3xl">
              Pengalaman belajar TKA {level} sedang kami siapkan.
            </h1>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--brand-blue-50)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                Segera hadir
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
                Tahap penyiapan
              </span>
            </div>
            <p className="st-muted mt-4 max-w-2xl text-base font-semibold leading-relaxed sm:text-lg">
              Saat tersedia nanti, jalur ini akan mengikuti pola SiapTempur yang sama: latihan,
              tryout, pembahasan, perkembangan belajar, dan rekomendasi langkah berikutnya.
            </p>

            {/* Pilot recommendation card */}
            <div className="mt-6 rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    Pilot Aktif SiapTempur
                  </div>
                  <h2 className="text-base font-black tracking-tight text-slate-950">
                    Coba ekosistem TKA sekarang melalui jalur TKA {level}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Modul Tes Diagnostik, Latihan Fokus, Mini Tryout, dan Tryout Lengkap sudah aktif
                    dan siap digunakan.
                  </p>
                </div>
                <TkaSurfaceLink
                  href={tkaLevelPath(level)}
                  className="st-focus inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <span>Buka TKA {level}</span>
                  <ArrowRight size={15} />
                </TkaSurfaceLink>
              </div>
            </div>

            <MascotBubble
              name="tama"
              size="sm"
              soft
              bubbleTone="blue"
              className="mt-8 hidden sm:flex"
              bubbleClassName="max-w-xl"
            >
              Jenjang ini belum dibuka, tapi kamu bisa coba ekosistem TKA-nya lewat jalur SMP dulu —
              alurnya sama.
            </MascotBubble>

            {/* Navigation button row */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <TkaSurfaceLink
                href="/tka"
                className="st-focus inline-flex min-h-11 items-center justify-center rounded-xl border border-border-strong bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Kembali ke TKA
              </TkaSurfaceLink>
              <TkaSurfaceLink
                href="/tka/smp/pilih-jalur"
                className="st-focus inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/60 px-5 py-2.5 text-xs font-bold text-indigo-700 shadow-2xs transition-all duration-200 hover:bg-indigo-100 active:scale-[0.98]"
              >
                Pilih Jalur Belajar
              </TkaSurfaceLink>
              <Link
                href="/cpns"
                className="st-focus inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:text-slate-900"
              >
                Lihat persiapan CPNS
              </Link>
            </div>
          </div>
        </section>

        {/* Features preview cards */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
            <Sparkles size={14} className="text-blue-700" />
            <span>Fitur yang sedang disiapkan untuk TKA {level}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeaturePreviewCard
              icon={<BrainCircuit size={20} />}
              tone="bg-blue-50 text-blue-700 ring-1 ring-blue-200/70"
              title="Tes Diagnostik Cerdas"
              description="Identifikasi penguasaan konsep awal siswa untuk menentukan materi mana yang perlu dipelajari terlebih dahulu."
            />
            <FeaturePreviewCard
              icon={<RotateCcw size={20} />}
              tone="bg-blue-50 text-blue-700 ring-1 ring-blue-200/70"
              title="Latihan Fokus per Bab"
              description="Drilling butir soal bertingkat per topik materi dengan pembahasan komprehensif dan latihan remedial terarah."
            />
            <FeaturePreviewCard
              icon={<BookOpenCheck size={20} />}
              tone="bg-amber-50 text-amber-800 ring-1 ring-amber-200/70"
              title="Mini & Full Tryout"
              description="Simulasi ujian dengan format CBT standar, timer realistis, dan sistem navigasi soal mutakhir."
            />
            <FeaturePreviewCard
              icon={<BarChart3 size={20} />}
              tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
              title="Analisis Kesiapan Adaptif"
              description="Peta kekuatan per mata pelajaran dan rekomendasi materi prioritas untuk menaikkan skor kesiapan secara berkala."
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function TkaAssessmentUnavailablePage({ level }: { level: TkaLevel }) {
  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen bg-slate-50 px-4 py-10 font-body text-slate-950 sm:px-6"
    >
      <section className="mx-auto max-w-2xl rounded-3xl border border-border-strong bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <School size={23} />
        </div>
        <h1 className="mt-4 text-2xl font-black">Assessment TKA {level} belum tersedia</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          Konten ujian untuk jenjang ini sedang disiapkan. Akses assessment tambahan belum tersedia.
        </p>
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
          Assessment ini akan tersedia kembali setelah persiapan kontennya selesai.
        </p>
        <Link
          href="/tka"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white"
        >
          Kembali ke pilihan jenjang
        </Link>
      </section>
    </main>
  )
}

function FeaturePreviewCard({
  icon,
  tone,
  title,
  description,
}: {
  icon: React.ReactNode
  tone: string
  title: string
  description: string
}) {
  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border-strong bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
      <div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs ${tone}`}>
          {icon}
        </div>
        <h3 className="mt-3.5 text-base font-bold text-slate-950 group-hover:text-indigo-950 transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-2.5 text-[11px] font-bold text-indigo-600">
        Segera Hadir
      </div>
    </article>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-black text-slate-700">{label}</span>
      {children}
    </label>
  )
}
