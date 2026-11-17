'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  LayoutGrid,
  Lightbulb,
  X,
  XCircle,
  BookOpen,
} from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'
import type { TkaLevel } from '@/src/tka/context'
import type {
  UniversalReviewItem,
  UniversalReviewOption,
} from '@/src/services/practice-result.service'

interface Props {
  level: TkaLevel
  attemptId: string
  practiceKind: string | null
  backUrl: string
  items: UniversalReviewItem[]
  embedded?: boolean
  fullReviewUrl?: string
}

function practiceLabel(kind: string | null | undefined) {
  if (kind === 'mini_tryout') return 'Mini Tryout'
  if (kind === 'drill') return 'Latihan Fokus'
  return 'Tryout'
}

function groupedOptions(item: UniversalReviewItem) {
  const groups = new Map<string, UniversalReviewOption[]>()
  for (const option of item.options) {
    const key = option.responseGroup ?? 'Kelompok'
    const rows = groups.get(key) ?? []
    rows.push(option)
    groups.set(key, rows)
  }
  return Array.from(groups.entries())
}

function getReviewStatus(item: UniversalReviewItem): 'correct' | 'wrong' | 'unanswered' {
  if (item.selectedOptionIds.length === 0) return 'unanswered'
  if (item.isCorrect === true) return 'correct'
  return 'wrong'
}

export default function TkaInteractiveReviewClient({
  level,
  practiceKind,
  backUrl,
  items,
  embedded = false,
  fullReviewUrl,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [desktopPaletteOpen, setDesktopPaletteOpen] = useState(true)
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'wrong' | 'unanswered'>(
    'all',
  )
  const questionContainerRef = useRef<HTMLDivElement>(null)

  const togglePalette = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobilePaletteOpen((prev) => !prev)
    } else {
      setDesktopPaletteOpen((prev) => !prev)
    }
  }

  const totalQuestions = items.length
  const currentItem = items[currentIndex]

  const stats = useMemo(() => {
    let correct = 0
    let wrong = 0
    let unanswered = 0
    for (const item of items) {
      const status = getReviewStatus(item)
      if (status === 'correct') correct++
      else if (status === 'wrong') wrong++
      else unanswered++
    }
    return { correct, wrong, unanswered }
  }, [items])

  // Group items by subject for palette
  const subjectSections = useMemo(() => {
    const sections: {
      subjectCode: string
      startIndex: number
      items: { item: UniversalReviewItem; index: number }[]
    }[] = []
    let currentSubject = ''
    let currentGroup: { item: UniversalReviewItem; index: number }[] = []
    let groupStart = 0

    items.forEach((item, index) => {
      if (item.subjectCode !== currentSubject) {
        if (currentGroup.length > 0) {
          sections.push({
            subjectCode: currentSubject,
            startIndex: groupStart,
            items: currentGroup,
          })
        }
        currentSubject = item.subjectCode
        currentGroup = [{ item, index }]
        groupStart = index
      } else {
        currentGroup.push({ item, index })
      }
    })

    if (currentGroup.length > 0) {
      sections.push({ subjectCode: currentSubject, startIndex: groupStart, items: currentGroup })
    }

    return sections
  }, [items])

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalQuestions) return
      setCurrentIndex(index)
      if (questionContainerRef.current) {
        questionContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [totalQuestions],
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(currentIndex - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(currentIndex + 1)
      } else if (e.key === 'Escape') {
        setMobilePaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, goTo])

  if (!currentItem) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-2xl border border-border-strong bg-white p-6 shadow-xs max-w-md">
          <BookOpen className="mx-auto text-indigo-600 mb-3" size={36} />
          <h2 className="text-xl font-black text-slate-900">Belum ada soal untuk ditinjau</h2>
          <p className="mt-2 text-sm text-slate-500 font-semibold">
            Hasil evaluasi sesi ini belum memuat butir soal yang dapat dibuka.
          </p>
          <Link
            href={backUrl}
            className="st-focus mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
          >
            <ArrowLeft size={16} /> Kembali ke Hasil
          </Link>
        </div>
      </div>
    )
  }

  const currentSelected = new Set(currentItem.selectedOptionIds)
  const currentStatus = getReviewStatus(currentItem)

  const renderOptionRow = (option: UniversalReviewOption) => {
    const isSelected = currentSelected.has(option.id)
    const isCorrect = option.isCorrect

    let containerClass = 'border-slate-200 bg-white'
    let badgeClass = 'border-slate-300 bg-slate-100 text-slate-700'

    if (isSelected && isCorrect) {
      containerClass = 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
      badgeClass = 'border-emerald-700 bg-emerald-700 text-white'
    } else if (isSelected && !isCorrect) {
      containerClass = 'border-rose-400 bg-rose-50/70 ring-1 ring-rose-400'
      badgeClass = 'border-rose-600 bg-rose-600 text-white'
    } else if (!isSelected && isCorrect) {
      containerClass = 'border-emerald-400 bg-emerald-50/30'
      badgeClass = 'border-emerald-600 bg-emerald-100 text-emerald-800'
    }

    return (
      <div key={option.id} className={cn('rounded-xl border p-4 transition', containerClass)}>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black',
              badgeClass,
            )}
          >
            {option.key}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            {option.imageUrl && (
              <Image
                src={option.imageUrl}
                alt={`Pilihan ${option.key}`}
                width={640}
                height={360}
                unoptimized
                className="max-h-52 w-auto max-w-full rounded-lg border border-slate-200 object-contain"
              />
            )}
            {option.content && (
              <div className="text-sm font-semibold leading-relaxed text-slate-800 md:text-base">
                <MathRenderer text={option.content} />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {isSelected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                  Jawaban kamu
                </span>
              )}
              {isCorrect && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                  <CheckCircle2 size={12} /> Kunci jawaban
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPaletteContent = (onItemClick?: () => void) => (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={cn(
            'rounded-lg px-2 py-1.5 text-[11px] font-black transition',
            statusFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          Semua ({totalQuestions})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('correct')}
          className={cn(
            'rounded-lg px-2 py-1.5 text-[11px] font-black transition',
            statusFilter === 'correct'
              ? 'bg-emerald-700 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
          )}
        >
          Benar ({stats.correct})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('wrong')}
          className={cn(
            'rounded-lg px-2 py-1.5 text-[11px] font-black transition',
            statusFilter === 'wrong'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
          )}
        >
          Salah ({stats.wrong})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('unanswered')}
          className={cn(
            'rounded-lg px-2 py-1.5 text-[11px] font-black transition',
            statusFilter === 'unanswered'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          Kosong ({stats.unanswered})
        </button>
      </div>

      {/* Subject Sections */}
      {subjectSections.map((section) => {
        const filteredSectionItems = section.items.filter(({ item }) => {
          if (statusFilter === 'all') return true
          return getReviewStatus(item) === statusFilter
        })

        if (filteredSectionItems.length === 0) return null

        return (
          <div key={section.subjectCode} className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs font-black uppercase tracking-wider text-slate-500">
              <span>{section.subjectCode}</span>
              <span>{section.items.length} Soal</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 2xl:grid-cols-6">
              {filteredSectionItems.map(({ item, index }) => {
                const status = getReviewStatus(item)
                const isCurrent = currentIndex === index

                let colorClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                if (status === 'correct') {
                  colorClass = 'bg-emerald-700 text-white hover:bg-emerald-800 border-emerald-700'
                } else if (status === 'wrong') {
                  colorClass = 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600'
                }

                return (
                  <button
                    type="button"
                    key={item.questionId}
                    onClick={() => {
                      goTo(index)
                      onItemClick?.()
                    }}
                    aria-label={`Buka nomor ${item.position}, status: ${status}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={cn(
                      'relative flex aspect-square w-full items-center justify-center rounded-lg border text-xs font-black transition',
                      colorClass,
                      isCurrent &&
                        'ring-2 ring-indigo-500 ring-offset-2 scale-105 shadow-sm font-black',
                    )}
                  >
                    {item.position}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold text-slate-600 space-y-1.5">
        <div className="text-xs font-black uppercase tracking-wider text-slate-600">
          Keterangan Warna
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-600" /> Benar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-rose-600" /> Salah
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-slate-200 border border-slate-300" /> Kosong
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className={cn(
        'flex flex-col bg-white text-slate-900',
        embedded
          ? 'min-h-[640px] lg:h-[720px] rounded-3xl border border-slate-200 shadow-sm overflow-hidden'
          : 'h-screen',
      )}
    >
      {/* Top Bar */}
      {embedded ? (
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
              {currentItem.subjectCode}
            </span>
            <h3 className="text-sm md:text-base font-black text-slate-900">
              Soal {currentItem.position} dari {totalQuestions}
            </h3>
            <span className="hidden sm:inline-block text-xs font-bold text-slate-300">|</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
              {currentItem.responseType === 'category' ? 'Kategori' : 'Pilihan Ganda'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {fullReviewUrl && (
              <Link
                href={fullReviewUrl}
                className="st-focus inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border-strong bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-[0.98]"
                title="Buka pembahasan dalam mode satu layar penuh"
              >
                <ExternalLink size={13} className="shrink-0 text-slate-500" />
                <span className="hidden sm:inline whitespace-nowrap">Layar Penuh</span>
              </Link>
            )}
            <button
              type="button"
              onClick={togglePalette}
              aria-label="Buka atau tutup navigasi soal"
              className={cn(
                'st-focus inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition active:scale-[0.98]',
                desktopPaletteOpen || mobilePaletteOpen
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <LayoutGrid size={14} className="shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">
                {desktopPaletteOpen ? 'Tutup Kisi' : 'Buka Kisi'}
              </span>
              <span className="md:hidden whitespace-nowrap">Kisi</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={backUrl}
              className="st-focus inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              aria-label="Kembali ke ringkasan hasil tryout"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Ringkasan Hasil</span>
            </Link>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                Pembahasan {practiceLabel(practiceKind)} · TKA/{level}
              </div>
              <h1 className="text-sm md:text-base font-black text-slate-900">
                Soal {currentItem.position} dari {totalQuestions}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compact stats pill */}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 size={13} /> {stats.correct}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-200">
                <XCircle size={13} /> {stats.wrong}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                <CircleAlert size={13} /> {stats.unanswered}
              </span>
            </div>

            {/* Toggle Palette Button */}
            <button
              type="button"
              onClick={togglePalette}
              aria-label="Buka atau tutup navigasi soal"
              className={cn(
                'st-focus inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs md:text-sm font-black transition',
                desktopPaletteOpen || mobilePaletteOpen
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <LayoutGrid size={16} />
              <span className="hidden md:inline">
                {desktopPaletteOpen ? 'Tutup Navigasi' : 'Navigasi Soal'}
              </span>
              <span className="md:hidden">Navigasi</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Question and Answer Pane */}
        <main className="flex flex-1 flex-col min-w-0 bg-slate-50/50">
          {/* Question Sub-header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
                {currentItem.subjectCode}
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {currentItem.responseType === 'category' ? 'Kategori' : 'Pilihan Ganda'}
              </span>
            </div>

            {/* Status Badge */}
            <div>
              {currentStatus === 'correct' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                  <CheckCircle2 size={15} /> Jawaban Benar (+{currentItem.scoreAwarded} poin)
                </span>
              ) : currentStatus === 'wrong' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                  <XCircle size={15} /> Belum Tepat ({currentItem.scoreAwarded}/
                  {currentItem.maxScore} poin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  <CircleAlert size={15} /> Tidak Dijawab (0/{currentItem.maxScore} poin)
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Question Content */}
          <div ref={questionContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {/* Stimulus Box */}
              {currentItem.stimulus && (
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 md:p-6 space-y-3">
                  {currentItem.stimulus.title && (
                    <h3 className="text-base md:text-lg font-black text-slate-900">
                      {currentItem.stimulus.title}
                    </h3>
                  )}
                  {currentItem.stimulus.imageUrl && (
                    <div className="flex justify-center">
                      <Image
                        src={currentItem.stimulus.imageUrl}
                        alt="Stimulus soal"
                        width={900}
                        height={500}
                        unoptimized
                        className="max-h-72 w-auto max-w-full rounded-xl border border-slate-200 object-contain"
                      />
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700 md:text-base">
                    <MathRenderer text={currentItem.stimulus.content} />
                  </div>
                  {currentItem.stimulus.sourceReference && (
                    <div className="text-xs italic text-slate-600">
                      Sumber: {currentItem.stimulus.sourceReference}
                    </div>
                  )}
                </section>
              )}

              {/* Question Stem */}
              <div className="whitespace-pre-wrap text-base md:text-lg font-bold leading-relaxed text-slate-950">
                <MathRenderer text={currentItem.stem} />
              </div>

              {/* Options Area */}
              <div className="space-y-3">
                {currentItem.responseType === 'category'
                  ? groupedOptions(currentItem).map(([group, options]) => (
                      <section
                        key={group}
                        className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                          {group}
                        </h4>
                        <div className="space-y-2">
                          {options.map((option) => renderOptionRow(option))}
                        </div>
                      </section>
                    ))
                  : currentItem.options.map((option) => renderOptionRow(option))}
              </div>

              {/* Explanation Card */}
              <section className="rounded-xl border border-border-strong bg-white p-5 md:p-6 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Lightbulb size={18} className="text-slate-500" />
                  Pembahasan Lengkap
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800 md:text-base">
                  {currentItem.explanation ? (
                    <MathRenderer text={currentItem.explanation} />
                  ) : (
                    <span className="text-slate-500 italic">
                      Pembahasan belum tersedia untuk soal ini.
                    </span>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 md:px-8">
            <div className="mx-auto flex max-w-4xl items-center justify-between">
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="st-focus inline-flex items-center gap-2 rounded-xl border border-border-strong bg-white px-4 py-2 text-xs md:text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={17} />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              <div className="text-xs md:text-sm font-bold text-slate-500">
                Soal <span className="font-black text-slate-900">{currentIndex + 1}</span> dari{' '}
                <span className="font-black text-slate-900">{totalQuestions}</span>
              </div>

              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === totalQuestions - 1}
                className="st-focus inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs md:text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        </main>

        {/* Desktop Sidebar Palette */}
        <aside
          className={cn(
            'hidden w-80 shrink-0 flex-col border-l border-slate-200 bg-white 2xl:w-96',
            desktopPaletteOpen ? 'lg:flex' : 'lg:hidden',
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3.5">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <LayoutGrid size={17} /> Navigasi Soal
            </div>
            <span className="text-xs font-bold text-slate-500">{totalQuestions} Butir</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderPaletteContent()}</div>
        </aside>
      </div>

      {/* Mobile Sidebar Palette Drawer */}
      {mobilePaletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobilePaletteOpen(false)}
        >
          <aside
            className="ml-auto flex h-full w-[min(88vw,340px)] flex-col border-l border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <LayoutGrid size={17} /> Navigasi Soal
              </div>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                aria-label="Tutup navigasi soal"
                className="st-focus flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-white text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderPaletteContent(() => setMobilePaletteOpen(false))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
