import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Compass,
  Dumbbell,
  History,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react'
import { tkaLevelPath, type TkaLevel } from '@/src/tka/context'

/**
 * Konten halaman **Pilih Jalur khusus TKA**.
 *
 * Fokus ke jenjang yang sedang dibuka: memilih jalur latihan (diagnostik → fokus → mini tryout →
 * full tryout) dan status Tempur Pass jenjang tersebut. Berbeda dari halaman
 * CPNS yang berfokus pada subtes SKD.
 */
const LADDER = [
  {
    path: '/diagnostic',
    title: 'Tes diagnostik',
    description: 'Pemetaan awal untuk melihat bagian yang sudah kuat dan yang perlu dikejar.',
    icon: BrainCircuit,
  },
  {
    path: '/focus',
    title: 'Latihan fokus',
    description: 'Latihan terarah per materi, termasuk mengulang soal yang pernah salah.',
    icon: Dumbbell,
  },
  {
    path: '/mini-tryout',
    title: 'Mini tryout',
    description: 'Sesi singkat per mata pelajaran untuk mengukur kesiapan.',
    icon: Timer,
  },
  {
    path: '/tryout',
    title: 'Full tryout',
    description: 'Simulasi lengkap sesuai komposisi ujian jenjang ini.',
    icon: ListChecks,
  },
] as const

const EVALUATION = [
  { path: '/riwayat', title: 'Riwayat pengerjaan', icon: History },
  { path: '/wrong-questions', title: 'Bank soal salah', icon: BookOpenCheck },
  { path: '/progress', title: 'Perkembangan belajar', icon: BarChart3 },
] as const

export default function TkaPilihJalurContent({
  level,
  hasActivePass,
}: {
  level: TkaLevel
  hasActivePass: boolean
}) {
  const base = tkaLevelPath(level)
  const availableSteps =
    level === 'SMP'
      ? LADDER
      : LADDER.filter((step) => step.path === '/mini-tryout' || step.path === '/tryout')
  const availableEvaluations =
    level === 'SMP' ? EVALUATION : EVALUATION.filter((item) => item.path === '/riwayat')

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-border-strong bg-white p-5 sm:p-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue-50)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700 ring-1 ring-blue-200/70">
          <Compass size={14} /> Pilih jalur TKA {level}
        </p>
        <h1 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          Tentukan langkah belajar TKA {level} berikutnya
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
          Materi dan tryout mengikuti jenjang {level}. Pilih langkah belajar yang ingin kamu
          lanjutkan.
        </p>
      </header>

      <section aria-labelledby="jalur-latihan" className="space-y-3">
        <div>
          <h2 id="jalur-latihan" className="text-base font-black tracking-tight text-slate-950">
            Jalur latihan TKA {level}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {level === 'SMP'
              ? 'Urutan yang disarankan: ukur dulu, latih yang lemah, lalu uji dengan tryout.'
              : `Lihat status evaluasi TKA ${level}, lalu tinjau hasil yang sudah tersimpan di riwayat.`}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {availableSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.path}>
                <Link
                  href={`${base}${step.path}`}
                  className="st-focus group flex h-full flex-col rounded-2xl border border-border-strong bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-md"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] text-slate-600">
                      {index + 1}
                    </span>
                    Langkah
                  </span>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-black text-slate-950 group-hover:text-blue-700">
                    <Icon size={17} className="text-blue-700" />
                    {level === 'SMP'
                      ? step.title
                      : step.path === '/mini-tryout'
                        ? 'Status Mini Tryout'
                        : 'Status Full Tryout'}
                  </span>
                  <span className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">
                    {level === 'SMP'
                      ? step.description
                      : `Lihat kesiapan alur ${step.path === '/mini-tryout' ? 'mini tryout' : 'full tryout'} TKA ${level}.`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="evaluasi-tka" className="space-y-3">
        <div>
          <h2 id="evaluasi-tka" className="text-base font-black tracking-tight text-slate-950">
            Evaluasi hasil
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Pakai data pengerjaanmu untuk memutuskan langkah berikutnya.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {availableEvaluations.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={`${base}${item.path}`}
                className="st-focus group flex items-center justify-between gap-3 rounded-2xl border border-border-strong bg-white p-4 shadow-xs transition hover:border-slate-600 hover:shadow-md"
              >
                <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950 group-hover:text-blue-700">
                  <Icon size={17} className="text-blue-700" /> {item.title}
                </span>
                <ArrowRight
                  size={15}
                  className="text-slate-600 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            )
          })}
        </div>
      </section>

      <section
        aria-labelledby="akses-tka"
        className="rounded-2xl border border-border-strong bg-white p-5"
      >
        <h2 id="akses-tka" className="text-base font-black tracking-tight text-slate-950">
          {level === 'SMP' ? `Akses Tempur Pass TKA ${level}` : `Status akses TKA ${level}`}
        </h2>
        {hasActivePass ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
            <ShieldCheck size={16} />
            {level === 'SMP'
              ? `Tempur Pass TKA ${level} aktif — mini tryout dan full tryout tanpa hitung token.`
              : `Tempur Pass TKA ${level} aktif — alur pengerjaan tryout jenjang ini sedang disiapkan.`}
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-slate-600">
            {level === 'SMP'
              ? `Pass TKA dihitung per jenjang. Pass untuk jenjang lain tidak berlaku di ${level}.`
              : `Pembelian Tempur Pass TKA ${level} belum tersedia karena alur Mini Tryout dan Full Tryout masih disiapkan.`}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`${base}/pass`}
            className={`st-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${level === 'SMP' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-border-strong bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Sparkles size={15} />{' '}
            {hasActivePass
              ? `Kelola Tempur Pass ${level}`
              : level === 'SMP'
                ? `Lihat Tempur Pass ${level}`
                : `Lihat status akses ${level}`}
          </Link>
          <Link
            href="/cpns/dashboard/pilih-jalur"
            className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            Buka jalur CPNS
          </Link>
        </div>
      </section>
    </div>
  )
}
