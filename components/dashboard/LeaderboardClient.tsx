'use client'

import React from 'react'
import { Medal, Search, User, SearchX } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { getNationalLeaderboardAction } from '@/app/actions/leaderboard'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

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

export default function LeaderboardClient({
  data,
  currentUserId,
  periodText = 'Edisi Minggu Ini',
  currentUserRank,
}: LeaderboardClientProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [rankings, setRankings] = React.useState(data)
  const [resolvedCurrentUserRank, setResolvedCurrentUserRank] = React.useState(
    currentUserRank ?? null,
  )
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date | null>(null)
  const currentUserInTopRankings = rankings.some((entry) => entry.user_id === currentUserId)
  const showCurrentUserOutsideTop100 = Boolean(resolvedCurrentUserRank && !currentUserInTopRankings)

  React.useEffect(() => {
    let isMounted = true

    const refreshLeaderboard = async () => {
      const result = await getNationalLeaderboardAction()
      if (!isMounted || result.error) return

      setRankings(result.rankings)
      setResolvedCurrentUserRank(result.currentUserRank)
      setLastUpdatedAt(new Date())
    }

    const interval = window.setInterval(refreshLeaderboard, 30_000)
    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [])

  const filteredData = rankings.filter((entry) =>
    entry.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getRankIcon = (pos: number) => {
    if (pos === 1) return <Medal className="text-yellow-500 w-6 h-6" />
    if (pos === 2) return <Medal className="text-gray-400 w-6 h-6" />
    if (pos === 3) return <Medal className="text-amber-600 w-6 h-6" />
    return <span className="text-sm font-semibold text-muted-foreground">#{pos}</span>
  }

  return (
    <div
      data-experience-mode="learning"
      data-program="cpns"
      className="st-product font-body text-foreground"
    >
      <PageAnimateContainer className="space-y-6">
        {/* Header */}
        <PageAnimateItem>
          <PageHeader
            title="Ranking nasional"
            description={
              <>
                Top 100 pejuang CPNS · {periodText}
                {lastUpdatedAt && (
                  <span className="mt-1 block text-xs">
                    Diperbarui{' '}
                    {lastUpdatedAt.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Jakarta',
                    })}{' '}
                    WIB · otomatis setiap 30 detik
                  </span>
                )}
              </>
            }
            aside={
              <div className="relative w-full max-w-sm">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                  <Search size={18} aria-hidden="true" />
                </div>
                <input
                  type="text"
                  placeholder="Cari namamu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Cari peserta di ranking"
                  className="st-input min-h-11 w-full pl-10 pr-4 text-sm"
                />
              </div>
            }
          />
        </PageAnimateItem>

        {/* Table Layout */}
        <PageAnimateItem className="relative overflow-hidden rounded-xl border border-border bg-white shadow-xs">
          {/* Header Row */}
          <div className="hidden xl:grid grid-cols-12 bg-muted px-4 py-3 text-xs font-semibold text-muted-foreground border-b border-border">
            <div className="col-span-1 text-center">Pos</div>
            <div className="col-span-5 px-4 text-left">Nama Lengkap</div>
            <div className="col-span-1 text-center">TWK</div>
            <div className="col-span-1 text-center">TIU</div>
            <div className="col-span-1 text-center">TKP</div>
            <div className="col-span-3 text-center">Total skor</div>
          </div>

          {/* User Rows */}
          <div className="flex flex-col">
            {filteredData.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'relative border-b border-border transition-colors hover:bg-muted/40',
                    isCurrentUser && 'bg-info-muted/50 border-l-2 border-l-primary',
                    'xl:grid xl:grid-cols-12 xl:items-center',
                  )}
                >
                  {isCurrentUser && (
                    <div className="absolute right-3 top-3 rounded-md bg-info-muted px-2 py-1 text-xs font-medium text-info-foreground">
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
                        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
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
                          <div
                            className={cn(
                              'truncate text-sm font-semibold leading-tight',
                              isCurrentUser ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {entry.full_name || 'Pejuang Tanpa Nama'}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Total skor
                            </span>
                            <span className="text-base font-semibold tabular-nums text-foreground">
                              {entry.top_score}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Details: Compact Badges */}
                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-2">
                        <div className="flex flex-col items-center">
                          <span className="mb-1 text-xs font-medium text-muted-foreground">
                            TWK
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {entry.score_twk}
                          </span>
                        </div>
                        <div className="flex flex-col items-center border-x border-gray-200">
                          <span className="mb-1 text-xs font-medium text-muted-foreground">
                            TIU
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {entry.score_tiu}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="mb-1 text-xs font-medium text-muted-foreground">
                            TKP
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {entry.score_tkp}
                          </span>
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
                      <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
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
                      <div
                        className={cn(
                          'truncate text-sm font-semibold',
                          isCurrentUser ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {entry.full_name || 'Pejuang Tanpa Nama'}
                      </div>
                    </div>

                    {/* Score Columns */}
                    <div className="col-span-1 text-center py-4">
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {entry.score_twk}
                      </span>
                    </div>
                    <div className="col-span-1 text-center py-4">
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {entry.score_tiu}
                      </span>
                    </div>
                    <div className="col-span-1 text-center py-4">
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {entry.score_tkp}
                      </span>
                    </div>

                    {/* Total Score Column */}
                    <div className="col-span-3 text-center py-4">
                      <div className="inline-flex flex-col items-center">
                        <span className="rounded-lg bg-muted px-4 py-2 text-lg font-semibold tabular-nums text-foreground">
                          {entry.top_score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredData.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                  <SearchX size={32} />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold text-foreground">
                    {rankings.length === 0
                      ? 'Belum ada hasil tryout'
                      : searchQuery
                        ? 'Nama tidak ditemukan'
                        : 'Belum ada peserta di ranking'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {rankings.length === 0
                      ? 'Ranking akan terisi setelah hasil tryout tersedia.'
                      : searchQuery
                        ? 'Periksa ejaan nama atau tampilkan kembali semua peserta.'
                        : 'Cek kembali setelah ada hasil tryout baru.'}
                  </p>
                </div>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Tampilkan semua peserta
                  </Button>
                )}
              </div>
            )}

            {showCurrentUserOutsideTop100 && resolvedCurrentUserRank && (
              <div className="border-t border-info-border bg-info-muted p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-shrink-0 text-center sm:w-20">
                    <div className="text-xs font-medium text-muted-foreground">Posisi</div>
                    <div className="text-xl font-semibold text-info-foreground">
                      #{resolvedCurrentUserRank.rank_pos}
                    </div>
                  </div>
                  <div className="hidden h-14 w-px bg-info-border sm:block" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-info-foreground">
                      Posisi kamu belum masuk Top 100 saat ini
                    </div>
                    <div className="mt-0.5 text-xs text-info-foreground">
                      Skor terbaikmu: <strong>{resolvedCurrentUserRank.top_score}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center sm:flex">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">TWK</div>
                      <div className="text-sm font-semibold text-foreground">
                        {resolvedCurrentUserRank.score_twk}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">TIU</div>
                      <div className="text-sm font-semibold text-foreground">
                        {resolvedCurrentUserRank.score_tiu}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">TKP</div>
                      <div className="text-sm font-semibold text-foreground">
                        {resolvedCurrentUserRank.score_tkp}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legend / Footer */}
          <div className="p-4 bg-muted/40 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Pantau Terus Posisimu! Skor tertinggi dari mode Tryout akan membawamu ke puncak
              klasemen.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-medium text-muted-foreground">Juara Nasional</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground">Anda</span>
              </div>
            </div>
          </div>
        </PageAnimateItem>
      </PageAnimateContainer>
    </div>
  )
}
