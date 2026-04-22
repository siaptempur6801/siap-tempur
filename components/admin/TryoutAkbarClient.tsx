'use client'

import { useMemo, useState, useTransition } from 'react'
import { BarChart3, Edit, Loader2, Plus, Save, Ticket, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    createTryoutEventCode,
    createTryoutEvent,
    deleteTryoutEventCode,
    deleteTryoutEvent,
    generateTryoutEventQuestions,
    toggleTryoutEventCode,
    updateTryoutEvent,
    updateTryoutEventStatus,
} from '@/app/actions/admin'

type EventStatus = 'draft' | 'scheduled' | 'live' | 'closed' | 'cancelled'

type EventCode = {
    id: string
    code: string
    max_uses: number
    used_count: number
    is_active: boolean
    expires_at: string | null
    created_at: string
}

type TryoutEvent = {
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
    result_visible_at: string | null
    explanation_visible_at: string | null
    created_at: string
    participant_count: number
    question_count: number
    session_count: number
    completed_count: number
    passed_count: number
    codes: EventCode[]
}

interface TryoutAkbarClientProps {
    events: TryoutEvent[]
}

function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

function toDateInputValue(value: string | null) {
    if (!value) return ''
    return value.slice(0, 16)
}

function StatusBadge({ status }: { status: EventStatus }) {
    return (
        <span className="border border-current px-2 py-0.5 text-[10px] font-black uppercase">
            {status}
        </span>
    )
}

function EventForm({
    event,
    action,
    isPending,
}: {
    event?: TryoutEvent | null
    action: (formData: FormData) => void
    isPending: boolean
}) {
    return (
        <form action={action} className="space-y-4">
            <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Nama Event</label>
                <input name="title" required defaultValue={event?.title || ''} placeholder="Tryout Akbar SKD CPNS Nasional" className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
            </div>
            <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Deskripsi</label>
                <textarea name="description" rows={3} defaultValue={event?.description || ''} placeholder="Deskripsi singkat event" className="w-full resize-none rounded-md border-2 border-gray-300 px-4 py-3 font-medium outline-none focus:border-gray-900" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Mulai</label>
                    <input name="starts_at" type="datetime-local" required defaultValue={toDateInputValue(event?.starts_at || null)} className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Tutup</label>
                    <input name="ends_at" type="datetime-local" required defaultValue={toDateInputValue(event?.ends_at || null)} className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Durasi</label>
                    <input name="duration_minutes" type="number" min="1" defaultValue={event?.duration_minutes || 100} required className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Window</label>
                    <input name="start_grace_minutes" type="number" min="0" defaultValue={event?.start_grace_minutes ?? 15} required className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Max</label>
                    <input name="max_participants" type="number" min="1" defaultValue={event?.max_participants || ''} className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
            </div>
            <label className="flex items-center gap-3 rounded-md border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-black text-gray-900">
                <input name="requires_code" type="checkbox" defaultChecked={event?.requires_code || false} className="h-5 w-5 accent-gray-900" />
                Wajib kode masuk untuk daftar event
            </label>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Hasil Terlihat</label>
                    <input name="result_visible_at" type="datetime-local" defaultValue={toDateInputValue(event?.result_visible_at || null)} className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Pembahasan</label>
                    <input name="explanation_visible_at" type="datetime-local" defaultValue={toDateInputValue(event?.explanation_visible_at || null)} className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                </div>
            </div>
            <button disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60">
                {isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {event ? 'Simpan Event' : 'Buat Event'}
            </button>
        </form>
    )
}

function EventCodeForm({
    action,
    isPending,
}: {
    action: (formData: FormData) => void
    isPending: boolean
}) {
    return (
        <form action={action} className="mt-4 space-y-3 border-2 border-gray-900 bg-white p-4">
            <div className="grid grid-cols-[1fr_96px] gap-2">
                <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Kode</label>
                    <input name="code" required minLength={4} maxLength={32} placeholder="AKBAR-2026" className="w-full rounded-md border-2 border-gray-300 px-3 py-2 font-black uppercase outline-none focus:border-gray-900" />
                </div>
                <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Limit</label>
                    <input name="max_uses" type="number" min="1" defaultValue={1} required className="w-full rounded-md border-2 border-gray-300 px-3 py-2 font-black outline-none focus:border-gray-900" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Kadaluarsa</label>
                <input name="expires_at" type="datetime-local" className="w-full rounded-md border-2 border-gray-300 px-3 py-2 font-bold outline-none focus:border-gray-900" />
            </div>
            <button disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] disabled:opacity-60">
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Buat Kode
            </button>
        </form>
    )
}

export function EventCreateController() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleCreate = (formData: FormData) => {
        startTransition(async () => {
            const result = await createTryoutEvent(formData)
            if (result.success) {
                toast.success(result.message)
                setIsCreateOpen(false)
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-gray-800"
            >
                <Plus size={18} />
                Buat Event
            </button>

            {isCreateOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <button type="button" onClick={() => setIsCreateOpen(false)} className="absolute right-4 top-4 border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <X size={16} />
                        </button>
                        <h2 className="pr-12 font-handwriting text-3xl font-black text-gray-900">Buat Event</h2>
                        <p className="mb-5 mt-1 text-sm font-medium text-gray-600">Siapkan jadwal dan aturan dasar Tryout Akbar.</p>
                        <EventForm action={handleCreate} isPending={isPending} />
                    </div>
                </div>
            ) : null}
        </>
    )
}

export default function TryoutAkbarClient({ events }: TryoutAkbarClientProps) {
    const [selectedEventId, setSelectedEventId] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [isVoucherOpen, setIsVoucherOpen] = useState(false)
    const [eventToDelete, setEventToDelete] = useState<TryoutEvent | null>(null)
    const [codeToDelete, setCodeToDelete] = useState<EventCode | null>(null)
    const [isPending, startTransition] = useTransition()

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) || null,
        [events, selectedEventId]
    )

    const summary = useMemo(() => ({
        total: events.length,
        scheduled: events.filter((event) => event.status === 'scheduled').length,
        live: events.filter((event) => event.status === 'live').length,
        participants: events.reduce((sum, event) => sum + event.participant_count, 0),
    }), [events])

    const handleUpdate = (eventId: string, formData: FormData) => {
        startTransition(async () => {
            const result = await updateTryoutEvent(eventId, formData)
            if (result.success) {
                toast.success(result.message)
                setIsEditing(false)
            } else toast.error(result.message)
        })
    }

    const runAction = (callback: () => Promise<{ success: boolean; message: string }>) => {
        startTransition(async () => {
            const result = await callback()
            if (result.success) toast.success(result.message)
            else toast.error(result.message)
        })
    }

    const handleDelete = () => {
        if (!eventToDelete) return
        runAction(async () => {
            const result = await deleteTryoutEvent(eventToDelete.id)
            if (result.success) {
                setEventToDelete(null)
                setSelectedEventId('')
                setIsEditing(false)
                setIsVoucherOpen(false)
            }
            return result
        })
    }

    const handleCreateCode = (eventId: string, formData: FormData) => {
        startTransition(async () => {
            const result = await createTryoutEventCode(eventId, formData)
            if (result.success) toast.success(result.message)
            else toast.error(result.message)
        })
    }

    const handleDeleteCode = () => {
        if (!codeToDelete) return
        runAction(async () => {
            const result = await deleteTryoutEventCode(codeToDelete.id)
            if (result.success) setCodeToDelete(null)
            return result
        })
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    ['Total Event', summary.total],
                    ['Scheduled', summary.scheduled],
                    ['Live', summary.live],
                    ['Total Peserta', summary.participants],
                ].map(([label, value]) => (
                    <div key={label} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
                        <p className="mt-2 font-handwriting text-4xl font-black text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {events.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-900 bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-500" />
                        <h2 className="mt-4 font-handwriting text-3xl font-black text-gray-900">Belum ada event</h2>
                        <p className="mt-2 text-sm font-medium text-gray-600">Klik Buat Event di banner untuk menyiapkan Tryout Akbar.</p>
                    </div>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            className="w-full border-2 border-gray-900 bg-white p-5 text-left text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-handwriting text-2xl font-black">{event.title}</h3>
                                        <StatusBadge status={event.status} />
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-gray-600">
                                        {formatDate(event.starts_at)} | {event.duration_minutes} menit | {event.question_count} soal
                                        {event.requires_code ? ' | wajib kode' : ''}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            aria-label={`Monitoring ${event.title}`}
                                            title="Monitoring"
                                            onClick={() => {
                                                setSelectedEventId(event.id)
                                                setIsEditing(false)
                                                setIsVoucherOpen(false)
                                            }}
                                            className="border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
                                        >
                                            <BarChart3 size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Voucher ${event.title}`}
                                            title="Voucher"
                                            onClick={() => {
                                                setSelectedEventId(event.id)
                                                setIsEditing(false)
                                                setIsVoucherOpen(true)
                                            }}
                                            className="border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
                                        >
                                            <Ticket size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Edit ${event.title}`}
                                            title="Edit"
                                            onClick={() => {
                                                setSelectedEventId(event.id)
                                                setIsEditing(true)
                                                setIsVoucherOpen(false)
                                            }}
                                            className="border-2 border-gray-900 bg-gray-900 p-2 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Hapus ${event.title}`}
                                            title="Hapus"
                                            onClick={() => {
                                                setEventToDelete(event)
                                                setSelectedEventId('')
                                                setIsEditing(false)
                                                setIsVoucherOpen(false)
                                            }}
                                            className="border-2 border-gray-900 bg-white p-2 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="min-w-16 text-right">
                                        <p className="text-2xl font-black">{event.participant_count}</p>
                                        <p className="text-xs font-bold uppercase text-gray-500">peserta</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedEvent ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto border-2 border-gray-900 bg-gray-100 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedEventId('')
                                setIsEditing(false)
                                setIsVoucherOpen(false)
                            }}
                            className="absolute right-4 top-4 border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <X size={16} />
                        </button>
                        <div className="pr-12">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-handwriting text-3xl font-black text-gray-900">
                                        {isEditing ? 'Edit Event' : isVoucherOpen ? 'Voucher Event' : 'Monitoring'}
                                    </h2>
                                    <p className="mt-1 text-sm font-bold text-gray-600">{selectedEvent.title}</p>
                                </div>
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="mt-5">
                                <EventForm event={selectedEvent} action={(formData) => handleUpdate(selectedEvent.id, formData)} isPending={isPending} />
                            </div>
                        ) : isVoucherOpen ? (
                            <section className="mt-5 border-2 border-gray-900 bg-white p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-handwriting text-2xl font-black text-gray-900">Voucher</h3>
                                        <p className="text-xs font-bold text-gray-600">Kode masuk khusus event.</p>
                                    </div>
                                    <span className="border-2 border-gray-900 bg-gray-100 px-2 py-1 text-xs font-black text-gray-900">
                                        {selectedEvent.codes.length} kode
                                    </span>
                                </div>
                                <EventCodeForm action={(formData) => handleCreateCode(selectedEvent.id, formData)} isPending={isPending} />
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {selectedEvent.codes.length === 0 ? (
                                        <p className="border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-sm font-bold text-gray-500">Belum ada kode masuk.</p>
                                    ) : selectedEvent.codes.map((code) => (
                                        <div key={code.id} className="border-2 border-gray-900 bg-gray-50 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-mono text-lg font-black text-gray-900">{code.code}</p>
                                                    <p className="text-xs font-bold text-gray-500">
                                                        {code.used_count}/{code.max_uses} dipakai | exp {formatDate(code.expires_at)}
                                                    </p>
                                                </div>
                                                <span className={`border border-current px-2 py-0.5 text-[10px] font-black uppercase ${code.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                                                    {code.is_active ? 'aktif' : 'off'}
                                                </span>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => runAction(() => toggleTryoutEventCode(code.id, !code.is_active))}
                                                    className="rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-xs font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
                                                >
                                                    {code.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => setCodeToDelete(code)}
                                                    className="rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-xs font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : (
                            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                                <section className="border-2 border-gray-900 bg-white p-4">
                                    <div className="mb-4">
                                        <h3 className="font-handwriting text-2xl font-black text-gray-900">Monitoring</h3>
                                        <p className="text-xs font-bold text-gray-600">Statistik peserta dan jadwal event.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            ['Pendaftar', selectedEvent.participant_count],
                                            ['Mulai', selectedEvent.session_count],
                                            ['Selesai', selectedEvent.completed_count],
                                            ['Lulus', selectedEvent.passed_count],
                                        ].map(([label, value]) => (
                                            <div key={label} className="border-2 border-gray-900 bg-white p-3">
                                                <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
                                                <p className="text-2xl font-black text-gray-900">{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-5 space-y-2 text-sm font-medium text-gray-700">
                                        <p><strong>Mulai:</strong> {formatDate(selectedEvent.starts_at)}</p>
                                        <p><strong>Tutup:</strong> {formatDate(selectedEvent.ends_at)}</p>
                                        <p><strong>Start window:</strong> {selectedEvent.start_grace_minutes} menit</p>
                                        <p><strong>Max peserta:</strong> {selectedEvent.max_participants || 'Tidak dibatasi'}</p>
                                        <p><strong>Pendaftaran:</strong> {selectedEvent.requires_code ? 'Wajib kode masuk' : 'Tanpa kode'}</p>
                                    </div>
                                </section>

                                <aside className="border-2 border-gray-900 bg-white p-4">
                                    <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-gray-500">Action</p>
                                    <div className="space-y-2">
                                        <button disabled={isPending} onClick={() => runAction(() => generateTryoutEventQuestions(selectedEvent.id))} className="w-full rounded-md border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60">
                                            Generate Soal
                                        </button>
                                        <button disabled={isPending} onClick={() => runAction(() => updateTryoutEventStatus(selectedEvent.id, 'scheduled'))} className="w-full rounded-md border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60">
                                            Publish
                                        </button>
                                        <button disabled={isPending} onClick={() => runAction(() => updateTryoutEventStatus(selectedEvent.id, 'live'))} className="w-full rounded-md border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60">
                                            Live
                                        </button>
                                        <button disabled={isPending} onClick={() => runAction(() => updateTryoutEventStatus(selectedEvent.id, 'closed'))} className="w-full rounded-md border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60">
                                            Close
                                        </button>
                                        <button disabled={isPending} onClick={() => runAction(() => updateTryoutEventStatus(selectedEvent.id, 'cancelled'))} className="w-full rounded-md border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60">
                                            Cancel
                                        </button>
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {eventToDelete ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h2 className="font-handwriting text-3xl font-black text-gray-900">Hapus Event?</h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700">
                            Event <strong>{eventToDelete.title}</strong> akan dihapus permanen, termasuk pendaftaran, kode masuk, paket soal, dan session pengerjaan event ini.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button onClick={() => setEventToDelete(null)} disabled={isPending} className="rounded-md border-2 border-gray-900 bg-white px-4 py-2.5 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Batal
                            </button>
                            <button onClick={handleDelete} disabled={isPending} className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]">
                                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {codeToDelete ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h2 className="font-handwriting text-3xl font-black text-gray-900">Hapus Kode?</h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700">
                            Kode <strong>{codeToDelete.code}</strong> akan dihapus permanen. Kode yang sudah dipakai peserta akan ditolak oleh sistem.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button onClick={() => setCodeToDelete(null)} disabled={isPending} className="rounded-md border-2 border-gray-900 bg-white px-4 py-2.5 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Batal
                            </button>
                            <button onClick={handleDeleteCode} disabled={isPending} className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]">
                                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
