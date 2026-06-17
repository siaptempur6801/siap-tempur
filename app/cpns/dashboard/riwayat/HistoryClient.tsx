'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock3, FileSearch, Search, SlidersHorizontal } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
import { cn } from '@/lib/utils'

type HistorySession = {
    id: string
    title: string
    kind: 'event' | 'full-tryout' | 'mini-tryout'
    isEvent: boolean
    completedAt: string
    completedAtLabel: string
    totalScore: number
    scoreTwk: number
    scoreTiu: number
    scoreTkp: number
    passed: boolean | null
}

type TypeFilter = 'all' | 'event' | 'full-tryout' | 'mini-tryout'
type StatusFilter = 'all' | 'passed' | 'failed'
type SortMode = 'newest' | 'oldest' | 'highest'

interface HistoryClientProps {
    sessions: HistorySession[]
}

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'Semua' },
    { value: 'event', label: 'Event' },
    { value: 'full-tryout', label: 'Full Tryout' },
    { value: 'mini-tryout', label: 'Mini Tryout' }
]

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'Semua Status' },
    { value: 'passed', label: 'Lulus' },
    { value: 'failed', label: 'Belum Lulus' }
]

const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'newest', label: 'Terbaru' },
    { value: 'highest', label: 'Skor Tertinggi' },
    { value: 'oldest', label: 'Terlama' }
]

function ScoreChip({
    label,
    value,
    className
}: {
    label: string
    value: number
    className: string
}) {
    return (
        <div className={cn("w-full min-w-0 border-2 px-2 py-2 md:px-1 md:py-1 lg:min-w-[74px] lg:px-3 lg:py-2", className)}>
            <div className="text-[9px] md:text-[8px] lg:text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-base md:text-sm lg:text-lg font-black">{value}</div>
        </div>
    )
}

export default function HistoryClient({ sessions }: HistoryClientProps) {
    const [query, setQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortMode, setSortMode] = useState<SortMode>('newest')
    const [page, setPage] = useState(1)
    const pageSize = 10

    const filteredSessions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()

        const next = sessions.filter((session) => {
            const matchesQuery =
                normalizedQuery.length === 0 ||
                session.title.toLowerCase().includes(normalizedQuery) ||
                session.completedAtLabel.toLowerCase().includes(normalizedQuery) ||
                (session.isEvent && 'event'.includes(normalizedQuery))

            const matchesType =
                typeFilter === 'all' ||
                session.kind === typeFilter

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'passed' && session.passed === true) ||
                (statusFilter === 'failed' && session.passed === false)

            return matchesQuery && matchesType && matchesStatus
        })

        next.sort((a, b) => {
            if (sortMode === 'highest') {
                return b.totalScore - a.totalScore || new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            }

            if (sortMode === 'oldest') {
                return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
            }

            return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        })

        return next
    }, [query, sessions, sortMode, statusFilter, typeFilter])

    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const paginatedSessions = filteredSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    return (
        <div className="w-full min-h-screen relative">
            <PaperBackground />
            <div className="relative z-10 max-w-6xl mx-auto space-y-6 font-handwriting">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-200 border-2 border-gray-900 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -rotate-1">
                        <FileSearch size={14} />
                        <span>Riwayat Tryout</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Hasil Tryout Sebelumnya</h1>
                    <p className="text-lg text-gray-600 max-w-3xl font-sans">
                        Saya padatkan jadi daftar yang lebih ringkas supaya lebih cepat discan dan gampang dicari.
                    </p>
                </div>

                <div className="border-4 border-gray-900 bg-white p-4 md:p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1 max-w-2xl">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value)
                                    setPage(1)
                                }}
                                placeholder="Cari nama sesi, event, atau tanggal..."
                                className="w-full border-2 border-gray-900 bg-[#fffdf7] py-3 pl-11 pr-4 text-base font-sans shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <SlidersHorizontal size={14} />
                            {filteredSessions.length} dari {sessions.length} sesi
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                Tipe
                            </span>
                            <select
                                value={typeFilter}
                                onChange={(event) => {
                                    setTypeFilter(event.target.value as TypeFilter)
                                    setPage(1)
                                }}
                                className="border-2 border-gray-900 bg-white px-3 py-3 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
                            >
                                {typeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                Status
                            </span>
                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value as StatusFilter)
                                    setPage(1)
                                }}
                                className="border-2 border-gray-900 bg-white px-3 py-3 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                Urutan
                            </span>
                            <select
                                value={sortMode}
                                onChange={(event) => {
                                    setSortMode(event.target.value as SortMode)
                                    setPage(1)
                                }}
                                className="border-2 border-gray-900 bg-white px-3 py-3 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
                            >
                                {sortOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {filteredSessions.length > 0 ? (
                    <div className="space-y-3">
                        {paginatedSessions.map((session) => (
                            <div
                                key={session.id}
                                className="border-4 border-gray-900 bg-white px-3 py-3 lg:px-5 lg:py-4 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-3">
                                    <div className="min-w-0 md:flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {session.isEvent && (
                                                <span className="inline-flex items-center gap-1 border-2 border-gray-900 bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">
                                                    Event
                                                </span>
                                            )}
                                            {session.kind === 'full-tryout' && (
                                                <span className="inline-flex items-center gap-1 border-2 border-gray-900 bg-yellow-100 px-2 py-0.5 text-[9px] font-black uppercase text-yellow-800">
                                                    Full Tryout
                                                </span>
                                            )}
                                            {session.kind === 'mini-tryout' && (
                                                <span className="inline-flex items-center gap-1 border-2 border-gray-900 bg-green-100 px-2 py-0.5 text-[9px] font-black uppercase text-green-700">
                                                    Mini Tryout
                                                </span>
                                            )}
                                            {session.passed !== null && (
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 border-2 border-gray-900 px-2 py-0.5 text-[9px] font-black uppercase",
                                                        session.passed
                                                            ? "bg-green-200 text-green-800"
                                                            : "bg-red-200 text-red-700"
                                                    )}
                                                >
                                                    {session.passed ? 'Lulus' : 'Belum Lulus'}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="mt-1 truncate text-xl md:text-[22px] lg:text-3xl font-black text-gray-900">
                                            {session.title}
                                        </h2>

                                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500 font-sans">
                                            <Clock3 size={14} />
                                            <span>{session.completedAtLabel}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-2 lg:gap-3 shrink-0">
                                        <div className="grid grid-cols-4 gap-1 md:w-[208px] lg:w-auto lg:min-w-[320px] lg:gap-2 text-sm font-sans">
                                            <ScoreChip
                                                label="Total"
                                                value={session.totalScore}
                                                className="border-gray-900 bg-[#fffdf7] text-gray-900"
                                            />
                                            <ScoreChip
                                                label="TWK"
                                                value={session.scoreTwk}
                                                className="border-red-200 bg-red-50 text-red-700"
                                            />
                                            <ScoreChip
                                                label="TIU"
                                                value={session.scoreTiu}
                                                className="border-yellow-200 bg-yellow-50 text-yellow-800"
                                            />
                                            <ScoreChip
                                                label="TKP"
                                                value={session.scoreTkp}
                                                className="border-blue-200 bg-blue-50 text-blue-700"
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <Link
                                                href={`/cpns/dashboard/tryout/${session.id}/result?from=${session.isEvent ? 'event' : 'riwayat'}`}
                                                className="inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-3 py-2.5 md:px-2 md:py-2 lg:px-4 lg:py-3 text-xs md:text-[10px] lg:text-sm font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                                            >
                                                Lihat Hasil
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {totalPages > 1 ? (
                            <div className="flex flex-col gap-3 border-4 border-gray-900 bg-white px-4 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:flex-row md:items-center md:justify-between">
                                <p className="text-xs md:text-sm text-gray-600 font-sans">
                                    Menampilkan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredSessions.length)} dari {filteredSessions.length} riwayat
                                </p>
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center border-2 border-gray-900 bg-white px-3 py-2 text-xs font-black text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                                    >
                                        Sebelumnya
                                    </button>
                                    <div className="min-w-[88px] text-center text-xs font-black uppercase tracking-wide text-gray-700">
                                        {currentPage} / {totalPages}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center border-2 border-gray-900 bg-yellow-200 px-3 py-2 text-xs font-black text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="border-4 border-dashed border-gray-300 bg-gray-50 p-10 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)]">
                        <p className="text-2xl font-bold text-gray-900 mb-2">Tidak ada hasil yang cocok.</p>
                        <p className="text-sm text-gray-500 font-sans mb-6">
                            Coba ganti kata kunci pencarian atau reset filternya.
                        </p>
                        <button
                            onClick={() => {
                                setQuery('')
                                setTypeFilter('all')
                                setStatusFilter('all')
                                setSortMode('newest')
                                setPage(1)
                            }}
                            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white border-2 border-gray-900 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        >
                            Reset Filter
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
