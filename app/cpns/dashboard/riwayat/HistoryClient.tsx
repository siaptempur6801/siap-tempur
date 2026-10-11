'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3, FileSearch, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/brand/Mascot'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

type HistorySession = {
  id: string
  title: string
  kind: 'event' | 'full-tryout' | 'mini-tryout' | 'drilling-materi'
  isEvent: boolean
  subCategory?: string | null
  completedAt: string
  completedAtLabel: string
  totalScore: number
  scoreTwk: number
  scoreTiu: number
  scoreTkp: number
  passed: boolean | null
}

type TypeFilter = 'all' | 'event' | 'full-tryout' | 'mini-tryout' | 'drilling-materi'
type StatusFilter = 'all' | 'passed' | 'failed'
type SortMode = 'newest' | 'oldest' | 'highest'

interface HistoryClientProps {
  sessions: HistorySession[]
}

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Semua jenis' },
  { value: 'event', label: 'Event' },
  { value: 'full-tryout', label: 'Full Tryout' },
  { value: 'mini-tryout', label: 'Mini Tryout' },
  { value: 'drilling-materi', label: 'Latihan Fokus' },
]

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua hasil' },
  { value: 'passed', label: 'Target tercapai' },
  { value: 'failed', label: 'Perlu diperkuat' },
]

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'highest', label: 'Skor tertinggi' },
  { value: 'oldest', label: 'Terlama' },
]

function kindLabel(kind: HistorySession['kind']) {
  if (kind === 'drilling-materi') return 'Latihan Fokus'
  if (kind === 'mini-tryout') return 'Mini Tryout'
  if (kind === 'full-tryout') return 'Full Tryout'
  return 'Event'
}

function kindTone(kind: HistorySession['kind']) {
  if (kind === 'drilling-materi') return 'bg-brand-peach-100 text-brand-peach-800'
  if (kind === 'mini-tryout') return 'bg-green-100 text-green-800'
  if (kind === 'full-tryout') return 'bg-yellow-100 text-yellow-900'
  return 'bg-blue-100 text-blue-800'
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
      const searchText = [
        session.title,
        session.subCategory || '',
        session.completedAtLabel,
        kindLabel(session.kind),
      ]
        .join(' ')
        .toLowerCase()
      const matchesQuery = normalizedQuery.length === 0 || searchText.includes(normalizedQuery)
      const matchesType = typeFilter === 'all' || session.kind === typeFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'passed' && session.passed === true) ||
        (statusFilter === 'failed' && session.passed === false)
      return matchesQuery && matchesType && matchesStatus
    })

    next.sort((a, b) => {
      if (sortMode === 'highest')
        return (
          b.totalScore - a.totalScore ||
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )
      if (sortMode === 'oldest')
        return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    })
    return next
  }, [query, sessions, sortMode, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const resetFilters = () => {
    setQuery('')
    setTypeFilter('all')
    setStatusFilter('all')
    setSortMode('newest')
    setPage(1)
  }

  return (
    <div
      data-experience-mode="learning"
      data-program="cpns"
      className="st-product space-y-6 font-body text-foreground"
    >
      <PageHeader
        title="Hasil belajar"
        description="Cari sesi, filter jenis latihan, lalu buka hasil dan pembahasannya untuk melihat perkembangan sebelumnya."
      />

      {sessions.length > 0 && (
        <section className="st-card-md bg-white p-4 md:p-5" aria-label="Filter riwayat hasil">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Cari hasil
              </span>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Nama sesi, materi, atau tanggal"
                  className="st-input pl-10"
                />
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
              <FilterSelect
                label="Jenis"
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value as TypeFilter)
                  setPage(1)
                }}
                options={typeOptions}
              />
              <FilterSelect
                label="Hasil"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as StatusFilter)
                  setPage(1)
                }}
                options={statusOptions}
              />
              <FilterSelect
                label="Urutan"
                value={sortMode}
                onChange={(value) => {
                  setSortMode(value as SortMode)
                  setPage(1)
                }}
                options={sortOptions}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal size={14} aria-hidden="true" /> Menampilkan {filteredSessions.length}{' '}
            dari {sessions.length} hasil terbaru (maksimal 24)
          </div>
        </section>
      )}

      {filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {paginatedSessions.map((session) => (
            <article key={session.id} className="st-card bg-white p-4 md:p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium',
                        kindTone(session.kind),
                      )}
                    >
                      {kindLabel(session.kind)}
                    </span>
                    {session.passed !== null && (
                      <span
                        className={cn(
                          'rounded-md px-2 py-1 text-xs font-medium',
                          session.passed
                            ? 'bg-success-muted text-success'
                            : 'bg-danger-muted text-danger',
                        )}
                      >
                        {session.passed ? 'Target tercapai' : 'Perlu diperkuat'}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 break-words text-lg font-semibold text-foreground">
                    {session.title}
                  </h2>
                  {session.subCategory && session.kind === 'drilling-materi' && (
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {session.subCategory}
                    </p>
                  )}
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock3 size={14} aria-hidden="true" /> {session.completedAtLabel}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="grid grid-cols-4 gap-1.5 sm:min-w-[22rem]">
                    <ScoreChip
                      label="Total"
                      value={session.totalScore}
                      className="bg-[var(--st-yellow-soft)]"
                    />
                    <ScoreChip
                      label="TWK"
                      value={session.scoreTwk}
                      className="bg-red-50 text-red-800"
                    />
                    <ScoreChip
                      label="TIU"
                      value={session.scoreTiu}
                      className="bg-yellow-50 text-yellow-900"
                    />
                    <ScoreChip
                      label="TKP"
                      value={session.scoreTkp}
                      className="bg-blue-50 text-blue-800"
                    />
                  </div>
                  <Button asChild className="shrink-0">
                    <Link
                      href={`/cpns/dashboard/tryout/${session.id}/result?from=${session.isEvent ? 'event' : 'riwayat'}`}
                    >
                      Buka hasil <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}

          {totalPages > 1 && (
            <div className="st-card flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredSessions.length)} dari{' '}
                {filteredSessions.length} hasil
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <span className="min-w-16 text-center text-sm font-medium tabular-nums text-muted-foreground">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                  disabled={currentPage === totalPages}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : sessions.length === 0 ? (
        <section className="rounded-xl border border-border bg-white p-6 text-center">
          <Mascot name="tama" size="xs" tone="plain" className="mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Belum ada hasil belajar</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Mulai Mini Tryout atau Latihan Fokus. Hasil dan pembahasan akan muncul di sini setelah
            sesi selesai.
          </p>
          <Button asChild className="mt-5">
            <Link href="/cpns/dashboard/mini-tryout">
              Mulai Mini Tryout <ArrowRight size={16} />
            </Link>
          </Button>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-white p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <FileSearch size={20} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Tidak ada hasil yang cocok</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Ubah kata kunci atau kembalikan filter untuk melihat semua sesi.
          </p>
          <Button type="button" onClick={resetFilters} className="mt-5">
            Reset filter
          </Button>
        </section>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="st-input text-sm font-medium"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ScoreChip({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className={`min-w-0 rounded-lg border border-border px-2 py-2 text-center ${className}`}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  )
}
