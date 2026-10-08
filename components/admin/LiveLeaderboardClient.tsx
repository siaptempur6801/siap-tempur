'use client'

import { getLiveLeaderboardAction,LiveLeaderboardEntry } from '@/app/actions/event-leaderboard'
import { shouldRefreshEventLeaderboard } from '@/lib/event-leaderboard-refresh'
import { buildPassingGradeLeaderboardSections,type PassingGradeMap } from '@/lib/leaderboard-passing-grade'
import { cn } from '@/lib/utils'
import { AnimatePresence,motion } from 'framer-motion'
import { ChevronDown,ChevronUp,Clock,Minus,Pause,Play,Plus,RefreshCw,Trophy,Users } from 'lucide-react'
import Image from 'next/image'
import { useEffect,useMemo,useRef,useState } from 'react'

const DEFAULT_AUTO_SCROLL_SPEED = 10
const MIN_AUTO_SCROLL_SPEED = 5
const MAX_AUTO_SCROLL_SPEED = 80
const AUTO_SCROLL_SPEED_STEP = 5

export default function LiveLeaderboardClient({
    eventId,
    passingGrades,
}: {
    eventId: string
    /**
     * Ambang kelulusan dari database (`exam_sections.config->>'passing_score'`).
     * Dikirim dari server supaya halaman ini menilai dengan angka yang sama seperti
     * saat ujian dinilai, dan ikut berubah begitu admin mengubahnya.
     * Bila tidak dikirim, dipakai nilai cadangan di `lib/constants.ts`.
     */
    passingGrades?: PassingGradeMap
}) {
    const scrollContainerRef = useRef<HTMLElement | null>(null)
    const [entries, setEntries] = useState<LiveLeaderboardEntry[]>([])
    const [prevRanks, setPrevRanks] = useState<Record<string, number>>({})
    const [event, setEvent] = useState<{ title: string; status: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(DEFAULT_AUTO_SCROLL_SPEED)
    const isFinalLeaderboard = event?.status === 'closed'
    const leaderboardSections = useMemo(
        () => buildPassingGradeLeaderboardSections(entries, passingGrades),
        [entries, passingGrades],
    )
    const decreaseAutoScrollSpeed = () => {
        setAutoScrollSpeed((current) => Math.max(current - AUTO_SCROLL_SPEED_STEP, MIN_AUTO_SCROLL_SPEED))
    }
    const increaseAutoScrollSpeed = () => {
        setAutoScrollSpeed((current) => Math.min(current + AUTO_SCROLL_SPEED_STEP, MAX_AUTO_SCROLL_SPEED))
    }

    useEffect(() => {
        let isCancelled = false
        let refreshTimer: number | null = null

        const fetchLeaderboard = async () => {
            try {
                setErrorMessage(null)
                const result = await getLiveLeaderboardAction(eventId)
                if (isCancelled) return

                setEvent(result.event)

                setEntries((currentEntries) => {
                    if (currentEntries.length > 0) {
                        const currentSectionEntries = buildPassingGradeLeaderboardSections(currentEntries, passingGrades)
                            .flatMap((section) => section.entries)

                        setPrevRanks(Object.fromEntries(
                            currentSectionEntries.map((entry) => [entry.entry_id, entry.live_rank])
                        ))
                    }

                    return result.leaderboard
                })
                setLastUpdated(new Date())

                if (shouldRefreshEventLeaderboard(result.event.status)) {
                    refreshTimer = window.setTimeout(fetchLeaderboard, 5000)
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat leaderboard')
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false)
                }
            }
        }

        fetchLeaderboard()
        return () => {
            isCancelled = true
            if (refreshTimer) {
                window.clearTimeout(refreshTimer)
            }
        }
    }, [eventId, passingGrades])

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current
        if (!isAutoScrollEnabled) return
        if (!scrollContainer || entries.length === 0) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        let frameId: number | null = null
        let pauseTimer: number | null = null
        let isCancelled = false
        const topPauseMs = 600
        const bottomPauseMs = 700
        const pixelsPerSecond = autoScrollSpeed
        const minDurationMs = 1800
        const maxDurationMs = 10 * 60 * 1000

        const scheduleNextScroll = (delayMs = topPauseMs) => {
            if (isCancelled) return
            pauseTimer = window.setTimeout(() => animateScroll(), delayMs)
        }

        const animateScroll = () => {
            const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight
            if (maxScrollTop <= 4) return

            const startScrollTop = scrollContainer.scrollTop
            const distance = maxScrollTop - startScrollTop

            if (Math.abs(distance) <= 2) {
                pauseTimer = window.setTimeout(() => {
                    scrollContainer.scrollTop = 0
                    scheduleNextScroll()
                }, bottomPauseMs)
                return
            }

            const duration = Math.min(
                Math.max((Math.abs(distance) / pixelsPerSecond) * 1000, minDurationMs),
                maxDurationMs
            )
            const startedAt = performance.now()

            const step = (now: number) => {
                if (isCancelled) return

                const progress = Math.min((now - startedAt) / duration, 1)
                scrollContainer.scrollTop = startScrollTop + distance * progress

                if (progress < 1) {
                    frameId = window.requestAnimationFrame(step)
                    return
                }

                pauseTimer = window.setTimeout(() => {
                    scrollContainer.scrollTop = 0
                    scheduleNextScroll()
                }, bottomPauseMs)
            }

            frameId = window.requestAnimationFrame(step)
        }

        scheduleNextScroll()

        return () => {
            isCancelled = true
            if (frameId != null) {
                window.cancelAnimationFrame(frameId)
            }
            if (pauseTimer != null) {
                window.clearTimeout(pauseTimer)
            }
        }
    }, [entries.length, isAutoScrollEnabled, autoScrollSpeed])

    if (loading && entries.length === 0) {
        return (
            <div className="st-product flex h-screen w-full items-center justify-center bg-[#fbfaf7] px-4 font-body text-slate-950">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-yellow-300 st-">
                        <RefreshCw className="animate-spin text-slate-900" size={24} />
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-slate-950">Memuat leaderboard...</h2>
                </div>
            </div>
        )
    }

    if (errorMessage && entries.length === 0) {
        return (
            <div className="st-product flex h-screen w-full items-center justify-center bg-[#fbfaf7] px-4 font-body text-slate-950">
                <div className="max-w-lg border-2 border-slate-900 bg-white p-6 text-center st-shadow-md">
                    <Trophy className="mx-auto mb-4 text-blue-600" size={36} />
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">Leaderboard tidak tersedia</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{errorMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <div data-experience-mode="event-leaderboard" data-program="cpns" className="st-product flex h-screen flex-col overflow-hidden bg-[#fbfaf7] font-body text-slate-950">
            <header className="relative z-10 flex flex-col gap-3 border-b-2 border-slate-900 bg-[#fbfaf7]/95 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-yellow-300 st-">
                        <Trophy className="text-slate-900" size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex min-w-0 items-baseline gap-2">
                            <span className="hidden shrink-0 font-script text-lg font-semibold text-slate-950 sm:inline">Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.</span>
                            <span className="hidden text-slate-300 sm:inline">/</span>
                            <h1 className="truncate font-display text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
                            {isFinalLeaderboard ? 'Leaderboard Event' : 'Live Leaderboard'}
                            </h1>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:text-xs">{event?.title || 'Memuat event...'}</p>
                    </div>
                </div>

                <div className="flex items-center">
                    <div className="flex w-full items-center justify-between gap-3 border-2 border-slate-900 bg-white px-3 py-2 st- sm:w-auto">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock size={14} />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Update</span>
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                            {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' })}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main ref={scrollContainerRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7">
                <div className="mx-auto max-w-6xl">
                    {/* Header Columns */}
                    <div className="mb-2 hidden grid-cols-[72px_1fr_220px_120px_170px] items-center gap-4 px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                        <div className="text-center">Rank</div>
                        <div>Peserta</div>
                        <div className="text-center">{isFinalLeaderboard ? 'Nilai Final' : 'Nilai Live'}</div>
                        <div className="text-center">Skor</div>
                        <div className="text-center">Progress</div>
                    </div>

                    {/* Leaderboard List */}
                    <div className="flex flex-col gap-7 pb-20">
                        {entries.length > 0 ? leaderboardSections.map((section) => (
                            <section key={section.key} className="flex flex-col gap-3">
                                <div className={cn(
                                    'flex flex-col gap-2 border-2 border-slate-900 px-4 py-3 st- sm:flex-row sm:items-center sm:justify-between',
                                    section.key === 'passed' ? 'bg-emerald-100' : 'bg-yellow-100'
                                )}>
                                    <div>
                                        <h2 className="font-display text-xl font-semibold text-slate-950 sm:text-2xl">{section.title}</h2>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-600">{section.description}</p>
                                    </div>
                                    <div className="inline-flex w-fit items-center gap-1.5 border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 st-">
                                        <Users size={14} strokeWidth={3} />
                                        {section.entries.length} Peserta
                                    </div>
                                </div>

                                {section.entries.length > 0 ? (
                                    <AnimatePresence mode="popLayout">
                                        {section.entries.map((entry) => {
                                const previousRank = prevRanks[entry.entry_id]
                                const rankDelta = previousRank ? previousRank - entry.live_rank : 0
                                const isRankUp = rankDelta > 0
                                const isRankDown = rankDelta < 0
                                const isSameRank = !previousRank || rankDelta === 0
                                const questionCount = Math.max(entry.question_count || 110, 1)

                                return (
                                    <motion.div
                                        key={entry.entry_id}
                                        layout
                                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: isRankUp ? [1, 1.025, 1] : isRankDown ? [1, 0.99, 1] : 1,
                                        }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{
                                            layout: {
                                                type: 'tween',
                                                duration: 0.85,
                                                ease: [0.22, 1, 0.36, 1],
                                            },
                                            opacity: { duration: 0.35, ease: 'easeOut' },
                                            y: { duration: 0.45, ease: 'easeOut' },
                                            scale: { duration: 1.4, ease: 'easeOut' },
                                        }}
                                        className={cn(
                                            'group relative grid overflow-hidden grid-cols-[52px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-2 p-3 transition-transform hover:-translate-y-0.5 sm:grid-cols-[64px_minmax(0,1fr)] sm:p-4 lg:grid-cols-[72px_minmax(0,1fr)_220px_120px_170px] lg:gap-4',
                                            section.key === 'passed' ? 'bg-blue-50/60' : 'bg-white',
                                            isRankUp
                                                ? 'border-emerald-500 shadow-[3px_3px_0_0_#10b981]'
                                                : isRankDown
                                                    ? 'border-red-500 shadow-[3px_3px_0_0_#ef4444]'
                                                    : 'border-slate-900 st- hover:st-'
                                        )}
                                    >
                                        <AnimatePresence>
                                            {(isRankUp || isRankDown) && (
                                                <>
                                                    <motion.div
                                                        key={`flash-${entry.entry_id}-${entry.live_rank}`}
                                                        className={cn(
                                                            'pointer-events-none absolute inset-0',
                                                            isRankUp
                                                                ? 'bg-green-400/20'
                                                                : 'bg-red-400/15'
                                                        )}
                                                        initial={{ opacity: 0.9 }}
                                                        animate={{ opacity: [0.9, 0.15, 0] }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 1.4, ease: 'easeOut' }}
                                                    />
                                                    <motion.div
                                                        key={`stripe-${entry.entry_id}-${entry.live_rank}`}
                                                        className={cn(
                                                            'pointer-events-none absolute inset-y-0 left-0 w-2',
                                                            isRankUp ? 'bg-green-500' : 'bg-red-500'
                                                        )}
                                                        initial={{ scaleY: 0 }}
                                                        animate={{ scaleY: [0, 1, 1] }}
                                                        exit={{ scaleY: 0 }}
                                                        transition={{ duration: 0.75, ease: 'easeOut' }}
                                                    />
                                                    <motion.div
                                                        key={`badge-${entry.entry_id}-${entry.live_rank}`}
                                                        className={cn(
                                                            'pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1 border-2 border-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide st- sm:right-4 sm:top-4',
                                                            isRankUp
                                                                ? 'bg-green-400 text-gray-950'
                                                                : 'bg-red-500 text-white'
                                                        )}
                                                        initial={{ opacity: 0, y: -14, rotate: -4, scale: 0.85 }}
                                                        animate={{ opacity: [0, 1, 1, 0], y: [-14, 0, 0, -8], rotate: [-4, 2, 0, 0], scale: [0.85, 1.08, 1, 0.96] }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 2.2, times: [0, 0.18, 0.78, 1], ease: 'easeOut' }}
                                                    >
                                                        {isRankUp ? <ChevronUp size={14} strokeWidth={4} /> : <ChevronDown size={14} strokeWidth={4} />}
                                                        {isRankUp ? `Naik ${rankDelta}` : `Turun ${Math.abs(rankDelta)}`}
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>

                                        {/* Rank Column */}
                                        <div className="relative z-10 flex flex-col items-center justify-center gap-1 border-r-2 border-slate-200 pr-3 sm:pr-4">
                                            <div className={cn(
                                                "flex h-9 w-9 items-center justify-center border-2 border-slate-900 text-sm font-semibold st- sm:h-10 sm:w-10 sm:text-base",
                                                entry.live_rank === 1 ? 'bg-yellow-300 text-slate-900' :
                                                entry.live_rank === 2 ? 'bg-slate-200 text-slate-900' :
                                                entry.live_rank === 3 ? 'bg-orange-300 text-slate-900' :
                                                'bg-white text-slate-900'
                                            )}>
                                                #{entry.live_rank}
                                            </div>

                                            {/* Rank Movement Indicator */}
                                            <div className="mt-1 flex h-5 items-center justify-center">
                                                {isRankUp && (
                                                    <motion.div initial={{y:5, opacity:0}} animate={{y:0, opacity:1}} className="flex items-center text-xs font-semibold text-green-600">
                                                        <ChevronUp size={16} strokeWidth={4} /> {rankDelta}
                                                    </motion.div>
                                                )}
                                                {isRankDown && (
                                                    <motion.div initial={{y:-5, opacity:0}} animate={{y:0, opacity:1}} className="flex items-center text-xs font-semibold text-red-600">
                                                        <ChevronDown size={16} strokeWidth={4} /> {Math.abs(rankDelta)}
                                                    </motion.div>
                                                )}
                                                {isSameRank && (
                                                    <span className="text-gray-400 font-semibold text-xs"><Minus size={16} strokeWidth={3} /></span>
                                                )}
                                            </div>
                                        </div>

                                        {/* User Info Column */}
                                        <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
                                            <div className="relative h-11 w-11 shrink-0 overflow-hidden border-2 border-slate-900 bg-slate-100 st- sm:h-12 sm:w-12">
                                                {entry.avatar_url ? (
                                                    <Image
                                                        src={entry.avatar_url}
                                                        alt={entry.full_name}
                                                        fill
                                                        sizes="(min-width: 640px) 56px, 48px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-base font-semibold uppercase text-slate-900">
                                                        {entry.full_name.substring(0, 2)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate text-sm font-semibold text-slate-900 sm:text-lg lg:max-w-[500px] lg:text-xl">
                                                    {entry.full_name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Live Score Breakdown */}
                                        <div className="relative z-10 col-span-2 grid grid-cols-3 gap-2 border-t-2 border-slate-100 pt-3 lg:col-span-1 lg:border-l-2 lg:border-t-0 lg:border-slate-200 lg:pl-4 lg:pt-0">
                                            {[
                                                { label: 'TWK', value: entry.score_twk ?? 0, className: 'bg-red-50 text-red-700 border-red-200' },
                                                { label: 'TIU', value: entry.score_tiu ?? 0, className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
                                                { label: 'TKP', value: entry.score_tkp ?? 0, className: 'bg-blue-50 text-blue-700 border-blue-200' },
                                            ].map((score) => (
                                                <div
                                                    key={score.label}
                                                    className={cn('min-w-0 border px-1.5 py-2 text-center font-semibold sm:px-2', score.className)}
                                                >
                                                    <div className="text-[10px] uppercase tracking-widest">{score.label}</div>
                                                    <div className="font-mono text-lg leading-none sm:text-xl">{String(score.value).padStart(2, '0')}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Score Column */}
                                        <div className="relative z-10 flex min-w-0 flex-col items-center justify-center border-t-2 border-slate-100 pt-3 lg:border-l-2 lg:border-t-0 lg:border-slate-200 lg:pl-4 lg:pt-0">
                                            <span className="text-2xl font-semibold text-blue-600">{entry.total_score ?? 0}</span>
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Poin</span>
                                        </div>

                                        {/* Progress Column */}
                                        <div className="relative z-10 flex min-w-0 flex-col items-center justify-center gap-1.5 border-t-2 border-slate-100 pt-3 lg:border-l-2 lg:border-t-0 lg:border-slate-200 lg:pl-4 lg:pt-0">
                                            <div className="flex items-end gap-1 font-mono">
                                                <span className="text-xl font-semibold text-slate-900 sm:text-2xl">{entry.progress_count}</span>
                                                <span className="mb-0.5 text-xs font-bold text-slate-500">/{questionCount}</span>
                                            </div>
                                            <div className="h-3 w-full min-w-0 overflow-hidden border-2 border-slate-900 bg-slate-100">
                                                <motion.div
                                                    className="h-full border-r-2 border-slate-900 bg-blue-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((entry.progress_count / questionCount) * 100, 100)}%` }}
                                                    transition={{ duration: 1 }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                                        })}
                                    </AnimatePresence>
                                ) : (
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-white/60 py-10 text-center text-slate-500">
                                        <Users size={36} className="mb-3 text-slate-400" />
                                        <p className="text-sm font-bold text-slate-500">
                                            {section.key === 'passed'
                                                ? 'Belum ada peserta yang melewati passing grade'
                                                : 'Belum ada peserta di section ini'}
                                        </p>
                                    </div>
                                )}
                            </section>
                        )) : !loading && (
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-white/60 py-16 text-slate-500">
                                <Users size={44} className="mb-3 text-slate-400" />
                                <p className="text-base font-bold text-slate-500">
                                    {isFinalLeaderboard ? 'Belum ada skor peserta' : 'Belum ada peserta yang memulai'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <div className="fixed bottom-3 right-3 z-30 flex w-44 flex-col gap-1.5 sm:bottom-4 sm:right-4">
                <div className="overflow-hidden border-2 border-slate-900 bg-white st-">
                    <div className="border-b-2 border-slate-900 bg-slate-50 px-2 py-0.5 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Speed
                    </div>
                    <div className="grid grid-cols-[36px_1fr_36px]">
                        <button
                            type="button"
                            data-allow-repeat="true"
                            aria-label="Kurangi kecepatan autoscroll"
                            onClick={decreaseAutoScrollSpeed}
                            disabled={autoScrollSpeed <= MIN_AUTO_SCROLL_SPEED}
                            className="flex h-9 items-center justify-center border-r-2 border-slate-900 bg-white text-slate-900 transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                        >
                            <Minus size={14} strokeWidth={4} />
                        </button>
                        <div className="flex h-9 items-center justify-center bg-white px-1 text-center font-mono text-xs font-semibold text-slate-900">
                            {autoScrollSpeed}
                        </div>
                        <button
                            type="button"
                            data-allow-repeat="true"
                            aria-label="Tambah kecepatan autoscroll"
                            onClick={increaseAutoScrollSpeed}
                            disabled={autoScrollSpeed >= MAX_AUTO_SCROLL_SPEED}
                            className="flex h-9 items-center justify-center border-l-2 border-slate-900 bg-white text-slate-900 transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                        >
                            <Plus size={14} strokeWidth={4} />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    aria-pressed={isAutoScrollEnabled}
                    onClick={() => setIsAutoScrollEnabled((current) => !current)}
                    className={cn(
                        'flex h-10 w-full items-center justify-center gap-1.5 border-2 border-slate-900 px-2 text-[10px] font-semibold uppercase tracking-wide st- transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none active:shadow-none',
                        isAutoScrollEnabled
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-slate-900'
                    )}
                >
                    {isAutoScrollEnabled ? <Pause size={14} strokeWidth={3} /> : <Play size={14} strokeWidth={3} />}
                    {isAutoScrollEnabled ? 'Autoscroll ON' : 'Autoscroll OFF'}
                </button>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #fbfaf7;
                    border-left: 2px solid var(--brand-ink);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--brand-ink);
                    border: 2px solid #fbfaf7;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #374151;
                }
            `}</style>
        </div>
    )
}
