'use client'

import Link from 'next/link'
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Brain,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Flame,
    ListChecks,
    Sparkles,
    Target,
    Ticket,
    Trophy,
    User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import TrackedLink from '@/components/analytics/TrackedLink'

interface DashboardData {
    user: {
        id: string
        name: string
        streak: number
        tryoutQuota: number
    }
    stats: {
        totalSessions: number
        xp: number
        level: number
        levelName: string
        levelProgress: number
        xpToNext: number
        nextLevelName: string | null
        rank: number | null
    }
    progress: {
        twk: { score: number; target: number; passed: boolean }
        tiu: { score: number; target: number; passed: boolean }
        tkp: { score: number; target: number; passed: boolean }
    }
    lastExam: {
        id: string
        date: string
        score_twk: number
        score_tiu: number
        score_tkp: number
        total_score: number
        passed: boolean
    } | null
    bestExam: {
        id: string
        date: string
        score_twk: number
        score_tiu: number
        score_tkp: number
        total_score: number
        passed: boolean
    } | null
    nextTryout: {
        name: string
        daysLeft: number
    } | null
    activeSession: {
        mode: 'practice' | 'tryout'
        kind: 'full-tryout' | 'mini-tryout' | 'drilling-materi' | 'event'
    } | null
}

interface Props {
    data: DashboardData
    greeting: { greeting: string; message: string }
}

type SectionKey = 'twk' | 'tiu' | 'tkp'

const SECTION_META: Record<SectionKey, { label: string; icon: typeof BookOpen; tone: string; bar: string }> = {
    twk: { label: 'TWK', icon: BookOpen, tone: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
    tiu: { label: 'TIU', icon: Brain, tone: 'bg-yellow-100 text-amber-800', bar: 'bg-amber-500' },
    tkp: { label: 'TKP', icon: User, tone: 'bg-blue-100 text-blue-700', bar: 'bg-blue-600' },
}

function getWeakestSection(progress: DashboardData['progress']) {
    return (Object.keys(progress) as SectionKey[]).reduce((weakest, key) => {
        const current = progress[key]
        const weakestValue = progress[weakest]
        const currentRatio = current.target > 0 ? current.score / current.target : 1
        const weakestRatio = weakestValue.target > 0 ? weakestValue.score / weakestValue.target : 1
        return currentRatio < weakestRatio ? key : weakest
    }, 'twk' as SectionKey)
}

function getActiveSessionAction(activeSession: DashboardData['activeSession']) {
    if (!activeSession) return null

    const actions = {
        'full-tryout': {
            href: '/cpns/dashboard/tryout',
            title: 'Lanjutkan tryout',
            description: 'Sesi tryout kamu masih berjalan. Selesaikan dulu sebelum memulai latihan lain.',
        },
        'mini-tryout': {
            href: '/cpns/dashboard/mini-tryout',
            title: 'Lanjutkan mini tryout',
            description: 'Mini tryout kamu belum selesai. Lanjutkan dari sesi yang sedang berjalan.',
        },
        'drilling-materi': {
            href: '/cpns/dashboard/drilling-materi',
            title: 'Lanjutkan latihan fokus',
            description: 'Sesi latihan fokus kamu masih aktif. Lanjutkan dari bagian terakhir.',
        },
        event: {
            href: '/cpns/dashboard/event',
            title: 'Lanjutkan event',
            description: 'Kamu masih memiliki sesi event yang sedang berjalan.',
        },
    }

    return actions[activeSession.kind]
}

export default function DashboardClient({ data, greeting }: Props) {
    const weakestKey = getWeakestSection(data.progress)
    const weakest = data.progress[weakestKey]
    const weakestMeta = SECTION_META[weakestKey]
    const allTargetsReached = (Object.keys(data.progress) as SectionKey[]).every((key) => data.progress[key].passed)
    const activeSessionAction = getActiveSessionAction(data.activeSession)

    const recommendation = activeSessionAction ?? (
        data.lastExam
            ? allTargetsReached
                ? {
                    href: '/cpns/dashboard/mini-tryout',
                    title: 'Jaga konsistensi dengan mini tryout',
                    description: 'Target TWK, TIU, dan TKP sudah tercapai pada ringkasanmu. Uji lagi satu bagian untuk menjaga ritme belajar.',
                }
                : {
                    href: '/cpns/dashboard/drilling-materi',
                    title: `Perkuat ${weakestMeta.label} lebih dulu`,
                    description: `Skor ${weakestMeta.label} kamu masih ${weakest.score} dari target ${weakest.target}. Fokuskan latihan di bagian ini sebelum full tryout berikutnya.`,
                }
            : {
                href: '/cpns/dashboard/mini-tryout',
                title: 'Mulai dari mini tryout',
                description: 'Ambil satu bagian terlebih dahulu agar kamu punya hasil awal untuk menentukan fokus belajar berikutnya.',
            }
    )

    const bestScore = data.bestExam?.total_score ?? null

    return (
        <div data-testid="cpns-dashboard-ready" className="space-y-8 md:space-y-10">
            <header className="max-w-4xl">
                <span className="st-kicker">{greeting.greeting}, {data.user.name}</span>
                <h1 className="st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl">
                    Apa yang sebaiknya kamu kerjakan hari ini?
                </h1>
                <p className="st-muted mt-4 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
                    Gunakan hasil belajarmu untuk memilih langkah berikutnya, bukan sekadar mengulang tryout.
                </p>
            </header>

            <section className="grid gap-5 lg:grid-cols-[1.7fr_0.8fr]" aria-label="Langkah berikutnya">
                <article className="st-card-lg relative overflow-hidden p-6 md:p-8">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                    <div className="relative">
                        <span className="st-pill bg-yellow-100">Langkah berikutnya</span>
                        <h2 className="st-heading mt-5 max-w-2xl text-2xl md:text-3xl">
                            {recommendation.title}
                        </h2>
                        <p className="st-muted mt-3 max-w-2xl font-semibold leading-relaxed">
                            {recommendation.description}
                        </p>
                        <TrackedLink
                            href={recommendation.href}
                            eventName="px_dashboard_action"
                            eventProperties={{ program: 'cpns', surface: 'dashboard', cta: data.activeSession ? 'resume_recommendation' : 'learning_recommendation' }}
                            className="st-button st-focus mt-6 inline-flex min-h-11 items-center justify-center gap-2 bg-blue-600 px-5 py-3 text-sm font-black text-white"
                        >
                            Kerjakan sekarang <ArrowRight size={17} />
                        </TrackedLink>
                    </div>
                </article>

                <article className="st-card-md bg-blue-50 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Akses tryout</p>
                            <p className="mt-2 text-5xl font-black tracking-tight text-blue-700">{data.user.tryoutQuota}</p>
                            <p className="mt-1 text-sm font-bold text-slate-600">token tersisa</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-white shadow-[2px_2px_0_#111827]">
                            <Ticket size={22} />
                        </div>
                    </div>
                    <TrackedLink
                        href="/cpns/dashboard/beli-paket"
                        eventName="px_dashboard_action"
                        eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'token_packages' }}
                        className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline"
                    >
                        Lihat pilihan token <ArrowRight size={15} />
                    </TrackedLink>
                </article>
            </section>

            <section className="st-card-md overflow-hidden" aria-labelledby="gamification-title">
                <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
                    <div className="bg-slate-950 p-6 text-white md:p-7">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-yellow-300">
                            <Trophy size={17} aria-hidden="true" /> Level belajar
                        </div>
                        <div className="mt-5 flex items-end gap-3">
                            <span className="text-6xl font-black tracking-tight">{data.stats.level}</span>
                            <span className="pb-2 text-sm font-black text-slate-300">{data.stats.levelName}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-300">
                            Setiap sesi yang selesai memberi XP, dan skor yang lebih tinggi meningkatkan reward-mu.
                        </p>
                    </div>

                    <div className="p-6 md:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Perkembanganmu</p>
                                <h2 id="gamification-title" className="st-heading mt-1 text-2xl">{data.stats.xp.toLocaleString('id-ID')} XP terkumpul</h2>
                            </div>
                            <div className="flex items-center gap-2 border-2 border-slate-900 bg-orange-100 px-3 py-2 text-sm font-black text-orange-800 shadow-[2px_2px_0_#111827]">
                                <Flame size={18} aria-hidden="true" /> {data.user.streak} hari
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex flex-wrap justify-between gap-2 text-xs font-black text-slate-600">
                                <span>Level {data.stats.level}</span>
                                <span>
                                    {data.stats.nextLevelName
                                        ? `${data.stats.xpToNext.toLocaleString('id-ID')} XP menuju ${data.stats.nextLevelName}`
                                        : 'Level tertinggi tercapai'}
                                </span>
                            </div>
                            <div
                                className="mt-2 h-4 overflow-hidden border-2 border-slate-900 bg-slate-100"
                                role="progressbar"
                                aria-label="Progres menuju level berikutnya"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={data.stats.levelProgress}
                            >
                                <div className="h-full bg-blue-600" style={{ width: `${data.stats.levelProgress}%` }} />
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Sparkles size={15} className="text-blue-600" aria-hidden="true" />
                                {data.user.streak > 0
                                    ? 'Selesaikan latihan setiap hari agar streak tetap berjalan.'
                                    : 'Selesaikan satu latihan hari ini untuk memulai streak.'}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section aria-labelledby="learning-summary-title" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Perkembangan belajar</p>
                        <h2 id="learning-summary-title" className="st-heading-display mt-1 text-3xl md:text-4xl">
                            Ringkasan terbaru
                        </h2>
                    </div>
                    <TrackedLink
                        href="/cpns/dashboard/riwayat"
                        eventName="px_dashboard_action"
                        eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'all_results' }}
                        className="st-focus inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline"
                    >
                        Lihat semua hasil <ArrowRight size={16} />
                    </TrackedLink>
                </div>

                {data.lastExam ? (
                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.6fr]">
                        <article className="st-card-md !bg-slate-950 p-6 text-white">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Tryout terakhir · {data.lastExam.date}</p>
                            <div className="mt-3 text-5xl font-black tracking-tight">{data.lastExam.total_score}</div>
                            <div className={cn(
                                'mt-4 inline-flex items-center gap-2 border-2 border-white px-3 py-1.5 text-xs font-black',
                                data.lastExam.passed ? 'bg-emerald-300 text-slate-950' : 'bg-yellow-200 text-slate-950'
                            )}>
                                {data.lastExam.passed && <CheckCircle2 size={15} />}
                                {data.lastExam.passed ? 'Target SKD tercapai' : 'Masih ada bagian yang perlu diperkuat'}
                            </div>
                            <TrackedLink
                                href={`/cpns/dashboard/tryout/${data.lastExam.id}/result`}
                                eventName="px_dashboard_action"
                                eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'latest_result' }}
                                className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-200 hover:text-white hover:underline"
                            >
                                Lihat hasil dan pembahasan <ArrowRight size={15} />
                            </TrackedLink>
                        </article>

                        <div className="grid gap-4 sm:grid-cols-3">
                            {(Object.keys(data.progress) as SectionKey[]).map((key) => {
                                const item = data.progress[key]
                                const meta = SECTION_META[key]
                                const Icon = meta.icon
                                const progressValue = Math.min(100, item.target > 0 ? (item.score / item.target) * 100 : 0)

                                return (
                                    <article key={key} className="st-card p-5">
                                        <div className={cn('flex h-10 w-10 items-center justify-center border-2 border-slate-900', meta.tone)}>
                                            <Icon size={19} />
                                        </div>
                                        <div className="mt-4 flex items-end justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{meta.label}</p>
                                                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{item.score}</p>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">target {item.target}</span>
                                        </div>
                                        <div className="mt-4 h-3 overflow-hidden border-2 border-slate-900 bg-slate-100" aria-label={`Perkembangan ${meta.label} ${Math.round(progressValue)}%`}>
                                            <div
                                                className={cn('h-full transition-[width]', item.passed ? 'bg-emerald-400' : meta.bar)}
                                                style={{ width: `${progressValue}%` }}
                                            />
                                        </div>
                                        <p className={cn('mt-2 text-xs font-black', item.passed ? 'text-emerald-700' : 'text-slate-600')}>
                                            {item.passed ? 'Target tercapai' : 'Perlu diperkuat'}
                                        </p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <article className="st-card-md p-8 text-center md:p-10">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-yellow-100 shadow-[2px_2px_0_#111827]">
                            <BarChart3 size={24} />
                        </div>
                        <h3 className="st-heading mt-4 text-xl">Belum ada hasil yang bisa dianalisis</h3>
                        <p className="st-muted mx-auto mt-2 max-w-lg text-sm font-semibold leading-relaxed">
                            Selesaikan mini tryout atau full tryout pertamamu. Setelah itu, ringkasan ini akan membantu menunjukkan bagian yang perlu diperkuat.
                        </p>
                        <Link
                            href="/cpns/dashboard/mini-tryout"
                            className="st-button st-focus mt-5 inline-flex min-h-11 items-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
                        >
                            Mulai mini tryout <ArrowRight size={16} />
                        </Link>
                    </article>
                )}
            </section>

            <section aria-labelledby="study-path-title" className="space-y-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pilih sesuai kebutuhan</p>
                    <h2 id="study-path-title" className="st-heading-display mt-1 text-3xl md:text-4xl">
                        Cara belajar yang tersedia
                    </h2>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                    <LearningPathCard
                        href="/cpns/dashboard/drilling-materi"
                        icon={<BookOpen size={21} />}
                        iconClass="bg-blue-100 text-blue-700"
                        title="Latihan fokus"
                        description="Perkuat satu bagian atau materi yang masih lemah tanpa harus mengulang simulasi penuh."
                        action="Pilih materi"
                    />
                    <LearningPathCard
                        href="/cpns/dashboard/mini-tryout"
                        icon={<ListChecks size={21} />}
                        iconClass="bg-yellow-100 text-amber-800"
                        title="Mini tryout"
                        description="Ukur satu bagian dalam sesi yang lebih singkat untuk mengecek perkembangan belajarmu."
                        action="Pilih mini tryout"
                    />
                    <LearningPathCard
                        href="/cpns/dashboard/tryout"
                        icon={<Target size={21} />}
                        iconClass="bg-emerald-100 text-emerald-700"
                        title="Full tryout"
                        description="Ukur kesiapan TWK, TIU, dan TKP dalam satu simulasi lengkap."
                        action="Pilih tryout"
                    />
                </div>
            </section>

            <section className="st-card p-2" aria-label="Ringkasan akun">
                <div className="grid divide-y-2 divide-slate-900 sm:grid-cols-2 sm:divide-x-2 sm:divide-y-0 lg:grid-cols-4">
                    <SummaryItem icon={<Clock3 size={18} />} value={String(data.stats.totalSessions)} label="sesi selesai" />
                    <SummaryItem icon={<BarChart3 size={18} />} value={data.stats.rank ? `#${data.stats.rank}` : '-'} label="peringkat saat ini" />
                    <SummaryItem icon={<Target size={18} />} value={bestScore === null ? '-' : String(bestScore)} label="skor terbaik" />
                    <Link
                        href="/cpns/dashboard/event"
                        className="st-focus group p-4 transition-colors hover:bg-blue-50"
                    >
                        <div className="flex h-9 w-9 items-center justify-center border-2 border-slate-900 bg-blue-100 text-blue-700">
                            <CalendarDays size={18} />
                        </div>
                        <p className="mt-3 line-clamp-1 text-sm font-black text-slate-950">
                            {data.nextTryout ? data.nextTryout.name : 'Lihat event tryout'}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            {data.nextTryout ? (data.nextTryout.daysLeft <= 0 ? 'Jadwal tersedia sekarang' : `${data.nextTryout.daysLeft} hari lagi`) : 'Cek jadwal terbaru'}
                        </p>
                    </Link>
                </div>
            </section>
        </div>
    )
}

function LearningPathCard({
    href,
    icon,
    iconClass,
    title,
    description,
    action,
}: {
    href: string
    icon: React.ReactNode
    iconClass: string
    title: string
    description: string
    action: string
}) {
    return (
        <Link
            href={href}
            className="st-card st-focus group p-5 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
            <div className={cn('flex h-10 w-10 items-center justify-center border-2 border-slate-900', iconClass)}>{icon}</div>
            <h3 className="st-heading mt-4 text-xl">{title}</h3>
            <p className="st-muted mt-2 min-h-[3.5rem] text-sm font-semibold leading-relaxed">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-blue-700 group-hover:underline">
                {action} <ArrowRight size={15} />
            </span>
        </Link>
    )
}

function SummaryItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="p-4">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-slate-900 bg-slate-100 text-slate-700">{icon}</div>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">{label}</p>
        </div>
    )
}
