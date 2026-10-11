'use client'

import { useMemo, useRef, useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Loader2,
  Trophy,
  Clock,
  Users,
  BookOpen,
  CheckCircle2,
  Lock,
  Radio,
  Check,
  CreditCard,
  Ticket,
  ExternalLink,
  Award,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { registerTryoutEvent, startTryoutEvent } from '@/app/actions/event'
import { cn } from '@/lib/utils'
import { canViewCompletedEventLeaderboard } from '@/lib/event-access'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'
import { getEventState, isEventDone, SUCCESS_PAYMENT } from '@/lib/event-state'
import { Button } from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import type { EventClientProps, EventStatus, UserEvent } from './event-types'
import { ConfirmModal, CertificateModal, EventPaymentModal } from './EventModals'
import { formatEventDate } from './event-utils'

function getEffectiveEventStatus(event: UserEvent, now: number): EventStatus {
  const startsAt = new Date(event.starts_at).getTime()
  const endsAt = new Date(event.ends_at).getTime()

  if (event.status === 'closed' || now > endsAt) return 'closed'
  if (now >= startsAt && now <= endsAt) return 'live'
  return 'scheduled'
}

function getDisplayEventStatus(event: UserEvent, now: number | null): EventStatus {
  return now == null ? event.status : getEffectiveEventStatus(event, now)
}

function CountdownBadge({
  targetMs,
  label,
  now,
}: {
  targetMs: number
  label: string
  now: number
}) {
  const diff = targetMs - now
  if (diff <= 0) return null
  const totalH = Math.floor(diff / 3600000)
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning-border bg-warning-muted px-3 py-2 text-sm font-medium text-warning">
      <Clock size={14} className="shrink-0" />
      <span>{label} </span>
      <span className="font-mono">
        {d > 0 && `${d}h `}
        {h > 0 && `${h}j `}
        {m}m {String(s).padStart(2, '0')}d
      </span>
    </div>
  )
}

function EventTimeStatus({
  startsAt,
  endsAt,
  now,
}: {
  startsAt: number
  endsAt: number
  now: number | null
}) {
  if (now == null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground">
        <Clock size={14} className="shrink-0" />
        <span>Mulai {formatEventDate(new Date(startsAt).toISOString())}</span>
      </div>
    )
  }

  if (now < startsAt) {
    return <CountdownBadge targetMs={startsAt} label="Event akan dimulai dalam" now={now} />
  }

  if (now <= endsAt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success-border bg-success-muted px-3 py-2 text-sm font-medium text-success">
        <Radio size={14} className="shrink-0" aria-hidden="true" />
        <span>Event sedang berlangsung</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground">
      <Clock size={14} className="shrink-0" />
      <span>Event telah berakhir pada {formatEventDate(new Date(endsAt).toISOString())}</span>
    </div>
  )
}

// --- Timeline Step ---
const STEPS = ['Daftar', 'Menunggu', 'Mulai', 'Selesai']

function StatusTimeline({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const isActive = i === step
        const isDone = i < step
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border border-border text-xs font-medium transition-colors',
                  isDone ? 'bg-green-400' : isActive ? 'bg-yellow-300' : 'bg-gray-100',
                )}
              >
                {isDone ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span
                className={cn(
                  'mt-1 text-[9px] font-semibold uppercase tracking-wider',
                  isActive ? 'text-gray-900' : 'text-gray-400',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn('h-0.5 w-8 -mt-3 mx-0.5', isDone ? 'bg-green-400' : 'bg-gray-200')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- Single Event Card ---
function EventCard({
  event,
  now,
  onAction,
  onCertificate,
  isPending,
  isPriorityImage,
}: {
  event: UserEvent
  now: number | null
  onAction: (event: UserEvent) => void
  onCertificate: (event: UserEvent) => void
  isPending: boolean
  isPriorityImage: boolean
}) {
  const startsAt = new Date(event.starts_at).getTime()
  const endsAt = new Date(event.ends_at).getTime()
  const logicNow = now ?? startsAt - 1
  const state = getEventState(event, logicNow)
  const effectiveStatus = getDisplayEventStatus(event, now)
  const isLive = effectiveStatus === 'live'
  const hasTicket = Boolean(event.participant_id) || SUCCESS_PAYMENT.has(event.payment_status || '')
  const canViewEventLeaderboard = canViewCompletedEventLeaderboard({
    event,
    participantId: event.participant_id,
    now: new Date(logicNow),
  })
  // Memakai helper yang sama dengan `getEventState` supaya tombol sertifikat
  // dan label status tidak pernah berbeda pendapat.
  const isDone = isEventDone(event, logicNow)
  const canUseCertificate = Boolean(
    isDone &&
    event.certificate_enabled &&
    event.certificate_released_at &&
    effectiveStatus === 'closed',
  )

  const statusConfig = {
    live: {
      label: 'Sedang berlangsung',
      bg: 'bg-danger-muted',
      text: 'text-danger',
      border: 'border-danger-border',
    },
    scheduled: {
      label: 'Akan datang',
      bg: 'bg-warning-muted',
      text: 'text-warning',
      border: 'border-warning-border',
    },
    closed: {
      label: 'Selesai',
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
    },
  }[effectiveStatus]
  const eventStats = [
    { icon: CalendarDays, label: 'Mulai', value: formatEventDate(event.starts_at) },
    { icon: Clock, label: 'Durasi', value: `${event.duration_minutes}m` },
    { icon: BookOpen, label: 'Soal', value: `${event.question_count}` },
    {
      icon: Users,
      label: 'Kuota',
      value: event.max_participants ? `${event.max_participants} peserta` : 'Tidak dibatasi',
    },
  ]

  return (
    <article
      data-event-live={isLive || undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card shadow-xs',
        isLive && 'border-danger-border',
      )}
    >
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(230px,320px)_1fr_220px] lg:items-start">
        {/* --- Poster --- */}
        <div className="w-full max-w-[360px] justify-self-center lg:max-w-none lg:justify-self-stretch">
          {event.flyer_image_url && (
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted">
              <Image
                src={event.flyer_image_url}
                alt={`Flyer ${event.title}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 360px, calc(100vw - 32px)"
                priority={isPriorityImage}
              />
            </div>
          )}
        </div>

        {/* --- Main Info --- */}
        <div className="space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                statusConfig.border,
                statusConfig.bg,
                statusConfig.text,
              )}
            >
              {statusConfig.label}
            </span>
            {event.participant_id && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-muted px-2.5 py-1 text-xs font-medium text-success">
                <Check size={10} /> Terdaftar
              </span>
            )}
            {event.requires_code && effectiveStatus !== 'closed' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Lock size={10} /> Kode Masuk
              </span>
            )}
            {event.is_paid && event.price > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-muted px-2.5 py-1 text-xs font-medium text-warning">
                <Ticket size={10} /> Berbayar
              </span>
            )}
          </div>

          {/* Title & Desc */}
          <div>
            <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {event.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-gray-600">
              {event.description || 'Tryout Akbar SKD CPNS nasional.'}
            </p>
          </div>

          {/* Meta info */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {eventStats.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.label} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon size={12} />
                    {item.label}
                  </div>
                  <p className="text-sm font-medium leading-snug text-foreground">{item.value}</p>
                </div>
              )
            })}
          </div>

          {/* Time Status */}
          <EventTimeStatus startsAt={startsAt} endsAt={endsAt} now={now} />

          {/* Timeline */}
          <div className="pt-1">
            <StatusTimeline step={state.step} />
          </div>
        </div>

        {/* --- RIGHT: Action --- */}
        <div className="space-y-3 lg:sticky lg:top-24">
          {/* Price info for paid events */}
          {event.is_paid && event.price > 0 && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3',
                hasTicket
                  ? 'border-success-border bg-success-muted'
                  : 'border-warning-border bg-warning-muted',
              )}
            >
              <CreditCard
                className={cn('size-5 shrink-0', hasTicket ? 'text-success' : 'text-warning')}
                aria-hidden="true"
              />
              <div>
                <p
                  className={cn('text-xs font-medium', hasTicket ? 'text-success' : 'text-warning')}
                >
                  Harga tiket
                </p>
                <p className="text-base font-semibold text-foreground">
                  {hasTicket ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={16} /> Terdaftar
                    </span>
                  ) : (
                    `Rp ${event.price.toLocaleString('id-ID')}`
                  )}
                </p>
              </div>
            </div>
          )}
          {event.group_link && (
            <Button asChild variant="outline" className="w-full">
              <a href={event.group_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} aria-hidden="true" /> Gabung grup
              </a>
            </Button>
          )}
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 shrink-0 text-yellow-500" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Ranking event</p>
                <p className="text-xs text-foreground">Terpisah dari ranking nasional</p>
              </div>
            </div>
            {canViewEventLeaderboard && (
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link href={`/cpns/live/${event.id}`} target="_blank" rel="noopener noreferrer">
                  <Trophy size={14} aria-hidden="true" /> Lihat ranking event
                </Link>
              </Button>
            )}
          </div>
          {canUseCertificate && (
            <Button
              type="button"
              variant="success"
              className="w-full"
              onClick={() => onCertificate(event)}
            >
              {event.certificate_number && event.certificate_name_locked_at ? (
                <Download size={16} />
              ) : (
                <Award size={16} />
              )}
              {event.certificate_number && event.certificate_name_locked_at
                ? 'Lihat sertifikat'
                : 'Klaim sertifikat'}
            </Button>
          )}
          {event.max_participants && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <Users className="h-5 w-5 shrink-0 text-gray-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase text-gray-400">Kuota</p>
                <p className="text-xs font-bold text-gray-800">{event.max_participants} peserta</p>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant={
              state.action === 'pay' || state.action === 'check_payment'
                ? 'warning'
                : state.action === 'history'
                  ? 'outline'
                  : 'primary'
            }
            className="w-full"
            disabled={state.action === 'disabled' || isPending}
            aria-busy={isPending}
            onClick={() => onAction(event)}
          >
            {isPending ? (
              <Loader2 className="animate-spin" size={18} />
            ) : state.action === 'pay' || state.action === 'check_payment' ? (
              <CreditCard size={18} />
            ) : (
              <ArrowRight size={18} />
            )}
            {state.action === 'pay' || state.action === 'check_payment'
              ? `Beli tiket Rp ${event.price.toLocaleString('id-ID')}`
              : state.label}
          </Button>
        </div>
      </div>
    </article>
  )
}

export default function EventClient({ events }: EventClientProps) {
  const [now, setNow] = useState<number | null>(null)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const [confirmEvent, setConfirmEvent] = useState<UserEvent | null>(null)
  const [paymentEvent, setPaymentEvent] = useState<UserEvent | null>(null)
  const [certificateEvent, setCertificateEvent] = useState<UserEvent | null>(null)
  const [eventCodes, setEventCodes] = useState<Record<string, string>>({})
  const eventStartLockRef = useRef(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Update `now` every second so states recalculate
  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    const timeout = window.setTimeout(updateNow, 0)
    const interval = window.setInterval(updateNow, 1000)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [])

  const grouped = useMemo(() => {
    const live = events.filter((e) => getDisplayEventStatus(e, now) === 'live')
    const scheduled = events.filter((e) => getDisplayEventStatus(e, now) === 'scheduled')
    const closed = events
      .filter((e) => getDisplayEventStatus(e, now) === 'closed')
      .sort((left, right) => {
        const rightTime = new Date(right.ends_at || right.starts_at).getTime()
        const leftTime = new Date(left.ends_at || left.starts_at).getTime()

        return rightTime - leftTime
      })
    return { live, scheduled, closed }
  }, [events, now])

  const summary = useMemo(
    () => ({
      total: grouped.live.length + grouped.scheduled.length,
      registered: [...grouped.live, ...grouped.scheduled].filter((e) => e.participant_id).length,
      live: grouped.live.length,
      closed: grouped.closed.length,
    }),
    [grouped],
  )

  const doAction = (event: UserEvent) => {
    if (now == null) return
    const state = getEventState(event, now)
    if (state.action === 'disabled') return
    if (state.action === 'history') {
      // Jaring pengaman: halaman hasil membaca attempt berdasarkan id, jadi
      // tanpa attempt jangan pernah diarahkan ke sana. `getEventState` sudah
      // menjaga ini; penjaga di sini mencegah navigasi rusak bila keadaan
      // itu lolos karena suatu hal.
      if (!event.session_id) {
        toast.info('Riwayat pengerjaan event ini tidak tersedia untuk akunmu.')
        return
      }
      router.push(`${event.session_path}/${event.session_id}/result?from=event`)
      return
    }
    // Payment actions
    if (state.action === 'pay') {
      setPaymentEvent(event)
      return
    }
    if (state.action === 'check_payment') {
      // Re-open modal in check-status mode
      setPaymentEvent(event)
      return
    }
    // For register: no confirm needed, just go
    if (state.action === 'register') {
      setPendingEventId(event.id)
      startTransition(async () => {
        const result = await registerTryoutEvent(event.id, eventCodes[event.id])
        setPendingEventId(null)
        if (!result.success) {
          toast.error(result.message)
          return
        }
        toast.success(result.message || 'Berhasil daftar event')
        router.refresh()
      })
      return
    }
    // For start: show confirm modal
    setConfirmEvent(event)
  }

  const doCertificate = (event: UserEvent) => {
    if (event.certificate_number && event.certificate_name_locked_at) {
      router.push(`/cpns/dashboard/certificates/${encodeURIComponent(event.certificate_number)}`)
      return
    }

    setCertificateEvent(event)
  }

  const handleCertificateClaimed = (certificateNumber: string) => {
    setCertificateEvent(null)
    router.refresh()
    router.push(`/cpns/dashboard/certificates/${encodeURIComponent(certificateNumber)}`)
  }

  const submitEventCode = (event: UserEvent) => {
    const code = (eventCodes[event.id] || '').trim()
    if (!code) {
      toast.error('Masukkan kode masuk terlebih dahulu')
      return
    }

    setPendingEventId(event.id)
    startTransition(async () => {
      const result = await registerTryoutEvent(event.id, code)
      setPendingEventId(null)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message || 'Berhasil daftar event dengan kode')
      setEventCodes((current) =>
        Object.fromEntries(Object.entries(current).filter(([eventId]) => eventId !== event.id)),
      )
      router.refresh()
    })
  }

  const handleConfirmStart = () => {
    if (!confirmEvent) return
    if (!acquireSingleFlightLock(eventStartLockRef)) return
    const eventId = confirmEvent.id
    setPendingEventId(confirmEvent.id)
    startTransition(async () => {
      let isNavigating = false
      try {
        const result = await startTryoutEvent(eventId)
        setConfirmEvent(null)
        if (!result.success) {
          toast.error(result.message)
          return
        }
        toast.success(result.message || 'Tryout Akbar dimulai')
        if ('sessionId' in result && result.sessionId) {
          router.push(`${result.sessionPath}/${result.sessionId}`)
          isNavigating = true
        } else {
          router.refresh()
        }
      } catch {
        toast.error('Tryout Akbar belum bisa dimulai')
      } finally {
        setPendingEventId(null)
        if (!isNavigating) releaseSingleFlightLock(eventStartLockRef)
      }
    })
  }

  const sections: Array<{
    label: string
    icon: React.ReactNode
    events: UserEvent[]
    accent: string
  }> = [
    {
      label: 'Live Sekarang',
      icon: <Radio size={18} className="text-red-600" />,
      events: grouped.live,
      accent: 'text-red-600',
    },
    {
      label: 'Akan Datang',
      icon: <Clock size={18} className="text-blue-700" />,
      events: grouped.scheduled,
      accent: 'text-blue-700',
    },
    {
      label: 'Sudah Selesai',
      icon: <CheckCircle2 size={18} className="text-gray-500" />,
      events: grouped.closed,
      accent: 'text-gray-500',
    },
  ]
  const firstFlyerId = events.find((event) => Boolean(event.flyer_image_url))?.id

  return (
    <div
      data-experience-mode="learning"
      data-program="cpns"
      className="st-product space-y-6 font-body text-foreground"
    >
      <PageHeader
        eyebrow={
          <>
            <CalendarDays size={14} aria-hidden="true" /> Event resmi Siap Tempur
          </>
        }
        title="Tryout Akbar & Event Live"
        description="Daftar event, masukkan kode bila diperlukan, lalu mulai tryout sesuai jadwal."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            'Event Aktif',
            summary.total,
            <CalendarDays key="event-active-icon" size={20} className="text-blue-500" />,
          ],
          [
            'Terdaftar',
            summary.registered,
            <Check key="registered-icon" size={20} className="text-green-600" />,
          ],
          ['Live', summary.live, <Radio key="live-icon" size={20} className="text-red-500" />],
          [
            'Selesai',
            summary.closed,
            <CheckCircle2 key="closed-event-icon" size={20} className="text-gray-500" />,
          ],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="st-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label as string}</p>
              <span>{icon as React.ReactNode}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {value as number}
            </p>
          </div>
        ))}
      </div>

      {/* No events at all */}
      {events.length === 0 ? (
        <div className="st-card-md p-8 text-center">
          <CalendarDays className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Belum ada event terbuka</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cek lagi nanti saat Tryout Akbar dibuka.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map(({ label, icon, events: sectionEvents, accent }) => {
            if (sectionEvents.length === 0) return null
            return (
              <div key={label} className="space-y-4">
                <div className={cn('flex items-center gap-2', accent)}>
                  {icon}
                  <h2 className={cn('text-lg font-semibold tracking-tight', accent)}>{label}</h2>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {sectionEvents.length}
                  </span>
                  <div className="flex-1 h-0.5 bg-gray-200" />
                </div>

                {sectionEvents.map((event) => (
                  <div key={event.id}>
                    {/* Inline code input if needs code + not registered */}
                    {event.requires_code &&
                      !event.participant_id &&
                      getDisplayEventStatus(event, now) !== 'closed' && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            if (isPending) return
                            submitEventCode(event)
                          }}
                          className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-info-border bg-info-muted p-3"
                        >
                          <Lock size={14} className="shrink-0 text-info" aria-hidden="true" />
                          <label
                            htmlFor={`event-code-${event.id}`}
                            className="text-sm font-medium text-info-foreground"
                          >
                            Kode masuk
                          </label>
                          <input
                            id={`event-code-${event.id}`}
                            value={eventCodes[event.id] || ''}
                            onChange={(e) =>
                              setEventCodes((cur) => ({
                                ...cur,
                                [event.id]: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="MASUKKAN KODE"
                            enterKeyHint="go"
                            autoComplete="off"
                            className="st-input min-w-0 flex-1"
                          />
                          <Button
                            type="submit"
                            disabled={isPending || !(eventCodes[event.id] || '').trim()}
                            className="shrink-0"
                          >
                            {isPending && pendingEventId === event.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <ArrowRight size={13} />
                            )}
                            Masuk event
                          </Button>
                        </form>
                      )}
                    <EventCard
                      event={event}
                      now={now}
                      onAction={doAction}
                      onCertificate={doCertificate}
                      isPending={isPending && pendingEventId === event.id}
                      isPriorityImage={event.id === firstFlyerId}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmEvent && (
        <ConfirmModal
          event={confirmEvent}
          onConfirm={handleConfirmStart}
          onCancel={() => setConfirmEvent(null)}
          isLoading={isPending}
        />
      )}

      {/* Payment Modal */}
      {certificateEvent && (
        <CertificateModal
          event={certificateEvent}
          onClose={() => setCertificateEvent(null)}
          onClaimed={handleCertificateClaimed}
        />
      )}

      {paymentEvent && (
        <EventPaymentModal
          event={paymentEvent}
          onClose={() => setPaymentEvent(null)}
          onSuccess={() => {
            setPaymentEvent(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
