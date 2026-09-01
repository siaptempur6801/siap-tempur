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
    ListChecks,
    Target,
    Ticket,
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
    tiu: { label: 'TIU', icon: Brain, tone: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
    tkp: { label: 'TKP', icon: User, tone: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
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
            <header className="max-w-3xl">
                <p className="text-sm font-semibold text-blue-700">{greeting.greeting}, {data.user.name}</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl md:text-[2.75rem] md:leading-[1.08]">
                    Apa yang sebaiknya kamu kerjakan hari ini?
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                    Gunakan hasil belajarmu untuk memilih langkah berikutnya, bukan sekadar mengulang tryout.
                </p>
            </header>

            <section className="grid gap-4 lg:grid-cols-[1.7fr_0.8fr]" aria-label="Langkah berikutnya">
                <article className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-[var(--px-shadow-sm)] md:p-8">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-600" aria-hidden="true" />
                    <div className="pl-2 md:pl-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                            <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                            Langkah berikutnya
                        </div>
                        <h2 className="mt-4 max-w-2xl text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                            {recommendation.title}
                        </h2>
                        <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
                            {recommendation.description}
                        </p>
                        <TrackedLink
                            href={recommendation.href}
                            eventName="px_dashboard_action"
                            eventProperties={{ program: 'cpns', surface: 'dashboard', cta: data.activeSession ? 'resume_recommendation' : 'learning_recommendation' }}
                            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                            Kerjakan sekarang <ArrowRight size={17} />
                        </TrackedLink>
                    </div>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[var(--px-shadow-xs)]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Akses tryout</p>
                            <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">{data.user.tryoutQuota}</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-500">token tersisa</p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Ticket size={21} />
                        </div>
                    </div>
                    <TrackedLink
                        href="/cpns/dashboard/beli-paket"
                        eventName="px_dashboard_action"
                        eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'token_packages' }}
                        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Lihat pilihan token <ArrowRight size={15} />
                    </TrackedLink>
                </article>
            </section>

            <section aria-labelledby="learning-summary-title" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-blue-700">Perkembangan belajar</p>
                        <h2 id="learning-summary-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                            Ringkasan terbaru
                        </h2>
                    </div>
                    <TrackedLink
                        href="/cpns/dashboard/riwayat"
                        eventName="px_dashboard_action"
                        eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'all_results' }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Lihat semua hasil <ArrowRight size={16} />
                    </TrackedLink>
                </div>

                {data.lastExam ? (
                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.6fr]">
                        <article className="rounded-3xl bg-slate-950 p-6 text-white shadow-[var(--px-shadow-sm)]">
                            <p className="text-sm font-medium text-slate-400">Tryout terakhir · {data.lastExam.date}</p>
                            <div className="mt-3 text-5xl font-extrabold tracking-tight">{data.lastExam.total_score}</div>
                            <div className={cn(
                                'mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
                                data.lastExam.passed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-300/15 text-amber-200'
                            )}>
                                {data.lastExam.passed && <CheckCircle2 size={15} />}
                                {data.lastExam.passed ? 'Target SKD tercapai' : 'Masih ada bagian yang perlu diperkuat'}
                            </div>
                            <TrackedLink
                                href={`/cpns/dashboard/tryout/${data.lastExam.id}/result`}
                                eventName="px_dashboard_action"
                                eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'latest_result' }}
                                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-blue-300 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                            >
                                Lihat hasil dan pembahasan <ArrowRight size={15} />
                            </TrackedLink>
                        </article>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {(Object.keys(data.progress) as SectionKey[]).map((key) => {
                                const item = data.progress[key]
                                const meta = SECTION_META[key]
                                const Icon = meta.icon
                                const progressValue = Math.min(100, item.target > 0 ? (item.score / item.target) * 100 : 0)

                                return (
                                    <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)]">
                                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', meta.tone)}>
                                            <Icon size={19} />
                                        </div>
                                        <div className="mt-4 flex items-end justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{meta.label}</p>
                                                <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{item.score}</p>
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">target {item.target}</span>
                                        </div>
                                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Perkembangan ${meta.label} ${Math.round(progressValue)}%`}>
                                            <div
                                                className={cn('h-full rounded-full transition-[width]', item.passed ? 'bg-emerald-500' : meta.bar)}
                                                style={{ width: `${progressValue}%` }}
                                            />
                                        </div>
                                        <p className={cn('mt-2 text-xs font-semibold', item.passed ? 'text-emerald-700' : 'text-slate-500')}>
                                            {item.passed ? 'Target tercapai' : 'Perlu diperkuat'}
                                        </p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <article className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center md:p-10">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <BarChart3 size={24} />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-slate-950">Belum ada hasil yang bisa dianalisis</h3>
                        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
                            Selesaikan mini tryout atau full tryout pertamamu. Setelah itu, ringkasan ini akan membantu menunjukkan bagian yang perlu diperkuat.
                        </p>
                        <Link
                            href="/cpns/dashboard/mini-tryout"
                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                            Mulai mini tryout <ArrowRight size={16} />
                        </Link>
                    </article>
                )}
            </section>

            <section aria-labelledby="study-path-title" className="space-y-4">
                <div>
                    <p className="text-sm font-semibold text-blue-700">Pilih sesuai kebutuhan</p>
                    <h2 id="study-path-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                        Cara belajar yang tersedia
                    </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <LearningPathCard
                        href="/cpns/dashboard/drilling-materi"
                        icon={<BookOpen size={21} />}
                        iconClass="bg-blue-50 text-blue-700"
                        title="Latihan fokus"
                        description="Perkuat satu bagian atau materi yang masih lemah tanpa harus mengulang simulasi penuh."
                        action="Pilih materi"
                    />
                    <LearningPathCard
                        href="/cpns/dashboard/mini-tryout"
                        icon={<ListChecks size={21} />}
                        iconClass="bg-amber-50 text-amber-700"
                        title="Mini tryout"
                        description="Ukur satu bagian dalam sesi yang lebih singkat untuk mengecek perkembangan belajarmu."
                        action="Pilih mini tryout"
                    />
                    <LearningPathCard
                        href="/cpns/dashboard/tryout"
                        icon={<Target size={21} />}
                        iconClass="bg-emerald-50 text-emerald-700"
                        title="Full tryout"
                        description="Ukur kesiapan TWK, TIU, dan TKP dalam satu simulasi lengkap."
                        action="Pilih tryout"
                    />
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-[var(--px-shadow-xs)]" aria-label="Ringkasan akun">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryItem icon={<Clock3 size={18} />} value={String(data.stats.totalSessions)} label="sesi selesai" />
                    <SummaryItem icon={<BarChart3 size={18} />} value={data.stats.rank ? `#${data.stats.rank}` : '-'} label="peringkat saat ini" />
                    <SummaryItem icon={<Target size={18} />} value={bestScore === null ? '-' : String(bestScore)} label="skor terbaik" />
                    <Link
                        href="/cpns/dashboard/event"
                        className="group rounded-2xl p-4 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-white">
                            <CalendarDays size={18} />
                        </div>
                        <p className="mt-3 line-clamp-1 text-sm font-bold text-slate-950">
                            {data.nextTryout ? data.nextTryout.name : 'Lihat event tryout'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
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
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--px-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconClass)}>{icon}</div>
            <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
            <p className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-slate-600">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:text-blue-800">
                {action} <ArrowRight size={15} />
            </span>
        </Link>
    )
}

function SummaryItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="rounded-2xl p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        </div>
    )
}
