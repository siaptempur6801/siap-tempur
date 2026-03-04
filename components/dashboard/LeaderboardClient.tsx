'use client'

import React from 'react'
import { Medal, Search, User, BarChart3, SearchX } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import PaperBackground from '@/components/PaperBackground'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

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
    periodText?: string
    currentUserRank?: LeaderboardEntry | null
}

export default function LeaderboardClient({ data, currentUserId, periodText = 'Edisi Minggu Ini', currentUserRank }: LeaderboardClientProps) {
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

            <PageAnimateContainer className="flex-1 px-4 sm:px-6 py-6 sm:py-10 relative z-10 w-full max-w-5xl mx-auto space-y-0">
                {/* Header */}
                <PageAnimateItem className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-200 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-1 mb-4">
                            <BarChart3 className="w-4 h-4 text-gray-900" />
                            <span className="text-xs font-bold uppercase tracking-wider">{periodText}</span>
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
                </PageAnimateItem>

                {/* Table Layout */}
                <PageAnimateItem className="bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                    {/* Header Row */}
                    <div className="hidden xl:grid grid-cols-12 bg-gray-900 text-white p-4 font-black text-sm uppercase tracking-widest border-b-2 border-gray-900">
                        <div className="col-span-1 text-center">Pos</div>
                        <div className="col-span-5 px-4 text-left">Nama Lengkap</div>
                        <div className="col-span-1 text-center">TWK</div>
                        <div className="col-span-1 text-center">TIU</div>
                        <div className="col-span-1 text-center">TKP</div>
                        <div className="col-span-3 text-center">Total Score</div>
                    </div>

                    {/* User Rows */}
                    <div className="flex flex-col">
                        {filteredData.map((entry, idx) => {
                            const isCurrentUser = entry.user_id === currentUserId

                            return (
                                <motion.div
                                    key={entry.user_id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={cn(
                                        "relative border-b-2 border-gray-100 transition-all hover:bg-gray-50/50",
                                        isCurrentUser && "bg-blue-50/30 border-l-4 border-l-blue-600 z-10",
                                        "xl:grid xl:grid-cols-12 xl:items-center"
                                    )}
                                >
                                    {isCurrentUser && (
                                        <div className="absolute top-0 right-0 py-1 px-4 bg-blue-600 text-white text-[10px] font-black uppercase rotate-[-45deg] translate-x-5 -translate-y-1 shadow-sm z-30">
                                            Anda
                                        </div>
                                    )}

                                    {/* --- MOBILE LAYOUT (< 1280px) --- */}
                                    <div className="xl:hidden p-4 flex items-start gap-4">
                                        {/* Rank */}
                                        <div className="w-8 flex-shrink-0 flex justify-center pt-1">
                                            {getRankIcon(entry.rank_pos)}
                                        </div>

                                        {/* Main Content Area */}
                                        <div className="flex-1 min-w-0">
                                            {/* Header: Avatar, Name & Total */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-12 h-12 border-2 border-gray-900 bg-yellow-50 flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
                                                    {entry.avatar_url ? (
                                                        <Image
                                                            src={entry.avatar_url}
                                                            alt={entry.full_name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="48px"
                                                        />
                                                    ) : (
                                                        <User className="text-gray-400 w-7 h-7" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                                                    <div className={cn(
                                                        "text-base font-black truncate leading-tight",
                                                        isCurrentUser ? "text-blue-700" : "text-gray-900"
                                                    )}>
                                                        {entry.full_name || 'Pejuang Tanpa Nama'}
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-black text-gray-400">Total Score</span>
                                                        <span className="text-lg font-black text-gray-900">{entry.top_score}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Score Details: Compact Badges */}
                                            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-sm border border-gray-100">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-blue-500 uppercase leading-none mb-1">TWK</span>
                                                    <span className="text-xs font-bold text-gray-700">{entry.score_twk}</span>
                                                </div>
                                                <div className="flex flex-col items-center border-x border-gray-200">
                                                    <span className="text-[8px] font-black text-green-500 uppercase leading-none mb-1">TIU</span>
                                                    <span className="text-xs font-bold text-gray-700">{entry.score_tiu}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-orange-500 uppercase leading-none mb-1">TKP</span>
                                                    <span className="text-xs font-bold text-gray-700">{entry.score_tkp}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- DESKTOP LAYOUT (>= 1280px) --- */}
                                    <div className="hidden xl:contents">
                                        {/* Rank Column */}
                                        <div className="col-span-1 flex items-center justify-center py-4">
                                            {getRankIcon(entry.rank_pos)}
                                        </div>

                                        {/* Profile Column */}
                                        <div className="col-span-5 px-4 flex items-center gap-3 py-4">
                                            <div className="w-12 h-12 border-2 border-gray-900 bg-yellow-50 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
                                                {entry.avatar_url ? (
                                                    <Image
                                                        src={entry.avatar_url}
                                                        alt={entry.full_name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="48px"
                                                    />
                                                ) : (
                                                    <User className="text-gray-400 w-7 h-7" />
                                                )}
                                            </div>
                                            <div className={cn(
                                                "text-lg font-black truncate",
                                                isCurrentUser ? "text-blue-700" : "text-gray-900"
                                            )}>
                                                {entry.full_name || 'Pejuang Tanpa Nama'}
                                            </div>
                                        </div>

                                        {/* Score Columns */}
                                        <div className="col-span-1 text-center py-4">
                                            <span className="text-base font-bold text-gray-600">{entry.score_twk}</span>
                                        </div>
                                        <div className="col-span-1 text-center py-4">
                                            <span className="text-base font-bold text-gray-600">{entry.score_tiu}</span>
                                        </div>
                                        <div className="col-span-1 text-center py-4">
                                            <span className="text-base font-bold text-gray-600">{entry.score_tkp}</span>
                                        </div>

                                        {/* Total Score Column */}
                                        <div className="col-span-3 text-center py-4">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="px-6 py-2 bg-gray-900 text-white font-black text-2xl shadow-[4px_4px_0px_0px_rgba(59,130,246,0.5)]">
                                                    {entry.top_score}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}

                        {filteredData.length === 0 && (
                            <div className="p-12 text-center flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-gray-50 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-gray-400">
                                    <SearchX size={32} />
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
                            Pantau Terus Posisimu! Skor tertinggi dari mode Tryout akan membawamu ke puncak klasemen.
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
                </PageAnimateItem>

                {/* Panel Posisi User di Luar Top 100 */}
                {currentUserRank && !data.some(e => e.user_id === currentUserId) && (
                    <PageAnimateItem className="mt-4">
                        <div className="bg-blue-50 border-2 border-blue-600 shadow-[4px_4px_0px_0px_rgba(37,99,235,0.3)] p-4 flex items-center gap-4">
                            <div className="flex-shrink-0 text-center w-14">
                                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-0.5">Posisi</div>
                                <div className="text-3xl font-black text-blue-700">#{currentUserRank.rank_pos}</div>
                            </div>
                            <div className="w-px h-12 bg-blue-200" />
                            <div className="flex-1">
                                <div className="text-sm font-black text-blue-800">Posisi kamu belum masuk Top 100 saat ini</div>
                                <div className="text-xs text-blue-500 mt-0.5">Terus latihan untuk naik ke papan peringkat! Skor terbaikmu: <strong>{currentUserRank.top_score}</strong></div>
                            </div>
                            <div className="hidden sm:flex gap-3 text-center">
                                <div><div className="text-[10px] font-black text-blue-400 uppercase">TWK</div><div className="text-sm font-bold text-blue-700">{currentUserRank.score_twk}</div></div>
                                <div><div className="text-[10px] font-black text-blue-400 uppercase">TIU</div><div className="text-sm font-bold text-blue-700">{currentUserRank.score_tiu}</div></div>
                                <div><div className="text-[10px] font-black text-blue-400 uppercase">TKP</div><div className="text-sm font-bold text-blue-700">{currentUserRank.score_tkp}</div></div>
                            </div>
                        </div>
                    </PageAnimateItem>
                )}
            </PageAnimateContainer>
        </div>
    )
}
