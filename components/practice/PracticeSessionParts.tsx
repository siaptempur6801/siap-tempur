'use client'

import { memo, useEffect, useId, useRef, useState } from 'react'
import { Clock, X, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import DialogSurface from '@/components/ui/DialogSurface'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'

export interface Question {
  id: string
  content: string
  type: string
  category?: string
  sub_category?: string
  image_url?: string | null
  options: {
    id: string
    content: string
    image_url?: string | null
  }[]
}

export const QuestionPrompt = memo(function QuestionPrompt({ question }: { question: Question }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const previewTitleId = useId()

  return (
    <>
      {question.image_url && (
        <>
          <button
            type="button"
            aria-label="Perbesar ilustrasi soal"
            className="w-full max-w-sm mx-auto rounded-xl border border-border overflow-hidden shadow-xs bg-white relative cursor-pointer group"
            onClick={() => setPreviewImage(question.image_url!)}
          >
            <Image
              src={question.image_url}
              alt="Ilustrasi Soal"
              width={800}
              height={400}
              className="w-full h-auto object-contain max-h-[200px]"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white px-3 py-1.5 rounded-lg border border-border font-medium font-body text-sm shadow-sm flex items-center gap-2">
                <ZoomIn size={16} /> Perbesar Gambar
              </div>
            </div>
          </button>

          {previewImage && (
            <DialogSurface
              isOpen
              onClose={() => setPreviewImage(null)}
              labelledBy={previewTitleId}
              className="max-w-5xl border border-border bg-white p-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id={previewTitleId} className="text-base font-semibold text-foreground">
                  Ilustrasi soal
                </h2>
                <button
                  type="button"
                  data-autofocus
                  aria-label="Tutup gambar"
                  onClick={() => setPreviewImage(null)}
                  className="st-focus flex size-11 items-center justify-center rounded-lg border border-border hover:bg-muted"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="flex max-h-[calc(100dvh-7rem)] items-center justify-center overflow-auto rounded-lg border border-border p-2">
                <Image
                  src={previewImage}
                  alt="Ilustrasi soal diperbesar"
                  width={1200}
                  height={800}
                  className="max-h-[75dvh] max-w-full object-contain"
                  unoptimized
                />
              </div>
            </DialogSurface>
          )}
        </>
      )}
      <div className="prose max-w-none font-body text-foreground">
        <div className="text-lg md:text-xl leading-relaxed font-semibold whitespace-pre-wrap">
          <MathRenderer text={question.content} />
        </div>
      </div>
    </>
  )
})

export const QuestionOptionCard = memo(function QuestionOptionCard({
  option,
  index,
  isSelected,
  onSelect,
}: {
  option: Question['options'][number]
  index: number
  isSelected: boolean
  onSelect: (optionId: string) => void
}) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const previewTitleId = useId()

  return (
    <>
      <button
        type="button"
        data-testid={`answer-option-${index}`}
        onClick={() => onSelect(option.id)}
        className={cn(
          'w-full min-h-11 px-3 py-2 md:px-4 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 md:gap-4 group relative text-left touch-manipulation',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60 hover:bg-muted/40',
        )}
      >
        {isSelected && <div className="absolute inset-x-0 bottom-2 top-2 bg-blue-400/20 -z-10" />}

        <div
          className={cn(
            'size-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 font-body font-semibold text-sm transition-colors',
            isSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground group-hover:border-primary/60 group-hover:text-primary',
          )}
        >
          {String.fromCharCode(65 + index)}
        </div>
        <div
          className={cn(
            'flex-1 space-y-2 text-lg leading-relaxed font-body',
            isSelected ? 'font-semibold text-foreground' : 'text-foreground',
          )}
        >
          {option.image_url && (
            <div
              className="relative max-h-44 w-full max-w-sm rounded-lg border border-border bg-white overflow-hidden group/img cursor-pointer"
              onClick={(e) => {
                e.stopPropagation() // prevent selecting the option when clicking image
                setPreviewImage(option.image_url!)
              }}
            >
              <Image
                src={option.image_url}
                alt={`Pilihan ${String.fromCharCode(65 + index)}`}
                width={360}
                height={240}
                unoptimized
                className="w-full h-full object-contain max-h-44"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                <div className="bg-white p-2 rounded-full border border-border shadow-sm text-foreground">
                  <ZoomIn size={18} />
                </div>
              </div>
            </div>
          )}
          {option.content.trim() && <MathRenderer text={option.content} />}
        </div>
      </button>

      {previewImage && (
        <DialogSurface
          isOpen
          onClose={() => setPreviewImage(null)}
          labelledBy={previewTitleId}
          className="max-w-5xl border border-border bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id={previewTitleId} className="text-base font-semibold text-foreground">
              Gambar pilihan {String.fromCharCode(65 + index)}
            </h2>
            <button
              type="button"
              data-autofocus
              aria-label="Tutup gambar"
              onClick={() => setPreviewImage(null)}
              className="st-focus flex size-11 items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="flex max-h-[calc(100dvh-7rem)] items-center justify-center overflow-auto rounded-lg border border-border p-2">
            <Image
              src={previewImage}
              alt={`Gambar pilihan ${String.fromCharCode(65 + index)}`}
              width={1200}
              height={800}
              className="max-h-[75dvh] max-w-full object-contain"
              unoptimized
            />
          </div>
        </DialogSurface>
      )}
    </>
  )
})

export const TryoutTimerBadge = memo(function TryoutTimerBadge({
  endTime,
  hasFinished,
  onShowWarning5Min,
  onShowWarning1Min,
  onTimeExpired,
}: {
  endTime: string
  hasFinished: boolean
  onShowWarning5Min: () => void
  onShowWarning1Min: () => void
  onTimeExpired: () => void
}) {
  const [timeLeft, setTimeLeft] = useState('01:40:00')
  const [timeLeftMs, setTimeLeftMs] = useState(0)
  const warning5ShownRef = useRef(false)
  const warning1ShownRef = useRef(false)
  const expiredHandledRef = useRef(false)

  useEffect(() => {
    warning5ShownRef.current = false
    warning1ShownRef.current = false
    expiredHandledRef.current = false
  }, [endTime])

  useEffect(() => {
    if (!endTime || hasFinished) return

    const tick = () => {
      const now = Date.now()
      const end = new Date(endTime).getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft('00:00:00')
        setTimeLeftMs(0)

        if (!expiredHandledRef.current) {
          expiredHandledRef.current = true
          onTimeExpired()
        }
        return
      }

      setTimeLeftMs(diff)

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      )

      if (diff <= 5 * 60 * 1000 && diff > 60 * 1000 && !warning5ShownRef.current) {
        warning5ShownRef.current = true
        onShowWarning5Min()
      }

      if (diff <= 60 * 1000 && !warning1ShownRef.current) {
        warning1ShownRef.current = true
        onShowWarning1Min()
      }
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [endTime, hasFinished, onShowWarning5Min, onShowWarning1Min, onTimeExpired])

  return (
    <div
      className={cn(
        'px-2 py-1 md:px-4 md:py-1 rounded-full text-[10px] md:text-sm font-mono flex items-center gap-1 md:gap-1.5 transition-all duration-300 border',
        timeLeftMs <= 60000
          ? 'bg-danger-muted text-danger border-danger-border'
          : timeLeftMs <= 300000
            ? 'bg-warning-muted text-warning border-warning-border'
            : 'bg-info-muted text-info border-info-border',
      )}
    >
      <Clock size={11} className="md:w-3.5 md:h-3.5" />
      <span>{timeLeft}</span>
    </div>
  )
})
