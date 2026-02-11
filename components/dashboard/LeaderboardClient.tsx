'use client'

import React from 'react'
import { Trophy, Medal, Search, User, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import PaperBackground from '@/components/PaperBackground'

interface LeaderboardEntry {
    rank_pos: number
    user_id: string
    full_name: string
    avatar_url: string | null
    top_score: number
    score_twk: number
    score_tiu: number
    score_tkp: number
}

interface LeaderboardClientProps {
    data: LeaderboardEntry[]
    currentUserId: string
}

export default function LeaderboardClient({ data, currentUserId }: LeaderboardClientProps) {
    const [searchQuery, setSearchQuery] = React.useState('')

    const filteredData = data.filter(entry =>
        entry.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getRankIcon = (pos: number) => {
        if (pos === 1) return <Medal className="text-yellow-500 w-6 h-6" />
        if (pos === 2) return <Medal className="text-gray-400 w-6 h-6" />
        if (pos === 3) return <Medal className="text-amber-600 w-6 h-6" />
        return <span className="text-lg font-black text-gray-400">#{pos}</span>
    }

    return (
        <div className="w-full flex flex-col relative min-h-screen">
            <PaperBackground />

            <div className="flex-1 px-4 sm:px-6 py-6 sm:py-10 relative z-10 w-full max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-200 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-1 mb-4">
                            <BarChart3 className="w-4 h-4 text-gray-900" />
                            <span className="text-xs font-bold uppercase tracking-wider">Edisi Minggu Ini</span>
                        </div>
                        <h1 className="font-handwriting text-5xl md:text-7xl font-bold text-gray-900">Ranking Nasional</h1>
                        <p className="font-handwriting text-xl md:text-2xl text-gray-600 mt-2 italic">
                            Bersaing dengan 100+ pejuang CPNS lainnya!
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group max-w-sm w-full">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none group-focus-within:text-blue-600 text-gray-400 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari namamu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all outline-none font-bold italic"
                        />
                    </div>
                </div>

                {/* Table Layout */}
                <div className="bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 bg-gray-900 text-white p-4 font-black text-sm uppercase tracking-widest border-b-2 border-gray-900">
                        <div className="col-span-1 text-center">Pos</div>
                        <div className="col-span-5 px-4 text-left">Nama Lengkap</div>
                        <div className="col-span-1 text-center">TWK</div>
                        <div className="col-span-1 text-center">TIU</div>
                        <div className="col-span-1 text-center">TKP</div>
                        <div className="col-span-3 text-center">Total Score</div>
                    </div>

                    {/* User Rows */}
                    <div className="divide-y-2 divide-gray-100 flex flex-col">
                        {filteredData.map((entry, idx) => {
                            const isCurrentUser = entry.user_id === currentUserId

                            return (
                                <motion.div
                                    key={entry.user_id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={cn(
                                        "grid grid-cols-1 md:grid-cols-12 items-center p-4 transition-colors hover:bg-gray-50/50 relative overflow-hidden",
                                        isCurrentUser && "bg-blue-50/80 border-y-2 border-blue-600 z-10"
                                    )}
                                >
                                    {isCurrentUser && (
                                        <div className="absolute top-0 right-0 py-1 px-3 bg-blue-600 text-white text-[10px] font-black uppercase rotate-[-45deg] translate-x-4 -translate-y-1 shadow-sm">
                                            Anda
                                        </div>
                                    )}

                                    {/* Position (Mobile & Desktop) */}
                                    <div className="col-span-1 flex items-center justify-center mb-2 md:mb-0">
                                        <div className="md:hidden text-xs font-bold text-gray-400 mr-2 uppercase">Peringkat:</div>
                                        {getRankIcon(entry.rank_pos)}
                                    </div>

                                    {/* Profile & Name */}
                                    <div className="col-span-5 px-0 md:px-4 flex items-center gap-3 mb-4 md:mb-0">
                                        <div className="w-10 h-10 border-2 border-gray-900 bg-yellow-50 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                            {entry.avatar_url ? (
                                                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="text-gray-400 w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className={cn(
                                                "text-lg font-black truncate leading-tight",
                                                isCurrentUser ? "text-blue-700" : "text-gray-900"
                                            )}>
                                                {entry.full_name || 'Pejuang Tanpa Nama'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 md:hidden uppercase font-bold tracking-tighter">
                                                Tap untuk dibil detail &rarr;
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Score Breakdown */}
                                    <div className="hidden md:contents">
                                        <div className="col-span-1 text-center font-bold text-gray-500">{entry.score_twk}</div>
                                        <div className="col-span-1 text-center font-bold text-gray-500">{entry.score_tiu}</div>
                                        <div className="col-span-1 text-center font-bold text-gray-500">{entry.score_tkp}</div>
                                        <div className="col-span-3 text-center">
                                            <span className="inline-flex items-center gap-2 px-6 py-2 bg-gray-900 text-white font-black text-xl shadow-[3px_3px_0px_0px_rgba(59,130,246,0.5)]">
                                                {entry.top_score}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mobile Score Breakdown */}
                                    <div className="md:hidden flex items-center justify-between mt-2 pt-4 border-t border-dashed border-gray-200">
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase font-black text-gray-400 mb-1">TWK</div>
                                                <div className="font-bold text-sm bg-gray-100 px-2 rounded">{entry.score_twk}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase font-black text-gray-400 mb-1">TIU</div>
                                                <div className="font-bold text-sm bg-gray-100 px-2 rounded">{entry.score_tiu}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase font-black text-gray-400 mb-1">TKP</div>
                                                <div className="font-bold text-sm bg-gray-100 px-2 rounded">{entry.score_tkp}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase font-black text-blue-600 mb-1">Total Score</div>
                                            <div className="text-2xl font-black text-gray-900">{entry.top_score}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}

                        {filteredData.length === 0 && (
                            <div className="p-12 text-center flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-gray-50 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center grayscale text-3xl">
                                    🤔
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Nama Tidak Ditemukan</h3>
                                    <p className="text-gray-500">Mungkin ia sedang fokus belajar di tempat lain.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Legend / Footer */}
                    <div className="p-6 bg-gray-50 border-t-2 border-gray-900 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-gray-400 italic">
                            Data diperbarui setiap 5 menit. Selesaikan tryout dengan skor maksimal untuk naik ke puncak klasemen!
                        </p>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <Medal className="w-4 h-4 text-yellow-500" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-500">Juara Nasional</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-500">Anda</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
