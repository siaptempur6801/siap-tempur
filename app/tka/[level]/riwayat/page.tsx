import Link from 'next/link'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  History,
  ListChecks,
  RotateCcw,
} from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'
import PageHeader from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AttemptRow = {
  id: string
  exam_id: string
  attempt_number: number | null
  status: string | null
  started_at: string | null
  submitted_at: string | null
  percentage: number | null
  updated_at: string | null
}

type ExamRow = {
  id: string
  title: string
  slug: string
  exam_type_id: string | null
}

function statusView(status: unknown) {
  const value = String(status ?? '').toLowerCase()
  if (value === 'completed' || value === 'submitted') {
    return {
      label: 'Selesai',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
    }
  }
  if (value === 'in_progress') {
    return {
      label: 'Sedang dikerjakan',
      className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80',
    }
  }
  if (value === 'expired') {
    return {
      label: 'Kedaluwarsa',
      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
    }
  }
  return {
    label: value || 'Tidak diketahui',
    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Waktu tidak tersedia'
  const date = new Date(value)
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

function modeView(exam: ExamRow, typeCode: string, typeName: string) {
  const slug = exam.slug.toLowerCase()
  if (typeCode.includes('DIAGNOSTIC') || slug.includes('diagnostic')) {
    return {
      label: 'Tes Diagnostik',
      icon: <BrainCircuit size={14} />,
      tone: 'bg-brand-blue-soft text-brand-blue-700 ring-1 ring-brand-blue-100',
    }
  }
  if (typeCode.includes('DRILL') || slug.includes('drill')) {
    return {
      label: 'Latihan Fokus',
      icon: <RotateCcw size={14} />,
      tone: 'bg-brand-peach-100 text-brand-peach-800 ring-1 ring-brand-peach-100',
    }
  }
  if (typeCode.includes('MINI') || slug.includes('mini')) {
    return {
      label: 'Mini Tryout',
      icon: <Clock3 size={14} />,
      tone: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70',
    }
  }
  return {
    label: typeName || 'Full Tryout',
    icon: <ListChecks size={14} />,
    tone: 'bg-brand-ink-soft text-slate-700 ring-1 ring-brand-ink-line',
  }
}

function resultHref(base: string, attempt: AttemptRow, exam: ExamRow, typeCode: string) {
  const completed = ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase())
  const diagnostic =
    typeCode.includes('DIAGNOSTIC') || exam.slug.toLowerCase().includes('diagnostic')
  if (diagnostic)
    return completed
      ? `${base}/diagnostic/${attempt.id}/result`
      : `${base}/diagnostic/${attempt.id}`
  return completed ? `${base}/tryout/${attempt.id}/result` : `${base}/tryout/${attempt.id}`
}

export default async function TkaHistoryPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level) notFound()

  const base = tkaLevelPath(level)
  if (!isTkaLevelAvailable(level)) redirect(base)

  const supabase = await createV2Client()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/riwayat`)}`)

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id')
    .eq('code', 'TKA')
    .maybeSingle()
  if (programError) throw programError
  if (!program?.id) notFound()

  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('id')
    .eq('program_id', program.id)
    .eq('code', level)
    .maybeSingle()
  if (trackError) throw trackError
  if (!track?.id) notFound()

  const { data: attemptRows, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, attempt_number, status, started_at, submitted_at, percentage, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (attemptError) throw attemptError

  const attempts = (attemptRows ?? []) as AttemptRow[]
  const attemptExamIds = Array.from(new Set(attempts.map((attempt) => String(attempt.exam_id))))
  const { data: examRows, error: examError } =
    attemptExamIds.length > 0
      ? await supabase
          .from('exams')
          .select('id, title, slug, exam_type_id')
          .eq('track_id', track.id)
          .in('id', attemptExamIds)
      : { data: [], error: null }
  if (examError) throw examError

  const exams = (examRows ?? []) as ExamRow[]
  const examById = new Map(exams.map((exam) => [String(exam.id), exam]))
  const typeIds = Array.from(
    new Set(exams.map((exam) => exam.exam_type_id).filter((id): id is string => Boolean(id))),
  )
  const { data: typeRows, error: typeError } =
    typeIds.length > 0
      ? await supabase.from('exam_types').select('id, code, name').in('id', typeIds)
      : { data: [], error: null }
  if (typeError) throw typeError

  const typeById = new Map(
    (typeRows ?? []).map((type) => [
      String(type.id),
      {
        code: String(type.code ?? '').toUpperCase(),
        name: String(type.name ?? ''),
      },
    ]),
  )
  const history = attempts.flatMap((attempt) => {
    const exam = examById.get(String(attempt.exam_id))
    if (!exam) return []
    return [
      { attempt, exam, type: typeById.get(String(exam.exam_type_id)) ?? { code: '', name: '' } },
    ]
  })
  const completedCount = history.filter(({ attempt }) =>
    ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase()),
  ).length
  const activeCount = history.filter(
    ({ attempt }) => String(attempt.status ?? '').toLowerCase() === 'in_progress',
  ).length

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <PageHeader
          eyebrow={
            <>
              <History size={14} aria-hidden="true" /> Aktivitas Belajar · TKA {level}
            </>
          }
          title="Riwayat pengerjaan"
          description="Lihat diagnostik, latihan fokus, mini tryout, dan tryout yang pernah kamu kerjakan untuk meninjau perkembangan belajar."
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={<History size={18} />}
            tone="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70"
            label="Total sesi"
            value={String(history.length)}
            description="Seluruh sesi evaluasi yang tercatat di akunmu."
          />
          <SummaryCard
            icon={<CheckCircle2 size={18} />}
            tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
            label="Selesai"
            value={String(completedCount)}
            description="Sesi tryout dan latihan yang berhasil dituntaskan."
          />
          <SummaryCard
            icon={<Clock3 size={18} />}
            tone="bg-amber-50 text-amber-800 ring-1 ring-amber-200/70"
            label="Berjalan"
            value={String(activeCount)}
            description="Sesi aktif yang masih bisa kamu lanjutkan."
          />
        </section>

        <section aria-labelledby="tka-history-list" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Semua aktivitas
              </p>
              <h2
                id="tka-history-list"
                className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
              >
                Pilih sesi untuk melanjutkan atau melihat hasil
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">{history.length} sesi tercatat</span>
          </div>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map(({ attempt, exam, type }) => {
                const status = statusView(attempt.status)
                const mode = modeView(exam, type.code, type.name)
                const completed = ['completed', 'submitted'].includes(
                  String(attempt.status ?? '').toLowerCase(),
                )
                return (
                  <Link
                    key={attempt.id}
                    href={resultHref(base, attempt, exam, type.code)}
                    className="st-focus group flex flex-col justify-between gap-4 rounded-2xl border border-border-strong bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${mode.tone}`}
                        >
                          {mode.icon}
                          <span>{mode.label}</span>
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <h3 className="mt-2.5 text-base font-bold text-slate-950 transition-colors group-hover:text-indigo-950 sm:text-lg">
                        {exam.title}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Pengerjaan #{attempt.attempt_number ?? '-'} ·{' '}
                        {formatDate(
                          attempt.updated_at || attempt.submitted_at || attempt.started_at,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-2xs transition-all ${
                          completed
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white'
                            : 'bg-slate-900 text-white group-hover:bg-slate-800'
                        }`}
                      >
                        <span>
                          {completed && attempt.percentage !== null
                            ? `Skor ${Number(attempt.percentage).toFixed(0)}%`
                            : completed
                              ? 'Lihat hasil'
                              : 'Lanjutkan'}
                        </span>
                        <ArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border-strong bg-white p-8 text-center shadow-xs md:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-2xs">
                <History size={26} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Belum ada riwayat pengerjaan
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Mulai dari Tes Diagnostik atau pilih Full Tryout untuk membangun peta kesiapan dan
                riwayat belajarmu.
              </p>
              <Link
                href={`${base}/diagnostic`}
                className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98]"
              >
                <span>Mulai Tes Diagnostik</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  icon,
  tone,
  label,
  value,
  description,
}: {
  icon: React.ReactNode
  tone: string
  label: string
  value: string
  description: string
}) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border-strong bg-white p-5 md:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-600 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-2xs ${tone}`}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {value}
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900">{label}</div>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}
