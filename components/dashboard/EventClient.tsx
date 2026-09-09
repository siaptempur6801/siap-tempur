'use client'

import { useMemo, useRef, useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, Loader2, Trophy, Clock, Users, BookOpen, CheckCircle2, AlertTriangle, Zap, Lock, Radio, Check, CreditCard, RefreshCw, Ticket, ExternalLink, Award, Download } from 'lucide-react'
import { toast } from 'sonner'
import { registerTryoutEvent, startTryoutEvent } from '@/app/actions/event'
import { claimEventCertificate } from '@/app/actions/event-certificate'
import { createEventPaymentTransaction, syncEventPaymentStatus } from '@/app/actions/event-payment'
import { EventCertificatePreview } from '@/components/certificates/EventCertificatePreview'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { canViewCompletedEventLeaderboard } from '@/lib/event-access'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

type EventStatus = 'scheduled' | 'live' | 'closed'

type UserEvent = {
    id: string
    title: string
    description: string | null
    starts_at: string
    ends_at: string
    start_grace_minutes: number
    duration_minutes: number
    max_participants: number | null
    requires_code: boolean
    group_link: string | null
    flyer_image_url: string | null
    is_paid: boolean
    price: number
    status: EventStatus
    certificate_enabled: boolean
    certificate_released_at: string | null
    certificate_number: string | null
    certificate_name: string | null
    certificate_kind: string | null
    certificate_name_locked_at: string | null
    participant_id: string | null
    participant_status: string | null
    session_id: string | null
    event_session_status: string | null
    test_session_status: string | null
    question_count: number
    // Payment
    payment_status: string | null
    payment_order_id: string | null
    payment_snap_token: string | null
}

interface EventClientProps {
    events: UserEvent[]
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

const SUCCESS_PAYMENT = new Set(['capture', 'settlement'])

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

function getEventState(event: UserEvent, now: number) {
    const startsAt = new Date(event.starts_at).getTime()
    const endsAt = new Date(event.ends_at).getTime()
    const latestStartAt = startsAt + event.start_grace_minutes * 60 * 1000
    const canUseScheduleWindow = event.status === 'scheduled' || event.status === 'live'

    const isDone =
        event.session_id &&
        (event.test_session_status === 'completed' ||
            event.event_session_status === 'completed' ||
            event.participant_status === 'completed')

    const canStart = canUseScheduleWindow && now >= startsAt && now <= latestStartAt && now <= endsAt

    if (isDone) return { label: 'Lihat Hasil', action: 'history' as const, step: 3 }
    if (event.session_id) return { label: 'Lanjutkan', action: 'start' as const, step: 2 }
    if (event.status === 'closed') return { label: 'Event Berakhir', action: 'disabled' as const, step: 3 }
    if (canUseScheduleWindow && now > endsAt) return { label: 'Event Berakhir', action: 'disabled' as const, step: 3 }

    // Registration is the source of truth for event access.
    if (event.participant_id) {
        if (canStart) return { label: 'Mulai Tryout', action: 'start' as const, step: 2 }
        if (canUseScheduleWindow && now > latestStartAt) return { label: 'Waktu Masuk Ditutup', action: 'disabled' as const, step: 1 }
        return { label: 'Menunggu Jadwal', action: 'disabled' as const, step: 1 }
    }

    // Paid event gate only applies before registration exists.
    if (event.is_paid && event.price > 0) {
        const hasPaid = event.payment_status != null && SUCCESS_PAYMENT.has(event.payment_status)
        const hasPendingPayment = event.payment_status === 'pending'

        if (!hasPaid) {
            if (hasPendingPayment) return { label: `Beli Tiket`, action: 'check_payment' as const, step: 0 }
            return { label: `Beli Tiket`, action: 'pay' as const, step: 0 }
        }
    }

    if (!event.participant_id) return { label: 'Daftar Sekarang', action: 'register' as const, step: 0 }
    if (canStart) return { label: 'Mulai Tryout', action: 'start' as const, step: 2 }
    if (canUseScheduleWindow && now > latestStartAt) return { label: 'Waktu Masuk Ditutup', action: 'disabled' as const, step: 1 }
    return { label: 'Menunggu Jadwal', action: 'disabled' as const, step: 1 }
}

function CountdownBadge({ targetMs, label, now }: { targetMs: number; label: string; now: number }) {
    const diff = targetMs - now
    if (diff <= 0) return null
    const totalH = Math.floor(diff / 3600000)
    const d = Math.floor(totalH / 24)
    const h = totalH % 24
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)

    return (
        <div className="flex items-center gap-2 border-2 border-orange-400 bg-orange-50 px-3 py-2 text-sm font-black text-orange-700">
            <Clock size={14} className="shrink-0" />
            <span>{label} </span>
            <span className="font-mono">
                {d > 0 && `${d}h `}{h > 0 && `${h}j `}{m}m {String(s).padStart(2, '0')}d
            </span>
        </div>
    )
}

function EventTimeStatus({ startsAt, endsAt, now }: { startsAt: number; endsAt: number; now: number | null }) {
    if (now == null) {
        return (
            <div className="flex items-center gap-2 border-2 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-black text-gray-600">
                <Clock size={14} className="shrink-0" />
                <span>Mulai {formatDate(new Date(startsAt).toISOString())}</span>
            </div>
        )
    }

    if (now < startsAt) {
        return <CountdownBadge targetMs={startsAt} label="Event akan dimulai dalam" now={now} />
    }

    if (now <= endsAt) {
        return (
            <div className="flex items-center gap-2 border-2 border-green-500 bg-green-50 px-3 py-2 text-sm font-black text-green-700">
                <Radio size={14} className="shrink-0 animate-pulse" />
                <span>Event sedang berlangsung</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 border-2 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-black text-gray-600">
            <Clock size={14} className="shrink-0" />
            <span>Event telah berakhir pada {formatDate(new Date(endsAt).toISOString())}</span>
        </div>
    )
}

// --- Confirm Modal ---
function ConfirmModal({ event, onConfirm, onCancel, isLoading }: {
    event: UserEvent
    onConfirm: () => void
    onCancel: () => void
    isLoading: boolean
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md border-4 border-gray-900 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-handwriting"
            >
                <div className="border-b-4 border-gray-900 bg-orange-400 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-7 w-7 text-gray-900" />
                        <h2 className="text-2xl font-black text-gray-900">Siap Mulai?</h2>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-lg font-bold text-gray-800 leading-relaxed">
                        Kamu akan memulai <span className="text-blue-700">{event.title}</span>. Waktu akan langsung berjalan begitu kamu mulai!
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="border-2 border-gray-200 bg-gray-50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-gray-500">Durasi</p>
                            <p className="text-xl font-black text-gray-900">{event.duration_minutes}m</p>
                        </div>
                        <div className="border-2 border-gray-200 bg-gray-50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-gray-500">Soal</p>
                            <p className="text-xl font-black text-gray-900">{event.question_count}</p>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-500 italic">Pastikan koneksi internetmu stabil sebelum mulai.</p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 border-2 border-gray-900 bg-white py-3 font-black text-gray-900 transition hover:bg-gray-100"
                        >
                            Batal
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-900 bg-blue-600 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-60"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            Gas Mulai!
                        </button>
                    </div>
                </div>
            </motion.div>
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
                            <div className={cn(
                                'h-6 w-6 border-2 border-gray-900 flex items-center justify-center text-xs font-black transition-all',
                                isDone ? 'bg-green-400' : isActive ? 'bg-yellow-300' : 'bg-gray-100'
                            )}>
                                {isDone ? <CheckCircle2 size={13} /> : i + 1}
                            </div>
                            <span className={cn(
                                'mt-1 text-[9px] font-black uppercase tracking-wider',
                                isActive ? 'text-gray-900' : 'text-gray-400'
                            )}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn(
                                'h-0.5 w-8 -mt-3 mx-0.5',
                                isDone ? 'bg-green-400' : 'bg-gray-200'
                            )} />
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
}: {
    event: UserEvent
    now: number | null
    onAction: (event: UserEvent) => void
    onCertificate: (event: UserEvent) => void
    isPending: boolean
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
    const isDone =
        event.session_id &&
        (event.test_session_status === 'completed' ||
            event.event_session_status === 'completed' ||
            event.participant_status === 'completed')
    const canUseCertificate = Boolean(
        isDone &&
        event.certificate_enabled &&
        event.certificate_released_at &&
        effectiveStatus === 'closed'
    )

    const statusConfig = {
        live: { label: 'LIVE', bg: 'bg-red-500', text: 'text-white', border: 'border-red-700', pulse: true },
        scheduled: { label: 'SEGERA', bg: 'bg-yellow-300', text: 'text-gray-900', border: 'border-yellow-500', pulse: false },
        closed: { label: 'SELESAI', bg: 'bg-gray-200', text: 'text-gray-600', border: 'border-gray-400', pulse: false },
    }[effectiveStatus]
    const eventStats = [
        { icon: CalendarDays, label: 'Mulai', value: formatDate(event.starts_at) },
        { icon: Clock, label: 'Durasi', value: `${event.duration_minutes}m` },
        { icon: BookOpen, label: 'Soal', value: `${event.question_count}` },
        { icon: Users, label: 'Kuota', value: event.max_participants ? `${event.max_participants} peserta` : 'Tidak dibatasi' },
    ]

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'relative overflow-hidden border-2 border-gray-900 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
                isLive && 'border-red-500 shadow-[6px_6px_0px_0px_rgba(239,68,68,0.5)]'
            )}
        >
            {/* dot pattern bg */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

            {/* Live pulse stripe */}
            {isLive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500">
                    <div className="h-full w-full animate-pulse bg-red-300" />
                </div>
            )}

            <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(230px,320px)_1fr_220px] lg:items-start">
                {/* --- Poster --- */}
                <div className="w-full max-w-[360px] justify-self-center lg:max-w-none lg:justify-self-stretch">
                    {event.flyer_image_url && (
                        <div className="relative aspect-[4/5] overflow-hidden border-2 border-gray-900 bg-blue-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Image
                                src={event.flyer_image_url}
                                alt={`Flyer ${event.title}`}
                                fill
                                className="object-cover"
                                sizes="(min-width: 1024px) 320px, (min-width: 640px) 360px, calc(100vw - 32px)"
                                priority={isLive}
                            />
                        </div>
                    )}
                </div>

                {/* --- Main Info --- */}
                <div className="space-y-4">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 border-2 border-gray-900 px-2.5 py-1 text-[11px] font-black uppercase', statusConfig.bg, statusConfig.text)}>
                            {statusConfig.label}
                        </span>
                        {event.participant_id && (
                            <span className="inline-flex items-center gap-1 border-2 border-gray-900 bg-yellow-200 px-2.5 py-1 text-[11px] font-black uppercase text-gray-900">
                                <Check size={10} /> Terdaftar
                            </span>
                        )}
                        {event.requires_code && effectiveStatus !== 'closed' && (
                            <span className="inline-flex items-center gap-1 border-2 border-gray-900 bg-gray-900 px-2.5 py-1 text-[11px] font-black uppercase text-white">
                                <Lock size={10} /> Kode Masuk
                            </span>
                        )}
                        {event.is_paid && event.price > 0 && (
                            <span className="inline-flex items-center gap-1 border-2 border-amber-500 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase text-amber-700">
                                <Ticket size={10} /> Berbayar
                            </span>
                        )}
                    </div>

                    {/* Title & Desc */}
                    <div>
                        <h2 className="font-handwriting text-2xl font-black leading-tight text-gray-900 sm:text-3xl">{event.title}</h2>
                        <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-gray-600">{event.description || 'Tryout Akbar SKD CPNS nasional.'}</p>
                    </div>

                    {/* Meta info */}
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {eventStats.map((item) => {
                            const Icon = item.icon

                            return (
                                <div key={item.label} className="border-2 border-gray-200 bg-gray-50 p-3">
                                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-400">
                                        <Icon size={12} />
                                        {item.label}
                                    </div>
                                    <p className="text-xs font-black leading-snug text-gray-900">{item.value}</p>
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
                        <div className={cn(
                            'flex items-center gap-3 border-2 p-3',
                            hasTicket ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'
                        )}>
                            <CreditCard className={cn('h-6 w-6 shrink-0', hasTicket ? 'text-green-600' : 'text-amber-600')} />
                            <div>
                                <p className={cn('text-[10px] font-black uppercase', hasTicket ? 'text-green-700' : 'text-amber-700')}>Harga Tiket</p>
                                <p className="text-lg font-black text-gray-900">
                                    {hasTicket ? (
                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> Terdaftar</span>
                                    ) : (
                                        `Rp ${event.price.toLocaleString('id-ID')}`
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                    {event.group_link && (
                        <a
                            href={event.group_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-2 border-2 border-green-700 bg-green-600 px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:bg-green-700 hover:shadow-none"
                        >
                            <ExternalLink size={16} />
                            Join Group
                        </a>
                    )}
                    <div className="border-2 border-gray-900 bg-gray-50 p-3">
                        <div className="flex items-center gap-3">
                            <Trophy className="h-6 w-6 shrink-0 text-yellow-500" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400">Ranking</p>
                                <p className="text-xs font-bold text-gray-800">Terpisah dari ranking nasional</p>
                            </div>
                        </div>
                        {canViewEventLeaderboard && (
                            <Link
                                href={`/cpns/live/${event.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-yellow-300 px-3 py-2 text-xs font-black uppercase text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:bg-yellow-200 hover:shadow-none"
                            >
                                <Trophy size={14} />
                                Lihat Leaderboard
                            </Link>
                        )}
                    </div>
                    {canUseCertificate && (
                        <button
                            type="button"
                            onClick={() => onCertificate(event)}
                            className="flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-emerald-500 px-3 py-3 text-sm font-black uppercase text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:bg-emerald-600 hover:shadow-none"
                        >
                            {event.certificate_number && event.certificate_name_locked_at ? <Download size={16} /> : <Award size={16} />}
                            {event.certificate_number && event.certificate_name_locked_at ? 'Preview Sertifikat' : 'Klaim Sertifikat'}
                        </button>
                    )}
                    {event.max_participants && (
                        <div className="flex items-center gap-3 border-2 border-gray-200 bg-gray-50 p-3">
                            <Users className="h-5 w-5 shrink-0 text-gray-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400">Kuota</p>
                                <p className="text-xs font-bold text-gray-800">{event.max_participants} peserta</p>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        disabled={state.action === 'disabled' || isPending}
                        onClick={() => onAction(event)}
                        className={cn(
                            'flex w-full items-center justify-center gap-2 border-2 border-gray-900 px-5 py-4 text-lg font-black transition-all',
                            state.action === 'pay' || state.action === 'check_payment'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none'
                                : ({
                                    register: 'bg-blue-600 hover:bg-blue-700 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none',
                                    start: 'bg-green-500 hover:bg-green-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none',
                                    history: 'bg-gray-900 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none',
                                    disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed',
                                } as Record<string, string>)[state.action]
                        )}
                    >
                        {isPending ? <Loader2 className="animate-spin" size={18} />
                            : state.action === 'pay' || state.action === 'check_payment' ? <CreditCard size={18} />
                            : <ArrowRight size={18} />}
                        {state.action === 'pay' || state.action === 'check_payment'
                            ? `Beli Tiket Rp ${event.price.toLocaleString('id-ID')}`
                            : state.label}
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

// ─── Event Payment Modal (Midtrans Snap) ─────────────────────────────────────
function CertificateModal({
    event,
    onClose,
    onClaimed,
}: {
    event: UserEvent
    onClose: () => void
    onClaimed: (certificateNumber: string) => void
}) {
    const [name, setName] = useState(event.certificate_name || '')
    const [confirmed, setConfirmed] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const previewName = name.replace(/\s+/g, ' ').trim() || 'Nama Lengkap Peserta'

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        if (!confirmed) {
            setError('Centang konfirmasi bahwa nama sudah benar.')
            return
        }

        startTransition(async () => {
            const result = await claimEventCertificate(event.id, name)
            if (!result.success || !result.certificateNumber) {
                setError(result.message || 'Gagal membuat sertifikat.')
                toast.error(result.message || 'Gagal membuat sertifikat.')
                return
            }

            toast.success(result.message || 'Nama sertifikat tersimpan.')
            onClaimed(result.certificateNumber)
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.form
                onSubmit={submit}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border-4 border-gray-900 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
                <div className="flex items-center gap-3 border-b-4 border-gray-900 bg-emerald-400 px-6 py-4">
                    <Award className="h-7 w-7 text-gray-900" />
                    <h2 className="font-handwriting text-2xl font-black text-gray-900">Nama Sertifikat</h2>
                </div>
                <div className="space-y-5 p-6">
                    <div>
                        <p className="text-xs font-black uppercase text-gray-500">Event</p>
                        <p className="mt-1 text-lg font-black leading-snug text-gray-900">{event.title}</p>
                    </div>
                    <label className="block">
                        <span className="text-xs font-black uppercase text-gray-500">Nama lengkap sesuai sertifikat</span>
                        <input
                            value={name}
                            onChange={(inputEvent) => setName(inputEvent.target.value)}
                            maxLength={100}
                            placeholder="Masukkan nama lengkap"
                            className="mt-2 w-full border-2 border-gray-900 bg-white px-4 py-3 text-base font-black text-gray-900 outline-none focus:border-emerald-600"
                        />
                    </label>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase text-gray-500">Preview sebelum dikunci</p>
                            <span className="border border-blue-300 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">Draft</span>
                        </div>
                        {event.certificate_number ? (
                            <EventCertificatePreview
                                certificateNumber={event.certificate_number}
                                previewName={previewName}
                            />
                        ) : (
                            <div className="border-2 border-yellow-500 bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
                                Snapshot sertifikat belum tersedia. Simpan nama akan membuat sertifikat berdasarkan data ranking final.
                            </div>
                        )}
                    </div>
                    <label className="flex gap-3 border-2 border-yellow-500 bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(inputEvent) => setConfirmed(inputEvent.target.checked)}
                            className="mt-1 h-4 w-4 shrink-0"
                        />
                        <span>Nama yang sudah disimpan akan dicetak pada sertifikat dan tidak bisa diedit lagi oleh user. Pastikan ejaan, gelar, dan spasi sudah benar.</span>
                    </label>
                    {error && (
                        <div className="border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
                    )}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 border-2 border-gray-900 bg-white py-3 font-black text-gray-900 transition hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex flex-1 items-center justify-center gap-2 border-2 border-gray-900 bg-emerald-600 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:bg-emerald-700 hover:shadow-none disabled:opacity-60"
                        >
                            {isPending ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Simpan Nama
                        </button>
                    </div>
                </div>
            </motion.form>
        </div>
    )
}

function EventPaymentModal({
    event,
    onClose,
    onSuccess,
}: {
    event: UserEvent
    onClose: () => void
    onSuccess: () => void
}) {
    const [isLoading, setIsLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(event.payment_order_id)
    const [pendingSnapToken, setPendingSnapToken] = useState<string | null>(event.payment_snap_token)
    const [shouldRefreshPendingToken, setShouldRefreshPendingToken] = useState(Boolean(event.payment_snap_token))
    const [isCheckingStatus, setIsCheckingStatus] = useState(false)

    // Load Midtrans Snap script
    useEffect(() => {
        if (document.getElementById('midtrans-snap-script')) { setIsLoading(false); return }
        const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
        const isSandbox = !clientKey || clientKey.includes('SB-')
        const script = document.createElement('script')
        script.id = 'midtrans-snap-script'
        script.src = isSandbox
            ? 'https://app.sandbox.midtrans.com/snap/snap.js'
            : 'https://app.midtrans.com/snap/snap.js'
        script.setAttribute('data-client-key', clientKey)
        script.onload = () => setIsLoading(false)
        script.onerror = () => { setIsLoading(false); setError('Gagal memuat sistem pembayaran') }
        document.head.appendChild(script)
    }, [])

    const openSnapPayment = (token: string) => {
        if (!window.snap) {
            setError('Sistem pembayaran belum siap. Muat ulang halaman.')
            return
        }

        setError(null)
        window.snap.pay(token, {
            onSuccess: () => { toast.success('Pembayaran berhasil! Kamu sudah terdaftar.'); onSuccess() },
            onPending: () => { toast.info('Pembayaran pending. Kamu bisa cek status nanti.') },
            onError: () => { toast.error('Pembayaran gagal. Coba lagi.') },
            onClose: () => { toast('Pembayaran dibatalkan.') },
        })
    }

    const handleBuy = () => {
        if (pendingSnapToken && !shouldRefreshPendingToken) {
            openSnapPayment(pendingSnapToken)
            return
        }

        startTransition(async () => {
            try {
                const result = await createEventPaymentTransaction(event.id, {
                    refreshPending: shouldRefreshPendingToken,
                })
                if (!result.success) {
                    setError(result.message)
                    toast.error(result.message)
                    return
                }
                setPendingOrderId(result.orderId)
                setPendingSnapToken(result.token)
                setShouldRefreshPendingToken(false)
                openSnapPayment(result.token)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Gagal membuat transaksi'
                setError(msg)
                toast.error(msg)
            }
        })
    }

    const handleCheckStatus = async () => {
        if (!pendingOrderId) return
        setIsCheckingStatus(true)
        try {
            const result = await syncEventPaymentStatus(pendingOrderId)
            if (result.registered) {
                toast.success(result.message)
                onSuccess()
            } else {
                toast.info(result.message)
            }
        } catch {
            toast.error('Gagal cek status')
        } finally {
            setIsCheckingStatus(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md border-4 border-gray-900 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
                <div className="border-b-4 border-gray-900 bg-amber-400 px-6 py-4 flex items-center gap-3">
                    <Ticket className="h-7 w-7 text-gray-900" />
                    <h2 className="font-handwriting text-2xl font-black text-gray-900">Beli Tiket Event</h2>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <p className="text-sm font-bold text-gray-500 mb-1">Event</p>
                        <p className="text-lg font-black text-gray-900 leading-snug">{event.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="border-2 border-gray-200 bg-gray-50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-gray-400">Mulai</p>
                            <p className="text-sm font-black text-gray-900">{formatDate(event.starts_at)}</p>
                        </div>
                        <div className="border-2 border-amber-400 bg-amber-50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-amber-700">Harga Tiket</p>
                            <p className="text-2xl font-black text-gray-900">Rp {event.price.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400">Pembayaran via QRIS. Tidak ada biaya tambahan.</p>
                    {error && (
                        <div className="border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
                    )}
                    {pendingOrderId && (
                        <button onClick={handleCheckStatus} disabled={isCheckingStatus}
                            className="flex w-full items-center justify-center gap-2 border-2 border-blue-400 bg-blue-50 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100 transition disabled:opacity-60">
                            {isCheckingStatus ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Cek Status Pembayaran
                        </button>
                    )}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 border-2 border-gray-900 bg-white py-3 font-black text-gray-900 hover:bg-gray-50 transition">
                            Batal
                        </button>
                        <button onClick={handleBuy} disabled={isPending || isLoading}
                            className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-900 bg-amber-500 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition disabled:opacity-60">
                            {isPending || isLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                            {isLoading ? 'Memuat...' : shouldRefreshPendingToken ? 'Buat QRIS Baru' : 'Bayar Sekarang'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
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

    const summary = useMemo(() => ({
        total: grouped.live.length + grouped.scheduled.length,
        registered: [...grouped.live, ...grouped.scheduled].filter((e) => e.participant_id).length,
        live: grouped.live.length,
        closed: grouped.closed.length,
    }), [grouped])

    const doAction = (event: UserEvent) => {
        if (now == null) return
        const state = getEventState(event, now)
        if (state.action === 'disabled') return
        if (state.action === 'history') {
            router.push(`/cpns/dashboard/tryout/${event.session_id}/result?from=event`)
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
                if (!result.success) { toast.error(result.message); return }
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
            setEventCodes((current) => Object.fromEntries(
                Object.entries(current).filter(([eventId]) => eventId !== event.id)
            ))
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
                    router.push(`/cpns/dashboard/tryout/${result.sessionId}`)
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

    const sections: Array<{ label: string; icon: React.ReactNode; events: UserEvent[]; accent: string }> = [
        { label: 'Live Sekarang', icon: <Radio size={18} className="text-red-600" />, events: grouped.live, accent: 'text-red-600' },
        { label: 'Akan Datang', icon: <Clock size={18} className="text-blue-700" />, events: grouped.scheduled, accent: 'text-blue-700' },
        { label: 'Sudah Selesai', icon: <CheckCircle2 size={18} className="text-gray-500" />, events: grouped.closed, accent: 'text-gray-500' },
    ]

    return (
        <div className="space-y-8 font-handwriting">
            {/* Header */}
            <div className="relative z-10">
                <div className="mb-4 inline-flex -rotate-1 items-center gap-2 border-2 border-gray-900 bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <CalendarDays size={14} />
                    <span>Event resmi Siap Tempur</span>
                </div>
                <h1 className="mb-3 text-4xl font-bold text-gray-900 md:text-5xl">
                    Tryout Akbar & Event Live
                </h1>
                <p className="max-w-2xl text-xl leading-relaxed text-gray-600 italic">
                    Daftar event, masuk dengan kode bila diperlukan, lalu mulai tryout sesuai jadwal.
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Event Aktif', summary.total, <CalendarDays key="event-active-icon" size={20} className="text-blue-500" />],
                    ['Terdaftar', summary.registered, <Check key="registered-icon" size={20} className="text-green-600" />],
                    ['Live', summary.live, <Radio key="live-icon" size={20} className="text-red-500" />],
                    ['Selesai', summary.closed, <CheckCircle2 key="closed-event-icon" size={20} className="text-gray-500" />],
                ].map(([label, value, icon]) => (
                    <div key={String(label)} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label as string}</p>
                            <span>{icon as React.ReactNode}</span>
                        </div>
                        <p className="mt-2 text-4xl font-black text-gray-900">{value as number}</p>
                    </div>
                ))}
            </div>

            {/* No events at all */}
            {events.length === 0 ? (
                <div className="border-2 border-dashed border-gray-900 bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
                    <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
                    <h2 className="mt-4 text-3xl font-black text-gray-900">Belum ada event terbuka</h2>
                    <p className="mt-2 text-base font-medium text-gray-600">Cek lagi nanti saat Tryout Akbar dibuka.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {sections.map(({ label, icon, events: sectionEvents, accent }) => {
                        if (sectionEvents.length === 0) return null
                        return (
                            <div key={label} className="space-y-4">
                                <div className={cn('flex items-center gap-2', accent)}>
                                    {icon}
                                    <h2 className={cn('text-2xl font-black uppercase tracking-widest', accent)}>{label}</h2>
                                    <span className="border-2 border-gray-900 bg-gray-900 px-2 py-0.5 text-xs font-black text-white">
                                        {sectionEvents.length}
                                    </span>
                                    <div className="flex-1 h-0.5 bg-gray-200" />
                                </div>

                                {sectionEvents.map((event) => (
                                    <div key={event.id}>
                                        {/* Inline code input if needs code + not registered */}
                                        {event.requires_code && !event.participant_id && getDisplayEventStatus(event, now) !== 'closed' && (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault()
                                                    if (isPending) return
                                                    submitEventCode(event)
                                                }}
                                                className="mb-2 flex items-center gap-2 border-2 border-blue-600 bg-blue-50 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.18)]"
                                            >
                                                <Lock size={12} className="text-blue-700 shrink-0" />
                                                <label className="text-xs font-black uppercase text-blue-800 shrink-0">Kode Masuk:</label>
                                                <input
                                                    value={eventCodes[event.id] || ''}
                                                    onChange={(e) => setEventCodes((cur) => ({ ...cur, [event.id]: e.target.value.toUpperCase() }))}
                                                    placeholder="MASUKKAN KODE"
                                                    enterKeyHint="go"
                                                    className="min-w-0 flex-1 border-2 border-blue-200 bg-white px-3 py-1.5 text-sm font-black uppercase text-gray-900 outline-none focus:border-blue-600 placeholder:text-blue-300"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isPending || !(eventCodes[event.id] || '').trim()}
                                                    aria-label="Submit kode masuk"
                                                    className="flex shrink-0 items-center justify-center gap-1.5 border-2 border-blue-900 bg-blue-600 px-3 py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
                                                >
                                                    {isPending && pendingEventId === event.id ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <ArrowRight size={13} />
                                                    )}
                                                    Submit
                                                </button>
                                            </form>
                                        )}
                                        <EventCard
                                            event={event}
                                            now={now}
                                            onAction={doAction}
                                            onCertificate={doCertificate}
                                            isPending={isPending && pendingEventId === event.id}
                                        />
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Confirm Modal */}
            <AnimatePresence>
                {confirmEvent && (
                    <ConfirmModal
                        event={confirmEvent}
                        onConfirm={handleConfirmStart}
                        onCancel={() => setConfirmEvent(null)}
                        isLoading={isPending}
                    />
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            <AnimatePresence>
                {certificateEvent && (
                    <CertificateModal
                        event={certificateEvent}
                        onClose={() => setCertificateEvent(null)}
                        onClaimed={handleCertificateClaimed}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
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
            </AnimatePresence>
        </div>
    )
}
