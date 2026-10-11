import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  History,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react'
import TkaLearningFocusPanel from '@/components/tka/TkaLearningFocusPanel'
import TkaReadinessCard from '@/components/tka/TkaReadinessCard'
import type { TkaProgressDashboardView } from '@/src/services/tka-progress-dashboard.service'
import ProgressBar from '@/components/ui/ProgressBar'

function boundedPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function formatAttemptDate(value: string) {
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

export default function TkaProgressDashboard({
  dashboard,
  level,
}: {
  dashboard: TkaProgressDashboardView
  level?: string
}) {
  const wrongLabel = dashboard.openWrongQuestionsIsLowerBound
    ? `${dashboard.openWrongQuestions}+`
    : String(dashboard.openWrongQuestions)

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<CheckCircle2 size={20} />}
          tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
          label="Tryout selesai"
          value={String(dashboard.completedAttempts)}
          description="Paket tryout dan simulasi yang telah kamu tuntaskan."
        />
        <MetricCard
          icon={<RotateCcw size={20} />}
          tone="bg-rose-50 text-rose-700 ring-1 ring-rose-200/70"
          label="Soal perlu diulang"
          value={wrongLabel}
          description="Soal keliru yang perlu dipelajari kembali pembahasannya."
        />
        <MetricCard
          icon={<BookOpenCheck size={20} />}
          tone="bg-amber-50 text-amber-800 ring-1 ring-amber-200/70"
          label="Latihan perbaikan"
          value={String(dashboard.pendingRemedialItems)}
          description={`Dari ${dashboard.activeRemedialSessions} sesi remedial yang masih aktif.`}
        />
        <MetricCard
          icon={<Target size={20} />}
          tone="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70"
          label="Materi terukur"
          value={`${boundedPercent(dashboard.coveragePercent).toFixed(1)}%`}
          description={`${dashboard.evidencedNodes} dari ${dashboard.assessableNodes} topik materi telah teruji melalui evaluasi.`}
        />
      </section>

      {dashboard.readiness ? (
        <TkaReadinessCard readiness={dashboard.readiness} level={level} showDashboardLink={false} />
      ) : (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs md:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-2xs">
            <TrendingUp size={24} />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Kesiapan belum tersedia
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Selesaikan minimal satu tryout agar SiapTempur bisa membaca peta kekuatan dan tingkat
            kesiapan belajarmu secara akurat.
          </p>
          <Link
            href={`/tka/${(level ?? 'SMP').toLowerCase()}/focus`}
            className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98]"
          >
            <span>Mulai Latihan Fokus</span> <ArrowRight size={16} />
          </Link>
        </section>
      )}

      <section className="space-y-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/70 shadow-2xs">
            <TrendingUp size={14} className="text-indigo-600" />
            <span>Perkembangan per Mapel</span>
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            Lihat kekuatan tiap mata pelajaran
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Bandingkan tingkat penguasaan konsep, akurasi pengerjaan, dan jumlah soal yang masih
            perlu dikaji ulang pada tiap mata pelajaran.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {dashboard.subjects.map((subject) => {
            const readinessPercent = boundedPercent(subject.readinessPercent)
            const masteryPercent = boundedPercent(subject.masteryPercent)
            const accuracyPercent = boundedPercent(subject.accuracyPercent)
            const coveragePercent = boundedPercent(subject.coveragePercent)
            return (
              <article
                key={subject.subjectId}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 md:p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center rounded-xl bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/70 shadow-2xs">
                        {subject.subjectCode}
                      </span>
                      <h3 className="text-xl font-bold text-slate-950">{subject.subjectName}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/80">
                      {readinessPercent.toFixed(1)}% siap
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <StatTile
                      label="Penguasaan"
                      value={`${masteryPercent.toFixed(1)}%`}
                      tone="bg-slate-50/80 border-slate-200/60 text-slate-700"
                    />
                    <StatTile
                      label="Ketepatan"
                      value={`${accuracyPercent.toFixed(1)}%`}
                      tone="bg-emerald-50/70 border-emerald-200/60 text-emerald-800"
                    />
                    <StatTile
                      label="Cakupan"
                      value={`${coveragePercent.toFixed(1)}%`}
                      tone="bg-indigo-50/70 border-indigo-200/60 text-indigo-800"
                    />
                    <StatTile
                      label="Perlu diulang"
                      value={String(subject.openWrongQuestions)}
                      tone="bg-rose-50/70 border-rose-200/60 text-rose-800"
                    />
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Kesiapan {subject.subjectName}</span>
                      <span className="font-black text-slate-900">
                        {readinessPercent.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={readinessPercent}
                      label={`Kesiapan ${subject.subjectName}`}
                      size="sm"
                      className="rounded-full border border-slate-200/80 bg-slate-100"
                      indicatorClassName="rounded-full bg-indigo-600"
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3.5 text-xs font-medium text-slate-500">
                  <span>
                    {subject.attempts} kali pengerjaan · {subject.questionsAnswered} butir soal
                    dinilai
                  </span>
                  <span className="font-semibold text-slate-700">
                    Materi terukur {subject.evidencedNodes}/{subject.assessableNodes}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <TkaLearningFocusPanel items={dashboard.focus.items} />

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-7 shadow-xs">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <History size={14} className="text-indigo-600" />
            <span>Aktivitas terbaru</span>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Riwayat hasil terbaru
          </h2>

          {dashboard.recentAttempts.length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.recentAttempts.map((attempt) => (
                <Link
                  key={attempt.attemptId}
                  href={attempt.href}
                  className="st-focus group flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-2xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 transition-colors group-hover:text-indigo-950">
                      {attempt.examTitle}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-400">
                      {formatAttemptDate(attempt.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-lg bg-white px-3 py-1 text-xs font-black text-slate-800 ring-1 ring-slate-200 shadow-2xs">
                      {attempt.percentage === null
                        ? 'Skor tersimpan'
                        : `${attempt.percentage.toFixed(0)}%`}
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-indigo-600 transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs font-medium text-slate-400">
              Belum ada hasil tryout yang tersimpan.
            </p>
          )}
        </div>

        <aside className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-6 md:p-7 text-white shadow-md">
          {/* Decorative aura */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-blue-400/20 blur-xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-100 backdrop-blur-xs">
              Langkah berikutnya
            </div>
            <h2 className="mt-3 text-xl font-bold sm:text-2xl">Jangan berhenti di skor.</h2>
            <p className="mt-2.5 text-xs font-normal leading-relaxed text-indigo-100/90 sm:text-sm">
              Nilai tryout adalah peta diagnostik, bukan hasil akhir. Tingkatkan kemampuanmu secara
              terarah dengan menuntaskan soal salah dan melatih materi prioritas.
            </p>
          </div>
          <Link
            href={dashboard.nextAction.href}
            className="st-focus relative z-10 mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-indigo-950 shadow-md transition-all duration-200 hover:bg-indigo-50 active:scale-[0.98]"
          >
            <span>{dashboard.nextAction.label}</span>
            <ArrowRight size={15} />
          </Link>
        </aside>
      </section>
    </div>
  )
}

function MetricCard({
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
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-2xs ${tone}`}
          >
            {icon}
          </div>
        </div>
        <div className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {value}
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900">{label}</div>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </article>
  )
}

function StatTile({
  label,
  value,
  tone = 'bg-slate-50/80 border-slate-100 text-slate-700',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className={`rounded-2xl border p-2.5 sm:p-3 text-center transition-colors ${tone}`}>
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75">
        {label}
      </span>
      <p className="mt-1 text-sm sm:text-base font-black text-slate-950">{value}</p>
    </div>
  )
}
