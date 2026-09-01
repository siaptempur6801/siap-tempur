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

const SECTION_META: Record<SectionKey, { label: string; icon: typeof BookOpen; tone: string }> = {
    twk: { label: 'TWK', icon: BookOpen, tone: 'bg-red-50 text-red-700 border-red-200' },
    tiu: { label: 'TIU', icon: Brain, tone: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
    tkp: { label: 'TKP', icon: User, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
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
        <div className="space-y-8 font-body">
            <header className="max-w-3xl">
                <p className="text-sm font-bold text-blue-700">{greeting.greeting}, {data.user.name}</p>
                <h1 className="mt-2 font-handwriting text-4xl font-black leading-tight text-gray-900 md:text-5xl">
                    Apa yang sebaiknya kamu kerjakan hari ini?
                </h1>
                <p className="mt-3 text-base font-medium leading-relaxed text-gray-600 md:text-lg">
                    Gunakan hasil belajarmu untuk memilih langkah berikutnya, bukan sekadar mengulang tryout.
                </p>
            </header>

            <section className="grid gap-5 lg:grid-cols-[1.65fr_0.85fr]">
                <article className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] md:p-8">
                    <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-100" aria-hidden="true" />
                    <div className="relative">
                        <span className="inline-flex border-2 border-gray-900 bg-yellow-100 px-3 py-1 text-xs font-black uppercase tracking-wide">
                            Rekomendasi hari ini
                        </span>
                        <h2 className="mt-5 max-w-2xl font-handwriting text-3xl font-black text-gray-900 md:text-4xl">
                            {recommendation.title}
                        </h2>
                        <p className="mt-3 max-w-2xl font-medium leading-relaxed text-gray-600">
                            {recommendation.description}
                        </p>
                        <TrackedLink
                            href={recommendation.href}
                            eventName="px_dashboard_action"
                            eventProperties={{ program: 'cpns', surface: 'dashboard', cta: data.activeSession ? 'resume_recommendation' : 'learning_recommendation' }}
                            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 border-2 border-gray-900 bg-blue-600 px-5 py-3 font-black text-white shadow-[4px_4px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                            Kerjakan sekarang <ArrowRight size={18} />
                        </TrackedLink>
                    </div>
                </article>

                <article className="border-2 border-gray-900 bg-blue-50 p-6 shadow-[5px_5px_0_0_#111]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-gray-500">Akses tryout</p>
                            <p className="mt-1 text-4xl font-black text-blue-700">{data.user.tryoutQuota}</p>
                            <p className="text-sm font-bold text-gray-600">token tersisa</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-white">
                            <Ticket size={24} />
                        </div>
                    </div>
                    <TrackedLink
                        href="/cpns/dashboard/beli-paket"
                        eventName="px_dashboard_action"
                        eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'token_packages' }}
                        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Lihat pilihan token <ArrowRight size={15} />
                    </TrackedLink>
                </article>
            </section>

            <section aria-labelledby="learning-summary-title" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Perkembangan belajar</p>
                        <h2 id="learning-summary-title" className="mt-1 font-handwriting text-3xl font-black text-gray-900">Ringkasan terbaru</h2>
                    </div>
                    <TrackedLink
                        href="/cpns/dashboard/riwayat"
                        eventName="px_dashboard_action"
                        eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'all_results' }}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Lihat semua hasil <ArrowRight size={16} />
                    </TrackedLink>
                </div>

                {data.lastExam ? (
                    <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
                        <article className="border-2 border-gray-900 bg-gray-900 p-6 text-white shadow-[5px_5px_0_0_#93c5fd]">
                            <p className="text-xs font-black uppercase tracking-wide text-gray-400">Tryout terakhir · {data.lastExam.date}</p>
                            <div className="mt-3 text-5xl font-black">{data.lastExam.total_score}</div>
                            <div className={cn(
                                'mt-4 inline-flex items-center gap-2 border-2 border-white/40 px-3 py-1 text-sm font-black',
                                data.lastExam.passed ? 'bg-green-500 text-white' : 'bg-white text-gray-900'
                            )}>
                                {data.lastExam.passed && <CheckCircle2 size={16} />}
                                {data.lastExam.passed ? 'Target SKD tercapai' : 'Masih ada bagian yang perlu diperkuat'}
                            </div>
                            <TrackedLink
                                href={`/cpns/dashboard/tryout/${data.lastExam.id}/result`}
                                eventName="px_dashboard_action"
                                eventProperties={{ program: 'cpns', surface: 'dashboard', cta: 'latest_result' }}
                                className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-200 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                            >
                                Lihat hasil dan pembahasan <ArrowRight size={15} />
                            </TrackedLink>
                        </article>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {(Object.keys(data.progress) as SectionKey[]).map((key) => {
                                const item = data.progress[key]
                                const meta = SECTION_META[key]
                                const Icon = meta.icon
                                return (
                                    <article key={key} className="border-2 border-gray-900 bg-white p-5 shadow-[3px_3px_0_0_#111]">
                                        <div className={cn('inline-flex h-10 w-10 items-center justify-center border-2', meta.tone)}>
                                            <Icon size={20} />
                                        </div>
                                        <div className="mt-4 flex items-end justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-black uppercase text-gray-500">{meta.label}</p>
                                                <p className="text-3xl font-black text-gray-900">{item.score}</p>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">target {item.target}</span>
                                        </div>
                                        <div className="mt-3 h-2 overflow-hidden bg-gray-100">
                                            <div
                                                className={cn('h-full', item.passed ? 'bg-green-500' : 'bg-blue-500')}
                                                style={{ width: `${Math.min(100, item.target > 0 ? (item.score / item.target) * 100 : 0)}%` }}
                                            />
                                        </div>
                                        <p className={cn('mt-2 text-xs font-bold', item.passed ? 'text-green-700' : 'text-gray-600')}>
                                            {item.passed ? 'Target tercapai' : 'Perlu diperkuat'}
                                        </p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <article className="border-2 border-dashed border-gray-300 bg-white p-8 text-center">
                        <BarChart3 className="mx-auto text-gray-400" size={36} />
                        <h3 className="mt-4 text-xl font-black text-gray-900">Belum ada hasil yang bisa dianalisis</h3>
                        <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-relaxed text-gray-600">
                            Selesaikan mini tryout atau full tryout pertamamu. Setelah itu, ringkasan ini akan membantu menunjukkan bagian yang perlu diperkuat.
                        </p>
                        <Link href="/cpns/dashboard/mini-tryout" className="mt-5 inline-flex min-h-11 items-center gap-2 border-2 border-gray-900 bg-blue-600 px-4 py-2 font-black text-white">
                            Mulai mini tryout <ArrowRight size={16} />
                        </Link>
                    </article>
                )}
            </section>

            <section aria-labelledby="study-path-title" className="space-y-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Pilih sesuai kebutuhan</p>
                    <h2 id="study-path-title" className="mt-1 font-handwriting text-3xl font-black text-gray-900">Cara belajar yang tersedia</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Link href="/cpns/dashboard/drilling-materi" className="group border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        <BookOpen size={26} className="text-blue-700" />
                        <h3 className="mt-4 text-xl font-black text-gray-900">Latihan fokus</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">Perkuat satu bagian atau materi yang masih lemah tanpa harus mengulang simulasi penuh.</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-blue-700">Pilih materi <ArrowRight size={15} /></span>
                    </Link>

                    <Link href="/cpns/dashboard/mini-tryout" className="group border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        <ListChecks size={26} className="text-yellow-700" />
                        <h3 className="mt-4 text-xl font-black text-gray-900">Mini tryout</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">Ukur satu bagian dalam sesi yang lebih singkat untuk mengecek perkembangan belajarmu.</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-blue-700">Pilih mini tryout <ArrowRight size={15} /></span>
                    </Link>

                    <Link href="/cpns/dashboard/tryout" className="group border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        <Target size={26} className="text-green-700" />
                        <h3 className="mt-4 text-xl font-black text-gray-900">Full tryout</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">Ukur kesiapan TWK, TIU, dan TKP dalam satu simulasi lengkap.</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-blue-700">Pilih tryout <ArrowRight size={15} /></span>
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan akun">
                <div className="border-2 border-gray-900 bg-white p-4">
                    <Clock3 size={20} className="text-blue-700" />
                    <p className="mt-3 text-2xl font-black text-gray-900">{data.stats.totalSessions}</p>
                    <p className="text-xs font-bold text-gray-500">sesi selesai</p>
                </div>
                <div className="border-2 border-gray-900 bg-white p-4">
                    <BarChart3 size={20} className="text-blue-700" />
                    <p className="mt-3 text-2xl font-black text-gray-900">{data.stats.rank ? `#${data.stats.rank}` : '-'}</p>
                    <p className="text-xs font-bold text-gray-500">peringkat saat ini</p>
                </div>
                <div className="border-2 border-gray-900 bg-white p-4">
                    <Target size={20} className="text-blue-700" />
                    <p className="mt-3 text-2xl font-black text-gray-900">{bestScore ?? '-'}</p>
                    <p className="text-xs font-bold text-gray-500">skor terbaik</p>
                </div>
                <Link href="/cpns/dashboard/event" className="border-2 border-gray-900 bg-blue-50 p-4 transition hover:bg-blue-100">
                    <CalendarDays size={20} className="text-blue-700" />
                    <p className="mt-3 text-sm font-black text-gray-900">
                        {data.nextTryout ? data.nextTryout.name : 'Lihat event tryout'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-gray-500">
                        {data.nextTryout ? (data.nextTryout.daysLeft <= 0 ? 'Jadwal tersedia sekarang' : `${data.nextTryout.daysLeft} hari lagi`) : 'Cek jadwal terbaru'}
                    </p>
                </Link>
            </section>
        </div>
    )
}
