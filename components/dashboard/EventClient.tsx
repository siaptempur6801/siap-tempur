'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, Loader2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { registerTryoutEvent, startTryoutEvent } from '@/app/actions/event'

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
    status: EventStatus
    participant_id: string | null
    participant_status: string | null
    session_id: string | null
    event_session_status: string | null
    test_session_status: string | null
    question_count: number
}

interface EventClientProps {
    events: UserEvent[]
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

function getEventState(event: UserEvent, now: number) {
    const startsAt = new Date(event.starts_at).getTime()
    const endsAt = new Date(event.ends_at).getTime()
    const latestStartAt = startsAt + event.start_grace_minutes * 60 * 1000
    const canStart = event.status === 'live' && now >= startsAt && now <= latestStartAt && now <= endsAt

    if (
        event.session_id &&
        (event.test_session_status === 'completed' ||
            event.event_session_status === 'completed' ||
            event.participant_status === 'completed')
    ) {
        return { label: 'Riwayat', action: 'history' as const }
    }
    if (event.session_id) return { label: 'Lanjutkan', action: 'start' as const }
    if (event.status === 'closed') return { label: 'Event Selesai', action: 'disabled' as const }
    if (!event.participant_id) return { label: 'Daftar Sekarang', action: 'register' as const }
    if (canStart) return { label: 'Mulai Tryout', action: 'start' as const }
    if (event.status === 'live' && now > latestStartAt) return { label: 'Start Window Ditutup', action: 'disabled' as const }
    return { label: 'Menunggu Jadwal', action: 'disabled' as const }
}

export default function EventClient({ events }: EventClientProps) {
    const [now] = useState(() => Date.now())
    const [pendingEventId, setPendingEventId] = useState<string | null>(null)
    const [eventCodes, setEventCodes] = useState<Record<string, string>>({})
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const summary = useMemo(() => ({
        total: events.length,
        registered: events.filter((event) => event.participant_id).length,
        live: events.filter((event) => event.status === 'live').length,
    }), [events])

    const handleAction = (event: UserEvent) => {
        const state = getEventState(event, now)
        if (state.action === 'disabled') return

        if (state.action === 'history') {
            if (event.session_id) {
                router.push(`/cpns/dashboard/latihan/${event.session_id}/result?from=event`)
            }
            return
        }

        setPendingEventId(event.id)
        startTransition(async () => {
            const result = state.action === 'register'
                ? await registerTryoutEvent(event.id, eventCodes[event.id])
                : await startTryoutEvent(event.id)

            setPendingEventId(null)

            if (!result.success) {
                toast.error(result.message)
                return
            }

            toast.success(result.message || (state.action === 'register' ? 'Berhasil daftar event' : 'Tryout Akbar dimulai'))

            if ('sessionId' in result && result.sessionId) {
                router.push(`/cpns/dashboard/latihan/${result.sessionId}`)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <div className="space-y-8 font-handwriting">
            <div className="relative z-10">
                <div className="mb-4 inline-flex -rotate-1 items-center gap-2 border-2 border-gray-900 bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <CalendarDays size={14} />
                    <span>Event resmi Siap Tempur</span>
                </div>
                <h1 className="mb-3 text-4xl font-bold text-gray-900 md:text-5xl">
                    Tryout Akbar & Event Live
                </h1>
                <p className="max-w-2xl text-xl leading-relaxed text-gray-600 italic">
                    Daftar event resmi, masuk dengan kode bila diperlukan, lalu mulai tryout sesuai jadwal yang dibuka.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {[
                    ['Event Aktif', summary.total],
                    ['Terdaftar', summary.registered],
                    ['Live', summary.live],
                ].map(([label, value]) => (
                    <div key={label} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
                        <p className="mt-2 text-4xl font-black text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6">
                {events.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-900 bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
                        <CalendarDays className="mx-auto h-12 w-12 text-gray-500" />
                        <h2 className="mt-4 text-3xl font-black text-gray-900">Belum ada event terbuka</h2>
                        <p className="mt-2 text-base font-medium text-gray-600">Cek lagi nanti saat Tryout Akbar dibuka.</p>
                    </div>
                ) : (
                    events.map((event) => {
                        const state = getEventState(event, now)
                        const isLoading = isPending && pendingEventId === event.id

                        return (
                            <div key={event.id} className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                                <div className="relative grid gap-6 md:grid-cols-[1fr_240px] md:items-center">
                                    <div>
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-900">
                                                {event.status}
                                            </span>
                                            {event.participant_id ? (
                                                <span className="border-2 border-gray-900 bg-yellow-200 px-3 py-1 text-xs font-black uppercase text-gray-900">
                                                    Terdaftar
                                                </span>
                                            ) : null}
                                            {event.requires_code ? (
                                                <span className="border-2 border-gray-900 bg-gray-900 px-3 py-1 text-xs font-black uppercase text-white">
                                                    Kode Masuk
                                                </span>
                                            ) : null}
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-900">{event.title}</h2>
                                        <p className="mt-2 text-base font-medium text-gray-600">{event.description || 'Tryout Akbar SKD CPNS nasional.'}</p>
                                        <div className="mt-5 grid gap-3 text-sm font-bold text-gray-700 sm:grid-cols-3">
                                            <div className="border-2 border-gray-200 bg-gray-50 p-3">
                                                <p className="text-xs uppercase text-gray-500">Mulai</p>
                                                <p>{formatDate(event.starts_at)}</p>
                                            </div>
                                            <div className="border-2 border-gray-200 bg-gray-50 p-3">
                                                <p className="text-xs uppercase text-gray-500">Durasi</p>
                                                <p>{event.duration_minutes} menit</p>
                                            </div>
                                            <div className="border-2 border-gray-200 bg-gray-50 p-3">
                                                <p className="text-xs uppercase text-gray-500">Soal</p>
                                                <p>{event.question_count} soal</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 border-2 border-gray-900 bg-gray-100 p-4">
                                            <Trophy className="h-8 w-8 text-gray-900" />
                                            <div>
                                                <p className="text-xs font-black uppercase text-gray-500">Ranking Event</p>
                                                <p className="text-sm font-bold text-gray-900">Terpisah dari ranking nasional</p>
                                            </div>
                                        </div>
                                        {event.requires_code && !event.participant_id ? (
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black uppercase text-gray-500">Kode Masuk</label>
                                                <input
                                                    value={eventCodes[event.id] || ''}
                                                    onChange={(item) => setEventCodes((current) => ({
                                                        ...current,
                                                        [event.id]: item.target.value.toUpperCase(),
                                                    }))}
                                                    placeholder="Masukkan kode"
                                                    className="w-full border-2 border-gray-900 bg-white px-4 py-3 font-black uppercase text-gray-900 outline-none focus:bg-gray-50"
                                                />
                                            </div>
                                        ) : null}
                                        <button
                                            type="button"
                                            disabled={state.action === 'disabled' || isLoading}
                                            onClick={() => handleAction(event)}
                                            className="flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-blue-600 px-5 py-4 text-xl font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                                            {state.label}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
