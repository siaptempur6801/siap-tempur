'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, RefreshCw, ChevronUp, ChevronDown, Minus, Clock } from 'lucide-react'
import { getLiveLeaderboardAction, LiveLeaderboardEntry } from '@/app/actions/event-leaderboard'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export default function LiveLeaderboardClient({ eventId }: { eventId: string }) {
    const [entries, setEntries] = useState<LiveLeaderboardEntry[]>([])
    const [prevRanks, setPrevRanks] = useState<Record<string, number>>({})
    const [event, setEvent] = useState<{ title: string; status: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    const fetchLeaderboard = async () => {
        try {
            const result = await getLiveLeaderboardAction(eventId)
            setEvent(result.event)
            
            // Store previous ranks to calculate movement
            const newPrevRanks: Record<string, number> = {}
            entries.forEach(e => {
                newPrevRanks[e.user_id] = e.live_rank
            })
            if (entries.length > 0) {
                setPrevRanks(newPrevRanks)
            }

            setEntries(result.leaderboard)
            setLastUpdated(new Date())
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeaderboard()
        const interval = setInterval(fetchLeaderboard, 10000) // Poll every 10 seconds
        return () => clearInterval(interval)
    }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

    if (loading && entries.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-yellow-400 text-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-gray-900" size={48} />
                    <h2 className="text-2xl font-black uppercase tracking-widest">Memuat Live Data...</h2>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-gray-900 overflow-hidden flex flex-col font-sans">
            {/* Header (Brutalist style) */}
            <header className="relative z-10 flex items-center justify-between border-b-4 border-gray-900 bg-white px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Trophy className="text-gray-900" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-wider text-gray-900">Live Leaderboard</h1>
                        <p className="text-sm font-bold uppercase text-gray-500">{event?.title || 'Memuat Event...'}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end border-2 border-gray-900 bg-gray-50 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Clock size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Update Terakhir</span>
                        </div>
                        <span className="text-xl font-black font-mono text-gray-900">
                            {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="mx-auto max-w-6xl">
                    {/* Header Columns */}
                    <div className="mb-4 grid grid-cols-[80px_1fr_200px] items-center gap-6 px-6 text-sm font-black uppercase tracking-widest text-gray-500">
                        <div className="text-center">Rank</div>
                        <div>Peserta</div>
                        <div className="text-center">Progress</div>
                    </div>

                    {/* Leaderboard List */}
                    <div className="flex flex-col gap-4 pb-20">
                        <AnimatePresence mode="popLayout">
                            {entries.map((entry) => {
                                const previousRank = prevRanks[entry.user_id]
                                const isRankUp = previousRank && previousRank > entry.live_rank
                                const isRankDown = previousRank && previousRank < entry.live_rank
                                const isSameRank = !previousRank || previousRank === entry.live_rank

                                return (
                                    <motion.div
                                        key={entry.user_id}
                                        layout
                                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 300, 
                                            damping: 30,
                                        }}
                                        className="group grid grid-cols-[80px_1fr_200px] items-center gap-6 border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        {/* Rank Column */}
                                        <div className="flex flex-col items-center justify-center gap-1 border-r-2 border-gray-200 pr-6">
                                            <div className={cn(
                                                "flex h-12 w-12 items-center justify-center border-2 border-gray-900 text-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
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
                                                        <ChevronUp size={16} strokeWidth={4} /> {previousRank - entry.live_rank}
                                                    </motion.div>
                                                )}
                                                {isRankDown && (
                                                    <motion.div initial={{y:-5, opacity:0}} animate={{y:0, opacity:1}} className="flex items-center text-xs font-black text-red-600">
                                                        <ChevronDown size={16} strokeWidth={4} /> {entry.live_rank - previousRank}
                                                    </motion.div>
                                                )}
                                                {isSameRank && (
                                                    <span className="text-gray-400 font-black text-xs"><Minus size={16} strokeWidth={3} /></span>
                                                )}
                                            </div>
                                        </div>

                                        {/* User Info Column */}
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-gray-900 bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                {entry.avatar_url ? (
                                                    <Image 
                                                        src={entry.avatar_url} 
                                                        alt={entry.full_name} 
                                                        fill 
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xl font-black uppercase text-gray-900">
                                                        {entry.full_name.substring(0, 2)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-black tracking-tight text-gray-900 truncate max-w-[500px]">
                                                    {entry.full_name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Column */}
                                        <div className="flex flex-col items-center justify-center gap-2 border-l-2 border-gray-200 pl-6">
                                            <div className="flex items-end gap-1 font-mono">
                                                <span className="text-3xl font-black text-gray-900">{entry.progress_count}</span>
                                                <span className="mb-1 text-sm font-bold text-gray-500">/110</span>
                                            </div>
                                            <div className="h-4 w-full border-2 border-gray-900 bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
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
                                <p className="text-xl font-black uppercase tracking-widest text-gray-400">Belum ada peserta yang memulai</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
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
