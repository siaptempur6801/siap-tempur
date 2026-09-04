import Link from 'next/link'
import type { Metadata } from 'next'
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    CheckCircle2,
    Clock3,
    GraduationCap,
    History,
    ListChecks,
    School,
    Target,
    Ticket,
} from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import SeoNavbarClient from '@/components/SeoNavbarClient'

export const metadata: Metadata = {
    title: 'Persiapan TKA SD, SMP, SMA - SiapTempur',
    description: 'Persiapan TKA untuk jenjang SD, SMP, dan SMA dengan latihan, tryout, pembahasan, analisis hasil, serta remedial dalam satu akun SiapTempur.',
    alternates: { canonical: '/tka' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDate(value: unknown) {
    if (!value) return 'Belum tersedia'
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return 'Belum tersedia'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    }).format(date)
}

function attemptStatus(status: unknown) {
    const value = String(status ?? '').toLowerCase()
    if (value === 'in_progress') return 'Sedang dikerjakan'
    if (value === 'completed' || value === 'submitted') return 'Selesai'
    return value || 'Tersimpan'
}

export default async function TkaHomePage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <PublicTkaLanding />

    const [{ data: profile }, { data: program }] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, display_name')
            .eq('id', user.id)
            .maybeSingle(),
        supabase
            .from('programs')
            .select('id')
            .eq('code', 'TKA')
            .maybeSingle(),
    ])

    let activeTrack = false
    let recentAttempts: Array<Record<string, unknown>> = []
    let examById = new Map<string, { title: string }>()
    let hasTempurPass = false

    if (program?.id) {
        const { data: track } = await supabase
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', 'SMP')
            .maybeSingle()

        if (track?.id) {
            const [{ data: userTrack }, { data: exams }] = await Promise.all([
                supabase
                    .from('user_tracks')
                    .select('status')
                    .eq('user_id', user.id)
                    .eq('track_id', track.id)
                    .maybeSingle(),
                supabase
                    .from('exams')
                    .select('id, title, required_feature_id')
                    .eq('track_id', track.id)
                    .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED']),
            ])

            activeTrack = String(userTrack?.status ?? '').toLowerCase() === 'active'
            examById = new Map((exams ?? []).map((exam) => [String(exam.id), {
                title: String(exam.title),
            }]))

            const examIds = (exams ?? []).map((exam) => String(exam.id))
            const featureIds = Array.from(new Set((exams ?? [])
                .map((exam) => exam.required_feature_id ? String(exam.required_feature_id) : '')
                .filter(Boolean)))

            const [{ data: attempts }, { data: entitlements }] = await Promise.all([
                examIds.length > 0
                    ? supabase
                        .from('exam_attempts')
                        .select('id, exam_id, attempt_number, status, started_at, submitted_at, updated_at, total_score, percentage')
                        .eq('user_id', user.id)
                        .in('exam_id', examIds)
                        .order('updated_at', { ascending: false })
                        .limit(8)
                    : Promise.resolve({ data: [] }),
                featureIds.length > 0
                    ? supabase
                        .from('entitlements')
                        .select('feature_id, status')
                        .eq('user_id', user.id)
                        .in('feature_id', featureIds)
                        .in('status', ['active', 'ACTIVE'])
                    : Promise.resolve({ data: [] }),
            ])

            recentAttempts = (attempts ?? []) as Array<Record<string, unknown>>
            hasTempurPass = (entitlements ?? []).length > 0
        }
    }

    const displayName = profile?.full_name || profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Pejuang'
    const activeAttempt = recentAttempts.find((item) => String(item.status ?? '').toLowerCase() === 'in_progress') ?? null
    const latestCompleted = recentAttempts.find((item) => ['completed', 'submitted'].includes(String(item.status ?? '').toLowerCase())) ?? null
    const latestExam = latestCompleted ? examById.get(String(latestCompleted.exam_id)) : null
    const latestScore = latestCompleted?.percentage !== null && latestCompleted?.percentage !== undefined
        ? `${Number(latestCompleted.percentage).toFixed(0)}%`
        : latestCompleted
            ? Number(latestCompleted.total_score ?? 0).toFixed(0)
            : '—'

    const recommendation = activeAttempt
        ? {
            href: `/tka/smp/tryout/${activeAttempt.id}`,
            title: 'Lanjutkan tryout yang belum selesai',
            description: 'Selesaikan sesi yang sedang berjalan agar perkembangan belajarmu tetap utuh.',
            action: 'Lanjutkan sekarang',
        }
        : latestCompleted
            ? {
                href: '/tka/smp/wrong-questions',
                title: 'Perbaiki hasil tryout terakhirmu',
                description: 'Ulangi soal yang belum dikuasai sebelum masuk ke sesi berikutnya.',
                action: 'Perbaiki sekarang',
            }
            : {
                href: '/tka/smp#tka-tryout',
                title: 'Mulai dari Mini Tryout',
                description: 'Ambil satu mata pelajaran untuk mendapatkan gambaran awal kemampuanmu.',
                action: 'Mulai sekarang',
            }

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div data-testid="tka-unified-dashboard" className="mx-auto max-w-6xl space-y-7 md:space-y-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">Halo, {displayName} 👋</p>
                        <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-slate-950 md:text-4xl">
                            Persiapan TKA kamu ada di sini.
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">
                            Satu lingkungan belajar untuk perjalanan TKA dari SD, SMP, hingga SMA.
                        </p>
                    </div>
                    <Link href="/cpns/dashboard" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 md:self-auto">
                        Dashboard CPNS <ArrowRight size={16} />
                    </Link>
                </header>

                <section aria-labelledby="level-journey" className="space-y-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Perjalanan belajar</p>
                        <h2 id="level-journey" className="mt-1 text-xl font-black text-slate-950 md:text-2xl">SD sampai SMA, tetap satu dashboard.</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <LevelJourneyCard level="SD" title="TKA SD" description="Bangun fondasi kemampuan sejak jenjang dasar." href="/tka/sd" state="Segera hadir" icon={<School size={21} />} tone="amber" />
                        <LevelJourneyCard
                            level="SMP"
                            title="TKA SMP"
                            description="Mini Tryout, Full Tryout, pembahasan, remedial, dan progress tersedia di sini."
                            href="/tka/smp"
                            state={activeTrack ? 'Sedang berjalan' : 'Tersedia sekarang'}
                            icon={<BookOpenCheck size={21} />}
                            tone="indigo"
                            active
                        />
                        <LevelJourneyCard level="SMA" title="TKA SMA" description="Lanjutkan perjalanan belajar saat masuk jenjang SMA." href="/tka/sma" state="Segera hadir" icon={<GraduationCap size={21} />} tone="violet" />
                    </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[1.65fr_0.85fr]" aria-label="Rekomendasi dan akses TKA">
                    <article className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-6 text-white shadow-[0_22px_55px_rgba(79,70,229,0.22)] md:p-8">
                        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/10 blur-sm" />
                        <div className="pointer-events-none absolute bottom-[-5rem] right-24 h-44 w-44 rounded-full bg-cyan-300/15 blur-2xl" />
                        <div className="relative max-w-2xl">
                            <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-50 ring-1 ring-white/15">Langkah berikutnya</span>
                            <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] md:text-3xl">{recommendation.title}</h2>
                            <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-indigo-100 md:text-base">{recommendation.description}</p>
                            <Link href={recommendation.href} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-950/15 transition hover:bg-indigo-50">
                                {recommendation.action} <ArrowRight size={17} />
                            </Link>
                        </div>
                    </article>

                    <article className="rounded-[1.5rem] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Tempur Pass</p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950">{hasTempurPass ? 'Akses aktif' : 'Akses TKA'}</h2>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Ticket size={21} /></div>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
                            {hasTempurPass ? 'Gunakan Mini & Full Tryout serta fitur belajar yang termasuk dalam paket aktifmu.' : 'Pelajari paket akses untuk membuka pengalaman belajar TKA yang lebih lengkap.'}
                        </p>
                        <Link href="/tka/smp#tempur-pass" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-black text-emerald-700 hover:underline">
                            {hasTempurPass ? 'Kelola akses' : 'Lihat Tempur Pass'} <ArrowRight size={15} />
                        </Link>
                    </article>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <SummaryCard label="Skor terbaru" value={latestScore} description={latestExam?.title ?? 'Belum ada hasil tryout'} icon={<BarChart3 size={19} />} tone="indigo" href={latestCompleted ? `/tka/smp/tryout/${latestCompleted.id}/result` : '/tka/smp#tka-tryout'} />
                    <SummaryCard label="Aktivitas TKA SMP" value={`${recentAttempts.length}`} description="Pengerjaan terbaru yang tersimpan" icon={<History size={19} />} tone="blue" href="/tka/smp" />
                    <SummaryCard label="Jalur belajar" value={activeTrack ? 'Aktif' : 'Belum aktif'} description="TKA SMP menjadi jenjang aktif saat ini" icon={activeTrack ? <CheckCircle2 size={19} /> : <Target size={19} />} tone="emerald" href="/tka/smp" />
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)] md:p-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Akses cepat</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">Mau belajar apa sekarang?</h2>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <QuickAction href="/tka/smp#tka-tryout" label="Mini & Full Tryout" icon={<ListChecks size={20} />} />
                        <QuickAction href="/tka/smp/progress" label="Perkembangan" icon={<BarChart3 size={20} />} />
                        <QuickAction href="/tka/smp/wrong-questions" label="Soal Salah" icon={<Target size={20} />} />
                        <QuickAction href="/tka/smp#tempur-pass" label="Tempur Pass" icon={<Ticket size={20} />} />
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)] md:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Riwayat</p>
                            <h2 className="mt-1 text-xl font-black text-slate-950">Tryout terbaru</h2>
                        </div>
                        <Link href="/tka/smp" className="text-sm font-black text-indigo-600 hover:underline">Lihat semua</Link>
                    </div>
                    <div className="mt-4 divide-y divide-slate-100">
                        {recentAttempts.length > 0 ? recentAttempts.slice(0, 4).map((attempt) => {
                            const exam = examById.get(String(attempt.exam_id))
                            const completed = ['completed', 'submitted'].includes(String(attempt.status ?? '').toLowerCase())
                            return (
                                <Link key={String(attempt.id)} href={completed ? `/tka/smp/tryout/${attempt.id}/result` : `/tka/smp/tryout/${attempt.id}`} className="group flex items-center gap-4 py-4 first:pt-1 last:pb-1">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><BookOpenCheck size={18} /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black text-slate-900">{exam?.title ?? 'Tryout TKA SMP'}</p>
                                        <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(attempt.submitted_at || attempt.updated_at || attempt.started_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-700">{completed && attempt.percentage !== null && attempt.percentage !== undefined ? `${Number(attempt.percentage).toFixed(0)}%` : attemptStatus(attempt.status)}</p>
                                        <span className="text-xs font-bold text-indigo-600 opacity-0 transition group-hover:opacity-100">Buka →</span>
                                    </div>
                                </Link>
                            )
                        }) : (
                            <div className="py-8 text-center">
                                <Clock3 size={24} className="mx-auto text-slate-300" />
                                <p className="mt-3 text-sm font-bold text-slate-500">Belum ada riwayat tryout.</p>
                                <Link href="/tka/smp#tka-tryout" className="mt-2 inline-flex text-sm font-black text-indigo-600 hover:underline">Mulai Mini Tryout</Link>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}

function LevelJourneyCard({
    level,
    title,
    description,
    href,
    state,
    icon,
    tone,
    active = false,
}: {
    level: string
    title: string
    description: string
    href: string
    state: string
    icon: React.ReactNode
    tone: 'amber' | 'indigo' | 'violet'
    active?: boolean
}) {
    const toneClass = tone === 'indigo'
        ? 'bg-indigo-50 text-indigo-600'
        : tone === 'violet'
            ? 'bg-violet-50 text-violet-600'
            : 'bg-amber-50 text-amber-600'
    return (
        <Link href={href} className={`group rounded-[1.4rem] border bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.075)] ${active ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{state}</span>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Jenjang {level}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-2 min-h-12 text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-black text-indigo-600">{active ? 'Lanjutkan belajar' : 'Lihat jenjang'} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
        </Link>
    )
}

function SummaryCard({ label, value, description, icon, tone, href }: { label: string; value: string; description: string; icon: React.ReactNode; tone: 'indigo' | 'blue' | 'emerald'; href: string }) {
    const toneClass = tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'
    return (
        <Link href={href} className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)] transition hover:border-indigo-200">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
            </div>
            <p className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950">{value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
        </Link>
    )
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <Link href={href} className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center transition hover:border-indigo-200 hover:bg-indigo-50/60">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm transition group-hover:scale-105">{icon}</span>
            <span className="mt-3 text-xs font-black leading-snug text-slate-700">{label}</span>
        </Link>
    )
}

function PublicTkaLanding() {
    return (
        <main data-experience-mode="marketing" data-program="tka" className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <SeoNavbarClient isAuthenticated={false} programLabel="TKA" />

            <section className="relative px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-36">
                <div className="pointer-events-none absolute -left-24 top-40 h-52 w-52 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-16 top-24 h-56 w-48 rotate-12 rounded-[2rem] border-2 border-dashed border-emerald-300 bg-[var(--st-green-soft)]" aria-hidden="true" />

                <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
                    <div>
                        <div className="st-kicker"><GraduationCap size={15} /> TKA SD · SMP · SMA</div>
                        <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Persiapan TKA untuk <span className="text-blue-600">setiap jenjang belajar.</span>
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            Mulai dari SD, lanjut ke SMP, hingga SMA dalam satu lingkungan belajar. Kerjakan latihan dan tryout, pahami hasilnya, lalu perbaiki bagian yang masih lemah.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href="/register?returnTo=%2Ftka" className="st-button inline-flex min-h-12 items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
                                Mulai persiapan TKA <ArrowRight size={18} />
                            </Link>
                            <Link href="#jenjang-tka" className="st-focus inline-flex min-h-12 items-center rounded-xl px-4 py-3 font-black text-gray-700 hover:bg-white">
                                Pilih jenjang
                            </Link>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-gray-600">
                            {['Satu akun lintas jenjang', 'Progres belajar tersimpan', 'Belajar dari hasil'].map((item) => (
                                <span key={item} className="inline-flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-600" /> {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="st-card-lg bg-white p-6 md:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Siklus belajar SiapTempur</p>
                        <h2 className="st-heading-display mt-3 text-4xl md:text-5xl">Ukur, pahami, lalu perbaiki.</h2>
                        <div className="mt-7 divide-y-2 divide-dashed divide-gray-200">
                            {[
                                { number: '01', title: 'Pilih jenjang', text: 'Masuk ke jalur TKA SD, SMP, atau SMA.' },
                                { number: '02', title: 'Kerjakan dan ukur', text: 'Gunakan latihan atau tryout sesuai tujuanmu.' },
                                { number: '03', title: 'Belajar dari hasil', text: 'Buka pembahasan dan ulangi bagian yang perlu diperkuat.' },
                            ].map((step) => (
                                <div key={step.number} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                    <span className="font-handwriting text-3xl font-black text-blue-600">{step.number}</span>
                                    <div>
                                        <p className="font-black">{step.title}</p>
                                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{step.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="jenjang-tka" className="scroll-mt-28 border-y-2 border-[var(--st-ink)] bg-white px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Pilih jenjang</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Satu fondasi belajar, tiga tahap perjalanan.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Setiap jenjang memiliki jalur belajar tersendiri agar materi, hasil, dan progres tetap sesuai kebutuhanmu.</p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        <PublicLevelCard href="/tka/sd" level="SD" title="TKA SD" description="Bangun fondasi literasi dan numerasi melalui latihan yang terarah sejak jenjang dasar." icon={<School size={24} />} tone="amber" />
                        <PublicLevelCard href="/tka/smp" level="SMP" title="TKA SMP" description="Perkuat Bahasa Indonesia dan Matematika lewat latihan, tryout, serta pembahasan." icon={<BookOpenCheck size={24} />} tone="blue" />
                        <PublicLevelCard href="/tka/sma" level="SMA" title="TKA SMA" description="Siapkan kemampuan akademik sesuai jenjang dan pilihan mata pelajaran yang tersedia." icon={<GraduationCap size={24} />} tone="green" />
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] border-2 border-[var(--st-ink)] bg-blue-600 px-6 py-10 text-white shadow-[6px_6px_0_var(--st-ink)] md:grid-cols-[1fr_auto] md:px-10 md:py-12">
                    <div>
                        <h2 className="font-handwriting text-4xl font-black leading-tight md:text-5xl">Mulai dari jenjangmu hari ini.</h2>
                        <p className="mt-3 max-w-2xl font-semibold leading-relaxed text-blue-100">Satu akun menyimpan perjalanan belajar TKA dari SD, SMP, hingga SMA.</p>
                    </div>
                    <Link href="/register?returnTo=%2Ftka" className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black text-gray-900">
                        Buat akun gratis <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </main>
    )
}

function PublicLevelCard({
    href,
    level,
    title,
    description,
    icon,
    tone,
}: {
    href: string
    level: string
    title: string
    description: string
    icon: React.ReactNode
    tone: 'amber' | 'blue' | 'green'
}) {
    const toneClass = tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'green'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-blue-100 text-blue-700'

    return (
        <Link href={href} className="st-card-md st-focus group flex min-h-72 flex-col bg-white p-6 transition-transform hover:-translate-y-1 md:p-7">
            <div className="flex items-start justify-between gap-4">
                <span className={`flex h-13 w-13 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${toneClass}`}>{icon}</span>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">Jenjang {level}</span>
            </div>
            <h3 className="st-heading-display mt-6 text-4xl">{title}</h3>
            <p className="st-muted mt-3 flex-1 font-semibold leading-relaxed">{description}</p>
            <span className="mt-6 inline-flex items-center gap-2 font-black text-blue-700">Buka jenjang <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></span>
        </Link>
    )
}
