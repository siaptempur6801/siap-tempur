'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, RefreshCw, ChevronUp, ChevronDown, Minus, Clock, Pause, Play } from 'lucide-react'
import { getLiveLeaderboardAction, LiveLeaderboardEntry } from '@/app/actions/event-leaderboard'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { shouldRefreshEventLeaderboard } from '@/lib/event-leaderboard-refresh'

export default function LiveLeaderboardClient({ eventId }: { eventId: string }) {
    const scrollContainerRef = useRef<HTMLElement | null>(null)
    const [entries, setEntries] = useState<LiveLeaderboardEntry[]>([])
    const [prevRanks, setPrevRanks] = useState<Record<string, number>>({})
    const [event, setEvent] = useState<{ title: string; status: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
    const isFinalLeaderboard = event?.status === 'closed'

    useEffect(() => {
        let isCancelled = false
        let refreshTimer: number | null = null

        const fetchLeaderboard = async () => {
            try {
                const result = await getLiveLeaderboardAction(eventId)
                if (isCancelled) return

                setEvent(result.event)

                setEntries((currentEntries) => {
                    if (currentEntries.length > 0) {
                        setPrevRanks(Object.fromEntries(
                            currentEntries.map((entry) => [entry.entry_id, entry.live_rank])
                        ))
                    }

                    return result.leaderboard
                })
                setLastUpdated(new Date())

                if (shouldRefreshEventLeaderboard(result.event.status)) {
                    refreshTimer = window.setTimeout(fetchLeaderboard, 5000)
                }
            } catch (error) {
                console.error(error)
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
    }, [eventId])

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current
        if (!isAutoScrollEnabled) return
        if (!scrollContainer || entries.length === 0) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        let frameId: number | null = null
        let pauseTimer: number | null = null
        let isCancelled = false
        let direction: 'down' | 'up' = 'down'

        const edgePauseMs = 1200
        const pixelsPerSecond = 1
        const minDurationMs = 3000
        const maxDurationMs = 10 * 60 * 1000

        const scheduleNextScroll = () => {
            if (isCancelled) return
            pauseTimer = window.setTimeout(() => animateScroll(), edgePauseMs)
        }

        const animateScroll = () => {
            const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight
            if (maxScrollTop <= 4) return

            const targetScrollTop = direction === 'down' ? maxScrollTop : 0
            const startScrollTop = scrollContainer.scrollTop
            const distance = targetScrollTop - startScrollTop

            if (Math.abs(distance) <= 2) {
                direction = direction === 'down' ? 'up' : 'down'
                scheduleNextScroll()
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

                direction = direction === 'down' ? 'up' : 'down'
                scheduleNextScroll()
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
    }, [entries.length, isAutoScrollEnabled])

    if (loading && entries.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-yellow-400 px-4 text-gray-900">
                <div className="flex flex-col items-center gap-4 text-center">
                    <RefreshCw className="animate-spin text-gray-900" size={44} />
                    <h2 className="text-xl font-black uppercase tracking-widest sm:text-2xl">Memuat Live Data...</h2>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen bg-[#f8f9fa] text-gray-900 overflow-hidden flex flex-col font-sans">
            {/* Header (Brutalist style) */}
            <header className="relative z-10 flex flex-col gap-4 border-b-4 border-gray-900 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-gray-900 bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:h-12 sm:w-12 sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Trophy className="text-gray-900" size={22} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-black uppercase leading-tight tracking-wider text-gray-900 sm:text-3xl">
                            {isFinalLeaderboard ? 'Leaderboard Event' : 'Live Leaderboard'}
                        </h1>
                        <p className="mt-1 line-clamp-2 text-xs font-bold uppercase text-gray-500 sm:text-sm">{event?.title || 'Memuat Event...'}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex w-full flex-col items-start border-2 border-gray-900 bg-gray-50 px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:w-auto sm:items-end sm:px-4 sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Clock size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest sm:text-xs">Update Terakhir</span>
                        </div>
                        <span className="font-mono text-lg font-black text-gray-900 sm:text-xl">
                            {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' })}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
                <div className="mx-auto max-w-6xl">
                    {/* Header Columns */}
                    <div className="mb-4 hidden grid-cols-[80px_1fr_240px_140px_180px] items-center gap-5 px-6 text-sm font-black uppercase tracking-widest text-gray-500 lg:grid">
                        <div className="text-center">Rank</div>
                        <div>Peserta</div>
                        <div className="text-center">{isFinalLeaderboard ? 'Nilai Final' : 'Nilai Live'}</div>
                        <div className="text-center">Skor</div>
                        <div className="text-center">Progress</div>
                    </div>

                    {/* Leaderboard List */}
                    <div className="flex flex-col gap-4 pb-20">
                        <AnimatePresence mode="popLayout">
                            {entries.map((entry) => {
                                const previousRank = prevRanks[entry.entry_id]
                                const rankDelta = previousRank ? previousRank - entry.live_rank : 0
                                const isRankUp = rankDelta > 0
                                const isRankDown = rankDelta < 0
                                const isSameRank = !previousRank || rankDelta === 0

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
                                            'group relative grid overflow-hidden grid-cols-[58px_minmax(0,1fr)] items-center gap-x-3 gap-y-4 border-2 bg-white p-3 transition-transform hover:-translate-y-1 sm:grid-cols-[70px_minmax(0,1fr)] sm:p-4 lg:grid-cols-[80px_minmax(0,1fr)_240px_140px_180px] lg:gap-5',
                                            isRankUp
                                                ? 'border-green-500 shadow-[6px_6px_0px_0px_rgba(22,163,74,1)] hover:shadow-[8px_8px_0px_0px_rgba(22,163,74,1)]'
                                                : isRankDown
                                                    ? 'border-red-500 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] hover:shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]'
                                                    : 'border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
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
                                                            'pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1 border-2 border-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:right-4 sm:top-4 sm:text-xs',
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
                                        <div className="relative z-10 flex flex-col items-center justify-center gap-1 border-r-2 border-gray-200 pr-3 sm:pr-4 lg:pr-6">
                                            <div className={cn(
                                                "flex h-10 w-10 items-center justify-center border-2 border-gray-900 text-base font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:h-12 sm:w-12 sm:text-xl",
                                                entry.live_rank === 1 ? 'bg-yellow-400 text-gray-900' :
                                                entry.live_rank === 2 ? 'bg-gray-200 text-gray-900' :
                                                entry.live_rank === 3 ? 'bg-orange-400 text-gray-900' :
                                                'bg-white text-gray-900'
                                            )}>
                                                #{entry.live_rank}
                                            </div>
                                            
                                            {/* Rank Movement Indicator */}
                                            <div className="mt-1 flex h-5 items-center justify-center">
                                                {isRankUp && (
                                                    <motion.div initial={{y:5, opacity:0}} animate={{y:0, opacity:1}} className="flex items-center text-xs font-black text-green-600">
                                                        <ChevronUp size={16} strokeWidth={4} /> {rankDelta}
                                                    </motion.div>
                                                )}
                                                {isRankDown && (
                                                    <motion.div initial={{y:-5, opacity:0}} animate={{y:0, opacity:1}} className="flex items-center text-xs font-black text-red-600">
                                                        <ChevronDown size={16} strokeWidth={4} /> {Math.abs(rankDelta)}
                                                    </motion.div>
                                                )}
                                                {isSameRank && (
                                                    <span className="text-gray-400 font-black text-xs"><Minus size={16} strokeWidth={3} /></span>
                                                )}
                                            </div>
                                        </div>

                                        {/* User Info Column */}
                                        <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
                                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-gray-900 bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:h-14 sm:w-14">
                                                {entry.avatar_url ? (
                                                    <Image 
                                                        src={entry.avatar_url} 
                                                        alt={entry.full_name} 
                                                        fill 
                                                        sizes="(min-width: 640px) 56px, 48px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-base font-black uppercase text-gray-900 sm:text-xl">
                                                        {entry.full_name.substring(0, 2)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate text-base font-black tracking-tight text-gray-900 sm:text-xl lg:max-w-[500px] lg:text-2xl">
                                                    {entry.full_name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Live Score Breakdown */}
                                        <div className="relative z-10 col-span-2 grid grid-cols-3 gap-2 border-t-2 border-gray-100 pt-3 lg:col-span-1 lg:border-l-2 lg:border-t-0 lg:border-gray-200 lg:pl-5 lg:pt-0">
                                            {[
                                                { label: 'TWK', value: entry.score_twk ?? 0, className: 'bg-red-50 text-red-700 border-red-200' },
                                                { label: 'TIU', value: entry.score_tiu ?? 0, className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
                                                { label: 'TKP', value: entry.score_tkp ?? 0, className: 'bg-blue-50 text-blue-700 border-blue-200' },
                                            ].map((score) => (
                                                <div
                                                    key={score.label}
                                                    className={cn('min-w-0 border-2 px-1.5 py-2 text-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.08)] sm:px-2', score.className)}
                                                >
                                                    <div className="text-[10px] uppercase tracking-widest">{score.label}</div>
                                                    <div className="font-mono text-lg leading-none sm:text-xl">{String(score.value).padStart(2, '0')}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Score Column */}
                                        <div className="relative z-10 flex min-w-0 flex-col items-center justify-center border-t-2 border-gray-100 pt-3 lg:border-l-2 lg:border-t-0 lg:border-gray-200 lg:pl-5 lg:pt-0">
                                            <span className="text-2xl font-black text-blue-600 sm:text-3xl">{entry.total_score ?? 0}</span>
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Poin</span>
                                        </div>

                                        {/* Progress Column */}
                                        <div className="relative z-10 flex min-w-0 flex-col items-center justify-center gap-2 border-t-2 border-gray-100 pt-3 lg:border-l-2 lg:border-t-0 lg:border-gray-200 lg:pl-5 lg:pt-0">
                                            <div className="flex items-end gap-1 font-mono">
                                                <span className="text-2xl font-black text-gray-900 sm:text-3xl">{entry.progress_count}</span>
                                                <span className="mb-1 text-xs font-bold text-gray-500 sm:text-sm">/110</span>
                                            </div>
                                            <div className="h-4 w-full min-w-0 overflow-hidden border-2 border-gray-900 bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <motion.div 
                                                    className="h-full bg-blue-500 border-r-2 border-gray-900" 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((entry.progress_count / 110) * 100, 100)}%` }}
                                                    transition={{ duration: 1 }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                        
                        {entries.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-4 border-dashed border-gray-300">
                                <Users size={64} className="mb-4 opacity-50 text-gray-400" />
                                <p className="text-xl font-black uppercase tracking-widest text-gray-400">
                                    {isFinalLeaderboard ? 'Belum ada skor peserta' : 'Belum ada peserta yang memulai'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <button
                type="button"
                aria-pressed={isAutoScrollEnabled}
                onClick={() => setIsAutoScrollEnabled((current) => !current)}
                className={cn(
                    'fixed bottom-4 right-4 z-30 flex items-center gap-2 border-2 border-gray-900 px-4 py-3 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none sm:bottom-6 sm:right-6 sm:text-sm',
                    isAutoScrollEnabled
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-900'
                )}
            >
                {isAutoScrollEnabled ? <Pause size={18} strokeWidth={3} /> : <Play size={18} strokeWidth={3} />}
                {isAutoScrollEnabled ? 'Autoscroll ON' : 'Autoscroll OFF'}
            </button>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f8f9fa;
                    border-left: 2px solid #111827;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #111827;
                    border: 2px solid #f8f9fa;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #374151;
                }
            `}</style>
        </div>
    )
}
