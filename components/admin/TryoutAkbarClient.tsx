'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
    BarChart3, ChevronDown, ChevronUp, Copy, Download,
    Loader2, Plus, Radio, Save, Settings, Ticket, Trash2, Users, X,
    CheckCircle2, Clock, BookOpen, AlertTriangle, Zap, EyeOff, Eye, Trophy, Upload, ImageIcon, Award
} from 'lucide-react'
import { toast } from 'sonner'
import { EventCertificatePreview } from '@/components/certificates/EventCertificatePreview'
import {
    createTryoutEventCode,
    createTryoutEvent,
    deleteTryoutEventCode,
    deleteTryoutEvent,
    generateTryoutEventQuestions,
    toggleTryoutEventCode,
    updateTryoutEvent,
    updateTryoutEventCertificateRelease,
    updateEventCertificateName,
    updateTryoutEventStatus,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import MathRenderer from '@/components/MathRenderer'
import { createClient } from '@/lib/utils/supabase/client'

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

type EventQuestionOption = {
    id: string
    content: string
    image_url: string | null
    is_correct: boolean
    score_value: number
    created_at: string
}

type EventQuestion = {
    id: string
    sort_order: number
    display_order: number
    question_id: string
    question_code: string
    content: string
    explanation: string | null
    image_url: string | null
    type: 'TWK' | 'TIU' | 'TKP'
    category: string | null
    sub_category: string | null
    options: EventQuestionOption[]
}

type EventParticipant = {
    id: string
    user_id: string
    full_name: string | null
    status: string
    registered_at: string
    code: string | null
    session_id: string | null
    event_session_status: string | null
    test_session_status: string | null
    started_at: string | null
    finished_at: string | null
    score_twk: number | null
    score_tiu: number | null
    score_tkp: number | null
    total_score: number | null
    is_passed: boolean | null
    certificate_id: string | null
    certificate_number: string | null
    certificate_name: string | null
    certificate_kind: string | null
    certificate_rank: number | null
    certificate_score: number | null
    certificate_updated_at: string | null
    certificate_name_locked_at: string | null
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
    bot_count: number
    requires_code: boolean
    group_link: string | null
    flyer_image_url: string | null
    documentation_url: string | null
    is_paid: boolean
    price: number
    status: EventStatus
    certificate_enabled: boolean
    certificate_released_at: string | null
    result_visible_at: string | null
    explanation_visible_at: string | null
    created_at: string
    participant_count: number
    question_count: number
    session_count: number
    completed_count: number
    passed_count: number
    codes: EventCode[]
    questions: EventQuestion[]
    participants: EventParticipant[]
}

interface TryoutAkbarClientProps {
    events: TryoutEvent[]
}

function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZoneName: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

function toDateInputValue(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
    }).formatToParts(date)
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '00'
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`
}

function addMinutesToInputValue(value: string, minutes: number) {
    if (!value) return ''
    const date = new Date(`${value}:00+07:00`)
    if (Number.isNaN(date.getTime())) return ''
    return toDateInputValue(new Date(date.getTime() + minutes * 60 * 1000).toISOString())
}

function getEventFormValues(event?: TryoutEvent | null) {
    return {
        title: event?.title || '',
        description: event?.description || '',
        starts_at: toDateInputValue(event?.starts_at || null),
        duration_minutes: String(event?.duration_minutes ?? 100),
        start_grace_minutes: String(event?.start_grace_minutes ?? 15),
        max_participants: event?.max_participants ? String(event.max_participants) : '',
        bot_count: String(event?.bot_count ?? 0),
        requires_code: event?.requires_code || false,
        group_link: event?.group_link || '',
        flyer_image_url: event?.flyer_image_url || '',
        documentation_url: event?.documentation_url || '',
        is_paid: event?.is_paid || false,
        price: String(event?.price ?? 15000),
    }
}

type EventFormValues = ReturnType<typeof getEventFormValues>

const MAX_FLYER_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024
const ALLOWED_FLYER_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function uploadEventFlyer(file: File, prefix: string) {
    if (file.size > MAX_FLYER_UPLOAD_SIZE_BYTES) {
        throw new Error('Ukuran flyer maksimal 4MB')
    }

    if (!ALLOWED_FLYER_IMAGE_TYPES.has(file.type)) {
        throw new Error('Format flyer harus JPG, PNG, atau WebP')
    }

    const supabase = createClient()
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`

    const { error } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(fileName)

    return data.publicUrl
}

function getEventFormCloseAt(values: EventFormValues) {
    const durationMinutes = Number(values.duration_minutes) || 0
    const startGraceMinutes = Number(values.start_grace_minutes) || 0
    return addMinutesToInputValue(values.starts_at, durationMinutes + startGraceMinutes)
}

function serializeEventFormValues(values: EventFormValues) {
    const closeAt = getEventFormCloseAt(values)

    return JSON.stringify({
        ...values,
        ends_at: closeAt,
        result_visible_at: closeAt,
        explanation_visible_at: closeAt,
    })
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; text: string; border: string }> = {
    draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400' },
    scheduled: { label: 'Scheduled', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' },
    live: { label: 'Live', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
    closed: { label: 'Closed', bg: 'bg-gray-200', text: 'text-gray-500', border: 'border-gray-400' },
    cancelled: { label: 'Cancelled', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
}

function StatusBadge({ status }: { status: EventStatus }) {
    const cfg = STATUS_CONFIG[status]
    return (
        <span className={cn('inline-flex items-center gap-1 border-2 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide', cfg.bg, cfg.text, cfg.border)}>
            {status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
            {cfg.label}
        </span>
    )
}

const PARTICIPANT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    registered: { label: 'Terdaftar', className: 'border-blue-300 bg-blue-50 text-blue-700' },
    started: { label: 'Mengerjakan', className: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
    completed: { label: 'Selesai', className: 'border-green-300 bg-green-50 text-green-700' },
    timeout: { label: 'Timeout', className: 'border-orange-300 bg-orange-50 text-orange-700' },
    cancelled: { label: 'Batal', className: 'border-gray-300 bg-gray-50 text-gray-600' },
}

function ParticipantStatusBadge({ status }: { status: string | null }) {
    const cfg = PARTICIPANT_STATUS_CONFIG[status || ''] || {
        label: status || 'Belum mulai',
        className: 'border-gray-300 bg-gray-50 text-gray-600',
    }

    return (
        <span className={cn('inline-flex border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', cfg.className)}>
            {cfg.label}
        </span>
    )
}

function getParticipantName(participant: EventParticipant) {
    return participant.full_name || `User ${participant.user_id.slice(0, 8)}`
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function getCertificateKindLabel(kind: string | null) {
    if (kind === 'winner_1') return 'Juara 1'
    if (kind === 'winner_2') return 'Juara 2'
    if (kind === 'winner_3') return 'Juara 3'
    if (kind === 'participant') return 'Peserta'
    return '-'
}

function CertificateNameEditModal({
    participant,
    onClose,
}: {
    participant: EventParticipant
    onClose: () => void
}) {
    const [name, setName] = useState(participant.certificate_name || '')
    const [error, setError] = useState<string | null>(null)
    const [isSaving, startSaving] = useTransition()
    const router = useRouter()

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)

        if (!participant.certificate_id) {
            setError('Sertifikat belum tersedia untuk peserta ini.')
            return
        }

        startSaving(async () => {
            const result = await updateEventCertificateName(participant.certificate_id as string, name)
            if (!result.success) {
                setError(result.message)
                toast.error(result.message)
                return
            }

            toast.success(result.message)
            router.refresh()
            onClose()
        })
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.form
                onSubmit={submit}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-lg border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
                <div className="mb-5 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-emerald-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <Award size={28} strokeWidth={3} />
                </div>
                <h3 className="font-handwriting text-3xl font-black leading-tight text-gray-900">Koreksi Nama Sertifikat</h3>
                <p className="mt-2 text-sm font-medium text-gray-600">
                    Koreksi ini hanya bisa dilakukan admin. PDF lama akan dibatalkan dan file baru dibuat saat sertifikat di-download lagi.
                </p>
                <div className="mt-5 space-y-4">
                    <div className="border-2 border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Peserta</p>
                        <p className="mt-1 font-black text-gray-900">{getParticipantName(participant)}</p>
                        <p className="mt-1 break-all font-mono text-[11px] font-bold text-gray-400">{participant.certificate_number}</p>
                    </div>
                    <label className="block">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Nama pada sertifikat</span>
                        <input
                            value={name}
                            onChange={(inputEvent) => setName(inputEvent.target.value)}
                            maxLength={100}
                            className="mt-2 w-full border-2 border-gray-900 bg-white px-4 py-3 text-base font-black text-gray-900 outline-none focus:border-emerald-600"
                        />
                    </label>
                    {error && (
                        <div className="border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
                    )}
                </div>
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="border-2 border-gray-900 bg-white px-5 py-2.5 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-gray-100"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-emerald-600 px-5 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Simpan Koreksi
                    </button>
                </div>
            </motion.form>
        </div>
    )
}

function CertificatePreviewModal({
    participant,
    onClose,
    onEdit,
}: {
    participant: EventParticipant
    onClose: () => void
    onEdit: () => void
}) {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="max-h-[92vh] w-full max-w-5xl overflow-y-auto border-2 border-gray-900 bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 border-2 border-gray-900 bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                            <Eye size={14} /> Preview Admin
                        </p>
                        <h3 className="mt-2 font-handwriting text-3xl font-black text-gray-900">Cek Sertifikat Peserta</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 text-sm font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <Save size={15} /> Edit Nama
                        </button>
                        {participant.certificate_number && participant.certificate_name_locked_at && (
                            <a
                                href={`/api/certificates/${encodeURIComponent(participant.certificate_number)}/download`}
                                className="inline-flex items-center gap-2 border-2 border-gray-900 bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <Download size={15} /> Download PDF
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            Tutup
                        </button>
                    </div>
                </div>

                <EventCertificatePreview
                    certificateNumber={participant.certificate_number || '-'}
                    cacheKey={participant.certificate_updated_at || participant.certificate_name_locked_at}
                />
            </motion.div>
        </div>
    )
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-900">{value}<span className="text-gray-400">/{max}</span> <span className="text-gray-400">({pct}%)</span></span>
            </div>
            <div className="h-2 w-full border border-gray-200 bg-gray-100 rounded-sm overflow-hidden">
                <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

// ─── Event Form ───────────────────────────────────────────────────────────────
function EventForm({ event, action, isPending, onDirtyChange }: {
    event?: TryoutEvent | null
    action: (formData: FormData) => void
    isPending: boolean
    onDirtyChange?: (hasChanges: boolean) => void
}) {
    const [values, setValues] = useState(() => getEventFormValues(event))
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
    const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null)
    const [isUploadingFlyer, setIsUploadingFlyer] = useState(false)
    const allowNextNavigationRef = useRef(false)

    useEffect(() => {
        setValues(getEventFormValues(event))
    }, [event])

    const updateValue = (field: keyof ReturnType<typeof getEventFormValues>, value: string | boolean) => {
        setValues((current) => ({ ...current, [field]: value }))
    }

    const handleFlyerUpload = async (file: File | null) => {
        if (!file) return

        setIsUploadingFlyer(true)
        try {
            const publicUrl = await uploadEventFlyer(file, event?.id ? `event-${event.id}` : 'event-new')
            updateValue('flyer_image_url', publicUrl)
            toast.success('Flyer event berhasil diupload')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal upload flyer event'
            toast.error(message)
        } finally {
            setIsUploadingFlyer(false)
        }
    }

    const closeAt = getEventFormCloseAt(values)
    const resultVisibleAt = closeAt
    const explanationVisibleAt = closeAt
    const initialSnapshot = event ? serializeEventFormValues(getEventFormValues(event)) : null
    const currentSnapshot = serializeEventFormValues(values)
    const hasChanges = !event || currentSnapshot !== initialSnapshot

    useEffect(() => {
        onDirtyChange?.(Boolean(event && hasChanges))
    }, [event, hasChanges, onDirtyChange])

    const handleSubmit = (formData: FormData) => {
        if (!event) {
            action(formData)
            return
        }

        if (!hasChanges) {
            toast.info('Tidak ada perubahan pengaturan event untuk disimpan')
            return
        }

        setPendingFormData(formData)
    }

    useEffect(() => {
        if (!event || !hasChanges) return

        const handleBeforeUnload = (browserEvent: BeforeUnloadEvent) => {
            if (allowNextNavigationRef.current) return

            browserEvent.preventDefault()
            browserEvent.returnValue = ''
        }

        const handleDocumentClick = (browserEvent: MouseEvent) => {
            const target = browserEvent.target
            if (!(target instanceof Element)) return

            const link = target.closest('a[href]')
            if (!(link instanceof HTMLAnchorElement)) return
            if (link.target === '_blank') return

            const nextUrl = new URL(link.href, window.location.href)
            const currentUrl = new URL(window.location.href)
            const isSamePage = nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search

            if (isSamePage) return

            browserEvent.preventDefault()
            browserEvent.stopPropagation()
            setPendingNavigationHref(link.href)
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        document.addEventListener('click', handleDocumentClick, true)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            document.removeEventListener('click', handleDocumentClick, true)
        }
    }, [event, hasChanges])

    return (
        <>
            <form action={handleSubmit} className="space-y-4">
                <input type="hidden" name="ends_at" value={closeAt} />
                <input type="hidden" name="result_visible_at" value={resultVisibleAt} />
                <input type="hidden" name="explanation_visible_at" value={explanationVisibleAt} />
                <input type="hidden" name="flyer_image_url" value={values.flyer_image_url} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Nama Event</label>
                        <input name="title" required value={values.title} onChange={(e) => updateValue('title', e.target.value)} placeholder="Tryout Akbar SKD CPNS Nasional"
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Deskripsi</label>
                        <textarea name="description" rows={2} value={values.description} onChange={(e) => updateValue('description', e.target.value)} placeholder="Deskripsi singkat event"
                            className="w-full resize-none border-2 border-gray-300 px-4 py-2.5 font-medium text-gray-900 outline-none focus:border-gray-900" />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Flyer Event</label>
                        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                            <div className="relative aspect-[4/5] overflow-hidden border-2 border-gray-300 bg-gray-50">
                                {values.flyer_image_url ? (
                                    <Image
                                        src={values.flyer_image_url}
                                        alt="Flyer event"
                                        fill
                                        className="object-cover"
                                        sizes="160px"
                                    />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                                        <ImageIcon size={28} />
                                        <span className="text-xs font-black uppercase">Belum Ada</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center transition hover:border-gray-900 hover:bg-white">
                                    {isUploadingFlyer ? <Loader2 size={20} className="animate-spin text-gray-900" /> : <Upload size={20} className="text-gray-500" />}
                                    <span className="text-sm font-black text-gray-900">
                                        {isUploadingFlyer ? 'Mengupload flyer...' : 'Upload flyer JPG, PNG, atau WebP'}
                                    </span>
                                    <span className="text-xs font-medium text-gray-400">Maksimal 4MB. Disarankan rasio 4:5 atau 16:9.</span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={isUploadingFlyer}
                                        onChange={(e) => {
                                            void handleFlyerUpload(e.target.files?.[0] || null)
                                            e.target.value = ''
                                        }}
                                        className="sr-only"
                                    />
                                </label>
                                {values.flyer_image_url && (
                                    <button
                                        type="button"
                                        onClick={() => updateValue('flyer_image_url', '')}
                                        className="inline-flex items-center gap-2 border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase text-red-600 hover:border-red-400"
                                    >
                                        <Trash2 size={13} /> Hapus Flyer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Mulai (WIB)</label>
                        <input name="starts_at" type="datetime-local" required value={values.starts_at} onChange={(e) => updateValue('starts_at', e.target.value)}
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Tutup Otomatis (WIB)</label>
                        <input type="datetime-local" value={closeAt} readOnly
                            className="w-full border-2 border-gray-300 bg-gray-100 px-4 py-2.5 font-bold text-gray-600 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Durasi (menit)</label>
                        <input name="duration_minutes" type="number" min="1" value={values.duration_minutes} onChange={(e) => updateValue('duration_minutes', e.target.value)} required
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Start Window (menit)</label>
                        <input name="start_grace_minutes" type="number" min="0" value={values.start_grace_minutes} onChange={(e) => updateValue('start_grace_minutes', e.target.value)} required
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Max Peserta</label>
                        <input name="max_participants" type="number" min="1" value={values.max_participants} onChange={(e) => updateValue('max_participants', e.target.value)}
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Jumlah Bot Leaderboard</label>
                        <input
                            name="bot_count"
                            type="number"
                            min="0"
                            max="100"
                            value={values.bot_count}
                            onChange={(e) => updateValue('bot_count', e.target.value)}
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900"
                        />
                        <p className="text-xs font-medium text-gray-400">Bot hanya tampil di leaderboard, bukan peserta asli.</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Hasil Terlihat (WIB)</label>
                        <input type="datetime-local" value={resultVisibleAt} readOnly
                            className="w-full border-2 border-gray-300 bg-gray-100 px-4 py-2.5 font-bold text-gray-600 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Pembahasan (WIB)</label>
                        <input type="datetime-local" value={explanationVisibleAt} readOnly
                            className="w-full border-2 border-gray-300 bg-gray-100 px-4 py-2.5 font-bold text-gray-600 outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="flex items-center gap-3 border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-black text-gray-900 cursor-pointer hover:border-gray-900 transition">
                            <input name="requires_code" type="checkbox" checked={values.requires_code} onChange={(e) => updateValue('requires_code', e.target.checked)} className="h-4 w-4 accent-gray-900" />
                            Wajib kode masuk untuk daftar event
                        </label>
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Link Group Peserta</label>
                        <input
                            name="group_link"
                            type="url"
                            value={values.group_link}
                            onChange={(e) => updateValue('group_link', e.target.value)}
                            placeholder="https://chat.whatsapp.com/..."
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900"
                        />
                        <p className="text-xs font-medium text-gray-400">Link ini hanya tampil untuk user yang sudah terdaftar atau berhasil bayar.</p>
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Link Dokumentasi Event</label>
                        <input
                            name="documentation_url"
                            type="url"
                            value={values.documentation_url}
                            onChange={(e) => updateValue('documentation_url', e.target.value)}
                            placeholder="https://youtu.be/..."
                            className="w-full border-2 border-gray-300 px-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900"
                        />
                        <p className="text-xs font-medium text-gray-400">Link publik untuk dokumentasi event selesai. Akan tampil di landing page bagian Jejak Event.</p>
                    </div>
                    {/* Payment Section */}
                    <div className="sm:col-span-2 border-t-2 border-gray-200 pt-4">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Pembayaran</p>
                        <label className="flex items-center gap-3 border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-black text-gray-900 cursor-pointer hover:border-gray-900 transition mb-3">
                            <input
                                name="is_paid"
                                type="checkbox"
                                checked={values.is_paid}
                                onChange={(e) => updateValue('is_paid', e.target.checked)}
                                className="h-4 w-4 accent-gray-900"
                            />
                            Event Berbayar (wajib beli tiket sebelum daftar)
                        </label>
                        {values.is_paid && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Harga Tiket (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">Rp</span>
                                    <input
                                        name="price"
                                        type="number"
                                        min="0"
                                        step="500"
                                        required={values.is_paid}
                                        value={values.price}
                                        onChange={(e) => updateValue('price', e.target.value)}
                                        className="w-full border-2 border-gray-300 pl-10 pr-4 py-2.5 font-bold text-gray-900 outline-none focus:border-gray-900"
                                    />
                                </div>
                                <p className="text-xs font-medium text-gray-400">Tidak ada admin fee tambahan. Harga ini yang dibayar user.</p>
                            </div>
                        )}
                    </div>
                </div>
                <button disabled={isPending || isUploadingFlyer}
                    className="flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition hover:translate-y-px hover:shadow-none disabled:opacity-60">
                    {isPending || isUploadingFlyer ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isUploadingFlyer ? 'Menunggu Upload...' : event ? 'Simpan Perubahan' : 'Buat Event'}
                </button>
            </form>

            <AnimatePresence>
                {pendingFormData && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-md border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-blue-100 text-blue-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <AlertTriangle size={28} strokeWidth={3} />
                            </div>
                            <h3 className="font-handwriting text-3xl font-black leading-tight text-gray-900">
                                Simpan Perubahan Event?
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                                Perubahan pengaturan event akan memengaruhi jadwal, akses kode, pembayaran, link group, atau info peserta yang tampil di dashboard user.
                            </p>
                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setPendingFormData(null)}
                                    disabled={isPending}
                                    className="rounded-md border-2 border-gray-900 bg-white px-5 py-2.5 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-100 disabled:opacity-60"
                                >
                                    Cek Lagi
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                        action(pendingFormData)
                                        setPendingFormData(null)
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-blue-600 px-5 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isPending && <Loader2 className="animate-spin" size={16} />}
                                    Simpan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {pendingNavigationHref && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-md border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-yellow-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <AlertTriangle size={28} strokeWidth={3} />
                            </div>
                            <h3 className="font-handwriting text-3xl font-black leading-tight text-gray-900">
                                Perubahan Belum Disimpan
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                                Ada perubahan pengaturan event yang belum disimpan. Kalau pindah halaman sekarang, perubahan jadwal, akses, pembayaran, atau link group bisa hilang.
                            </p>
                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setPendingNavigationHref(null)}
                                    className="rounded-md border-2 border-gray-900 bg-white px-5 py-2.5 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-100"
                                >
                                    Tetap di Sini
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        allowNextNavigationRef.current = true
                                        window.location.href = pendingNavigationHref
                                    }}
                                    className="rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-800"
                                >
                                    Tinggalkan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

function getCorrectEventQuestionOption(question: EventQuestion) {
    if (!question.options.length) return null

    if (question.type === 'TKP') {
        return question.options.find((option) => option.is_correct)
            || [...question.options].sort((left, right) => right.score_value - left.score_value)[0]
    }

    return question.options.find((option) => option.is_correct) || null
}

// ─── Status Action Buttons ────────────────────────────────────────────────────
const STATUS_ACTIONS: Array<{
    targetStatus: EventStatus
    label: string
    icon: React.ReactNode
    btnClass: string
    confirmTitle?: string
    confirmMessage?: string
    confirmLabel?: string
}> = [
    {
        targetStatus: 'scheduled',
        label: 'Publish',
        icon: <Eye size={14} />,
        btnClass: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    },
    {
        targetStatus: 'live',
        label: 'Go Live',
        icon: <Radio size={14} />,
        btnClass: 'border-green-600 bg-green-600 text-white hover:bg-green-700',
        confirmTitle: 'Jadikan Event Live?',
        confirmMessage: 'Event akan langsung LIVE dan peserta bisa mulai mengerjakan tryout.',
        confirmLabel: 'Go Live',
    },
    {
        targetStatus: 'closed',
        label: 'Tutup',
        icon: <EyeOff size={14} />,
        btnClass: 'border-orange-600 bg-orange-600 text-white hover:bg-orange-700',
        confirmTitle: 'Tutup Event?',
        confirmMessage: 'Peserta tidak bisa mulai lagi setelah event ditutup. Peserta yang sudah selesai tetap tersimpan.',
        confirmLabel: 'Tutup Event',
    },
    {
        targetStatus: 'cancelled',
        label: 'Cancel',
        icon: <X size={14} />,
        btnClass: 'border-red-600 bg-red-100 text-red-700 hover:bg-red-200',
        confirmTitle: 'Batalkan Event?',
        confirmMessage: 'Event akan dibatalkan. Pastikan keputusan ini sudah benar sebelum lanjut.',
        confirmLabel: 'Batalkan Event',
    },
]

// ─── Detail Panel Tabs ────────────────────────────────────────────────────────
type DetailTab = 'stats' | 'settings' | 'questions' | 'codes' | 'participants'
type EventQuestionGenerationMode = 'full' | 'TWK' | 'TIU' | 'TKP'

const QUESTION_GENERATION_OPTIONS: Array<{
    value: EventQuestionGenerationMode
    label: string
    description: string
}> = [
    { value: 'full', label: 'Full TO', description: '110 soal SKD' },
    { value: 'TWK', label: 'Mini TWK', description: '30 soal TWK' },
    { value: 'TIU', label: 'Mini TIU', description: '35 soal TIU' },
    { value: 'TKP', label: 'Mini TKP', description: '45 soal TKP' },
]

function GenerateQuestionsControl({
    eventId,
    isPending,
    onRunAction,
    variant = 'light',
}: {
    eventId: string
    isPending: boolean
    onRunAction: (cb: () => Promise<{ success: boolean; message: string }>) => void
    variant?: 'light' | 'dark'
}) {
    const [mode, setMode] = useState<EventQuestionGenerationMode>('full')
    const selectedOption = QUESTION_GENERATION_OPTIONS.find((option) => option.value === mode)

    return (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor={`generate-mode-${eventId}-${variant}`}>
                Pilih jenis paket soal
            </label>
            <select
                id={`generate-mode-${eventId}-${variant}`}
                value={mode}
                disabled={isPending}
                onChange={(event) => setMode(event.target.value as EventQuestionGenerationMode)}
                className="min-w-0 border-2 border-gray-900 bg-white px-3 py-2.5 text-sm font-black text-gray-900 outline-none disabled:opacity-60"
            >
                {QUESTION_GENERATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                    </option>
                ))}
            </select>
            <button
                disabled={isPending}
                onClick={() => onRunAction(() => generateTryoutEventQuestions(eventId, mode))}
                className={cn(
                    'inline-flex items-center justify-center gap-2 border-2 px-4 py-2.5 text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition hover:translate-y-px hover:shadow-none disabled:opacity-60',
                    variant === 'dark'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-900 bg-white text-gray-900'
                )}
                title={selectedOption?.description}
            >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Generate
            </button>
        </div>
    )
}

function DetailPanel({
    event, onClose, isPending, onRunAction, onUpdate, onSettingsDirtyChange,
}: {
    event: TryoutEvent
    onClose: () => void
    isPending: boolean
    onRunAction: (cb: () => Promise<{ success: boolean; message: string }>) => void
    onUpdate: (eventId: string, fd: FormData) => void
    onSettingsDirtyChange?: (hasChanges: boolean) => void
}) {
    const [tab, setTab] = useState<DetailTab>('stats')
    const [codeToDelete, setCodeToDelete] = useState<EventCode | null>(null)
    const [statusToConfirm, setStatusToConfirm] = useState<typeof STATUS_ACTIONS[number] | null>(null)
    const [certificateToEdit, setCertificateToEdit] = useState<EventParticipant | null>(null)
    const [certificateToPreview, setCertificateToPreview] = useState<EventParticipant | null>(null)
    const [settingsHasChanges, setSettingsHasChanges] = useState(false)
    const [pendingTab, setPendingTab] = useState<DetailTab | null>(null)
    const [pendingClose, setPendingClose] = useState(false)
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(() => new Set())

    const TABS: Array<{ id: DetailTab; label: string; icon: React.ReactNode }> = [
        { id: 'stats', label: 'Statistik', icon: <BarChart3 size={15} /> },
        { id: 'settings', label: 'Pengaturan', icon: <Settings size={15} /> },
        { id: 'questions', label: `Soal (${event.questions.length})`, icon: <BookOpen size={15} /> },
        { id: 'codes', label: `Kode (${event.codes.length})`, icon: <Ticket size={15} /> },
        { id: 'participants', label: `Peserta (${event.participants.length})`, icon: <Users size={15} /> },
    ]

    const handleSettingsDirtyChange = useCallback((hasChanges: boolean) => {
        setSettingsHasChanges(hasChanges)
        onSettingsDirtyChange?.(hasChanges)
    }, [onSettingsDirtyChange])

    const requestTabChange = (nextTab: DetailTab) => {
        if (nextTab === tab) return

        if (tab === 'settings' && settingsHasChanges) {
            setPendingTab(nextTab)
            return
        }

        setTab(nextTab)
    }

    const requestClose = () => {
        if (tab === 'settings' && settingsHasChanges) {
            setPendingClose(true)
            return
        }

        onClose()
    }

    const confirmLeaveSettings = () => {
        setSettingsHasChanges(false)

        if (pendingTab) {
            setTab(pendingTab)
            setPendingTab(null)
            return
        }

        if (pendingClose) {
            setPendingClose(false)
            onClose()
        }
    }

    const toggleQuestionDetail = (questionId: string) => {
        setExpandedQuestionIds((current) => {
            const next = new Set(current)
            if (next.has(questionId)) {
                next.delete(questionId)
            } else {
                next.add(questionId)
            }
            return next
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t-0 border-2 border-gray-900 bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]"
        >
            {/* Tab Bar */}
            <div className="flex items-center gap-0 border-b-2 border-gray-900 bg-white">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => requestTabChange(t.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wide border-r-2 border-gray-900 transition',
                            tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                        )}>
                        {t.icon}{t.label}
                    </button>
                ))}
                <button onClick={requestClose} className="ml-auto px-3 py-2.5 text-gray-400 hover:text-gray-900 transition">
                    <X size={16} />
                </button>
            </div>

            <div className="p-5">
                {/* ── STATS TAB ── */}
                {tab === 'stats' && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
                        <div className="space-y-5">
                            {/* Meta */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Soal', value: event.question_count, icon: <BookOpen size={14} className="text-blue-500" /> },
                                    { label: 'Durasi', value: `${event.duration_minutes}m`, icon: <Clock size={14} className="text-orange-500" /> },
                                    { label: 'Window', value: `${event.start_grace_minutes}m`, icon: <Clock size={14} className="text-yellow-500" /> },
                                    { label: 'Max', value: event.max_participants || '∞', icon: <Users size={14} className="text-green-500" /> },
                                    { label: 'Bot', value: event.bot_count, icon: <Users size={14} className="text-indigo-500" /> },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="border-2 border-gray-200 bg-white p-3">
                                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 mb-1">{icon}{label}</div>
                                        <p className="text-xl font-black text-gray-900">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Progress Bars */}
                            <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Progres Peserta</h4>
                                <ProgressRow label="Pendaftar" value={event.participant_count} max={event.max_participants || event.participant_count || 1} color="bg-blue-400" />
                                <ProgressRow label="Bot Leaderboard" value={event.bot_count} max={Math.max(event.bot_count, 1)} color="bg-indigo-400" />
                                <ProgressRow label="Mulai Tryout" value={event.session_count} max={event.participant_count || 1} color="bg-yellow-400" />
                                <ProgressRow label="Selesai" value={event.completed_count} max={event.session_count || 1} color="bg-green-400" />
                                <ProgressRow label="Lulus" value={event.passed_count} max={event.completed_count || 1} color="bg-emerald-500" />
                            </div>

                            {/* Schedule Info */}
                            <div className="border-2 border-gray-200 bg-white p-4 text-sm space-y-1.5 font-medium text-gray-700">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Jadwal</h4>
                                <div className="flex gap-2"><span className="font-black text-gray-400 w-24">Mulai</span><span>{formatDate(event.starts_at)}</span></div>
                                <div className="flex gap-2"><span className="font-black text-gray-400 w-24">Tutup</span><span>{formatDate(event.ends_at)}</span></div>
                                <div className="flex gap-2"><span className="font-black text-gray-400 w-24">Hasil</span><span>{formatDate(event.result_visible_at)}</span></div>
                                <div className="flex gap-2"><span className="font-black text-gray-400 w-24">Pembahasan</span><span>{formatDate(event.explanation_visible_at)}</span></div>
                            </div>
                        </div>

                        {/* Action sidebar */}
                        <div className="space-y-3">
                            <a 
                                href={`/cpns/live/${event.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center justify-center gap-2 border-2 border-indigo-600 bg-indigo-50 px-3 py-2.5 text-sm font-black text-indigo-700 transition shadow-[2px_2px_0px_0px_rgba(79,70,229,0.3)] hover:translate-y-px hover:shadow-none mb-2"
                            >
                                <Trophy size={14} /> Live Leaderboard
                            </a>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ubah Status</p>
                            {STATUS_ACTIONS.map((action) => (
                                <button key={action.targetStatus}
                                    disabled={isPending || event.status === action.targetStatus}
                                    onClick={() => {
                                        if (action.confirmMessage) {
                                            setStatusToConfirm(action)
                                            return
                                        }

                                        onRunAction(() => updateTryoutEventStatus(event.id, action.targetStatus))
                                    }}
                                    className={cn(
                                        'flex w-full items-center justify-center gap-2 border-2 px-3 py-2.5 text-sm font-black transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-y-px hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed',
                                        action.btnClass,
                                        event.status === action.targetStatus && 'ring-2 ring-offset-1 ring-gray-900'
                                    )}>
                                    {action.icon}{action.label}
                                    {event.status === action.targetStatus && <CheckCircle2 size={13} />}
                                </button>
                            ))}
                            <div className="border-t-2 border-gray-200 pt-3 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sertifikat</p>
                                <div className={cn(
                                    'border-2 p-3 text-xs font-bold',
                                    event.certificate_enabled ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-600'
                                )}>
                                    {event.certificate_enabled
                                        ? `Dirilis ${formatDate(event.certificate_released_at)}`
                                        : 'Belum dirilis ke peserta'}
                                </div>
                                <button
                                    type="button"
                                    disabled={isPending || (event.status !== 'closed' && !event.certificate_enabled)}
                                    onClick={() => onRunAction(() => updateTryoutEventCertificateRelease(event.id, !event.certificate_enabled))}
                                    className={cn(
                                        'flex w-full items-center justify-center gap-2 border-2 px-3 py-2.5 text-sm font-black transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40',
                                        event.certificate_enabled
                                            ? 'border-red-700 bg-red-50 text-red-700'
                                            : 'border-emerald-700 bg-emerald-600 text-white'
                                    )}
                                >
                                    <Award size={14} />
                                    {event.certificate_enabled ? 'Nonaktifkan Sertifikat' : 'Rilis Sertifikat'}
                                </button>
                            </div>
                            <div className="border-t-2 border-gray-200 pt-3 space-y-2">
                                <a href={`/api/admin/export?type=events&format=csv&event_id=${event.id}`}
                                    className="flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-3 py-2.5 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:translate-y-px hover:shadow-none transition">
                                    <Download size={14} /> Export CSV
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SETTINGS TAB ── */}
                {tab === 'settings' && (
                    <EventForm
                        event={event}
                        action={(fd) => onUpdate(event.id, fd)}
                        isPending={isPending}
                        onDirtyChange={handleSettingsDirtyChange}
                    />
                )}

                {/* ── QUESTIONS TAB ── */}
                {tab === 'questions' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 border-2 border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h4 className="font-handwriting text-2xl font-black text-gray-900">Daftar Soal Event</h4>
                                <p className="text-sm font-medium text-gray-500">
                                    {event.questions.length} soal tersusun sesuai urutan paket event.
                                </p>
                            </div>
                            <GenerateQuestionsControl eventId={event.id} isPending={isPending} onRunAction={onRunAction} variant="dark" />
                        </div>

                        {event.questions.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-300 bg-white p-8 text-center">
                                <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                                <p className="text-sm font-black uppercase tracking-widest text-gray-400">Belum ada soal</p>
                                <p className="mt-1 text-sm font-medium text-gray-500">Klik Generate Ulang untuk membuat paket soal event.</p>
                            </div>
                        ) : (
                            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                {event.questions.map((question) => {
                                    const isExpanded = expandedQuestionIds.has(question.id)
                                    const correctOption = getCorrectEventQuestionOption(question)

                                    return (
                                        <div key={question.id} className="border-2 border-gray-200 bg-white">
                                            <div className="grid gap-3 p-4 sm:grid-cols-[64px_1fr]">
                                                <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-gray-50 font-mono text-sm font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                    #{question.display_order}
                                                </div>
                                                <div className="min-w-0 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="border-2 border-gray-900 bg-gray-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                                                            {question.type}
                                                        </span>
                                                        <span className="border border-gray-300 px-2 py-0.5 font-mono text-[11px] font-black text-gray-600">
                                                            {question.question_code}
                                                        </span>
                                                        {(question.sub_category || question.category) && (
                                                            <span className="truncate text-xs font-bold text-gray-500">
                                                                {question.sub_category || question.category}
                                                            </span>
                                                        )}
                                                        <span className="ml-auto text-[11px] font-black uppercase text-gray-400">
                                                            {question.options.length} opsi
                                                        </span>
                                                    </div>
                                                    <div className="line-clamp-3 text-sm font-semibold leading-relaxed text-gray-900">
                                                        <MathRenderer text={question.content} />
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                                                        <span className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-black text-gray-700">
                                                            Kunci: {correctOption ? OPTION_LABELS[question.options.findIndex((option) => option.id === correctOption.id)] || '-' : '-'}
                                                        </span>
                                                        {question.type === 'TKP' && correctOption && (
                                                            <span className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-black text-gray-700">
                                                                Skor tertinggi: {correctOption.score_value}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleQuestionDetail(question.id)}
                                                            className="ml-auto inline-flex items-center gap-1.5 border-2 border-gray-900 bg-white px-3 py-1.5 text-xs font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:translate-y-px hover:shadow-none"
                                                        >
                                                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                            {isExpanded ? 'Tutup Detail' : 'Lihat Detail'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="space-y-4 border-t-2 border-dashed border-gray-300 bg-gray-50 p-4">
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Soal yang tampil</p>
                                                        <div className="border border-gray-200 bg-white p-4 text-sm font-medium leading-relaxed text-gray-900">
                                                            {question.image_url && (
                                                                <Image
                                                                    src={question.image_url}
                                                                    alt={`Gambar soal ${question.question_code}`}
                                                                    width={720}
                                                                    height={420}
                                                                    unoptimized
                                                                    className="mb-4 max-h-72 w-full object-contain border border-gray-200 bg-white"
                                                                />
                                                            )}
                                                            <MathRenderer text={question.content} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Pilihan jawaban</p>
                                                        {question.options.length === 0 ? (
                                                            <div className="border border-gray-200 bg-white p-3 text-sm font-bold text-gray-500">
                                                                Belum ada opsi jawaban.
                                                            </div>
                                                        ) : (
                                                            <div className="grid gap-2">
                                                                {question.options.map((option, optionIndex) => {
                                                                    const isCorrect = correctOption?.id === option.id

                                                                    return (
                                                                        <div
                                                                            key={option.id}
                                                                            className={cn(
                                                                                'flex gap-3 border p-3 text-sm',
                                                                                isCorrect ? 'border-gray-900 bg-white text-gray-900' : 'border-gray-200 bg-white text-gray-700'
                                                                            )}
                                                                        >
                                                                            <span className={cn(
                                                                                'flex h-7 w-7 shrink-0 items-center justify-center border font-black',
                                                                                isCorrect ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-600'
                                                                            )}>
                                                                                {OPTION_LABELS[optionIndex] || '?'}
                                                                            </span>
                                                                            <div className="min-w-0 flex-1 space-y-2">
                                                                                {option.image_url && (
                                                                                    <Image
                                                                                        src={option.image_url}
                                                                                        alt={`Pilihan ${OPTION_LABELS[optionIndex] || '?'}`}
                                                                                        width={420}
                                                                                        height={260}
                                                                                        unoptimized
                                                                                        className="max-h-40 w-full max-w-sm object-contain border border-gray-200 bg-white"
                                                                                    />
                                                                                )}
                                                                                {option.content.trim() ? (
                                                                                    <MathRenderer text={option.content} />
                                                                                ) : (
                                                                                    <span className="font-bold text-gray-400">Opsi tanpa teks</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="shrink-0 text-right">
                                                                                {question.type === 'TKP' ? (
                                                                                    <span className={cn(
                                                                                        'inline-flex border px-2 py-1 text-[11px] font-black',
                                                                                        isCorrect ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-600'
                                                                                    )}>
                                                                                        {option.score_value} poin
                                                                                    </span>
                                                                                ) : isCorrect ? (
                                                                                    <span className="inline-flex border border-green-600 bg-green-50 px-2 py-1 text-[11px] font-black text-green-700">
                                                                                        Benar
                                                                                    </span>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Pembahasan</p>
                                                        <div className="border border-gray-200 bg-white p-4 text-sm font-medium leading-relaxed text-gray-900">
                                                            <MathRenderer text={question.explanation || '-'} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── CODES TAB ── */}
                {tab === 'codes' && (
                    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                        {/* New code form */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Buat Kode Baru</p>
                            <CodeForm eventId={event.id} onRunAction={onRunAction} isPending={isPending} />
                        </div>

                        {/* Existing codes */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                                Daftar Kode ({event.codes.length})
                            </p>
                            {event.codes.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm font-bold text-gray-400">
                                    Belum ada kode masuk.
                                </div>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {event.codes.map((code) => (
                                        <div key={code.id} className={cn(
                                            'border-2 bg-white p-3 space-y-2',
                                            code.is_active ? 'border-gray-900' : 'border-gray-300 opacity-60'
                                        )}>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-base font-black text-gray-900">{code.code}</span>
                                                    <button onClick={() => { navigator.clipboard.writeText(code.code); toast.success('Kode disalin!') }}
                                                        className="text-gray-400 hover:text-gray-900 transition">
                                                        <Copy size={13} />
                                                    </button>
                                                </div>
                                                <span className={cn('text-[10px] font-black border px-1.5 py-0.5', code.is_active ? 'border-green-500 text-green-700' : 'border-gray-400 text-gray-500')}>
                                                    {code.is_active ? 'AKTIF' : 'OFF'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-gray-500">
                                                {code.used_count}/{code.max_uses} dipakai · exp {formatDate(code.expires_at)}
                                            </p>
                                            <div className="h-1.5 w-full bg-gray-100 border border-gray-200 rounded-sm overflow-hidden">
                                                <div className="h-full bg-blue-400" style={{ width: `${Math.round((code.used_count / code.max_uses) * 100)}%` }} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button disabled={isPending}
                                                    onClick={() => onRunAction(() => toggleTryoutEventCode(code.id, !code.is_active))}
                                                    className="flex-1 border border-gray-300 bg-gray-50 py-1.5 text-xs font-black text-gray-700 hover:border-gray-900 transition disabled:opacity-50">
                                                    {code.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                </button>
                                                <button disabled={isPending}
                                                    onClick={() => setCodeToDelete(code)}
                                                    className="border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 hover:border-red-500 transition disabled:opacity-50">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PARTICIPANTS TAB */}
                {tab === 'participants' && (
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-4">
                            {[
                                { label: 'Terdaftar', value: event.participants.length, className: 'text-blue-700' },
                                { label: 'Mulai', value: event.participants.filter((participant) => participant.session_id).length, className: 'text-yellow-700' },
                                { label: 'Selesai', value: event.participants.filter((participant) => participant.test_session_status === 'completed' || participant.event_session_status === 'completed').length, className: 'text-green-700' },
                                { label: 'Lulus', value: event.participants.filter((participant) => participant.is_passed).length, className: 'text-emerald-700' },
                            ].map((item) => (
                                <div key={item.label} className="border-2 border-gray-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                                    <p className={cn('mt-1 text-2xl font-black', item.className)}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 border-2 border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h4 className="font-handwriting text-2xl font-black text-gray-900">Monitoring Peserta</h4>
                                <p className="text-sm font-medium text-gray-500">
                                    Pantau status daftar, pengerjaan, skor, dan kelulusan peserta event.
                                </p>
                            </div>
                            <a href={`/api/admin/export?type=events&format=csv&event_id=${event.id}`}
                                className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition hover:translate-y-px hover:shadow-none">
                                <Download size={14} /> Export CSV
                            </a>
                        </div>

                        {event.participants.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-300 bg-white p-8 text-center">
                                <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                                <p className="text-sm font-black uppercase tracking-widest text-gray-400">Belum ada peserta</p>
                                <p className="mt-1 text-sm font-medium text-gray-500">Peserta yang daftar atau berhasil bayar akan muncul di sini.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border-2 border-gray-200 bg-white">
                                <table className="min-w-[1120px] w-full text-left text-sm">
                                    <thead className="border-b-2 border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <tr>
                                            <th className="px-3 py-3">Peserta</th>
                                            <th className="px-3 py-3">Daftar</th>
                                            <th className="px-3 py-3">Kode</th>
                                            <th className="px-3 py-3">Status</th>
                                            <th className="px-3 py-3">Pengerjaan</th>
                                            <th className="px-3 py-3 text-right">Skor</th>
                                            <th className="px-3 py-3">Sertifikat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {event.participants.map((participant) => (
                                            <tr key={participant.id} className="align-top hover:bg-gray-50">
                                                <td className="px-3 py-3">
                                                    <p className="font-black text-gray-900">{getParticipantName(participant)}</p>
                                                    <p className="mt-0.5 font-mono text-[11px] font-bold text-gray-400">{participant.user_id.slice(0, 8)}</p>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <p className="font-bold text-gray-700">{formatDate(participant.registered_at)}</p>
                                                </td>
                                                <td className="px-3 py-3">
                                                    {participant.code ? (
                                                        <span className="inline-flex border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-xs font-black text-gray-700">
                                                            {participant.code}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <ParticipantStatusBadge status={participant.status} />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="space-y-1">
                                                        <ParticipantStatusBadge status={participant.event_session_status || participant.test_session_status} />
                                                        <p className="text-xs font-medium text-gray-500">
                                                            {participant.started_at ? formatDate(participant.started_at) : 'Belum mulai'}
                                                        </p>
                                                        {participant.finished_at && (
                                                            <p className="text-xs font-medium text-gray-400">Selesai {formatDate(participant.finished_at)}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    {participant.total_score == null ? (
                                                        <span className="text-xs font-bold text-gray-400">-</span>
                                                    ) : (
                                                        <div>
                                                            <p className="text-xl font-black text-gray-900">{participant.total_score}</p>
                                                            <p className="text-[11px] font-bold text-gray-400">
                                                                {participant.score_twk ?? 0}/{participant.score_tiu ?? 0}/{participant.score_tkp ?? 0}
                                                            </p>
                                                            <div className="mt-2">
                                                                {participant.is_passed == null ? (
                                                                    <span className="text-xs font-bold text-gray-400">-</span>
                                                                ) : participant.is_passed ? (
                                                                    <span className="inline-flex border border-green-500 bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-green-700">Lulus</span>
                                                                ) : (
                                                                    <span className="inline-flex border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">Tidak Lulus</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {participant.certificate_id ? (
                                                        <div className="space-y-2">
                                                            <div>
                                                                <span className="inline-flex border border-emerald-500 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                                                    {getCertificateKindLabel(participant.certificate_kind)}
                                                                </span>
                                                                <p className="mt-1 max-w-[220px] truncate font-black text-gray-900">{participant.certificate_name}</p>
                                                                <p className="mt-0.5 max-w-[220px] truncate font-mono text-[10px] font-bold text-gray-400">{participant.certificate_number}</p>
                                                                {!participant.certificate_name_locked_at && (
                                                                    <p className="mt-1 text-[10px] font-black uppercase text-yellow-700">Nama belum dikunci</p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCertificateToEdit(participant)}
                                                                    className="inline-flex items-center gap-1 border border-gray-300 bg-white px-2 py-1 text-[11px] font-black text-gray-700 transition hover:border-gray-900"
                                                                >
                                                                    <Save size={11} /> Edit Nama
                                                                </button>
                                                                {participant.certificate_number && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setCertificateToPreview(participant)}
                                                                            className="inline-flex items-center gap-1 border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 transition hover:border-blue-600"
                                                                        >
                                                                            <Eye size={11} /> Preview
                                                                        </button>
                                                                        {participant.certificate_name_locked_at && (
                                                                            <a
                                                                                href={`/api/certificates/${encodeURIComponent(participant.certificate_number)}/download`}
                                                                                className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 transition hover:border-emerald-600"
                                                                            >
                                                                                <Download size={11} /> PDF
                                                                            </a>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">Belum klaim</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {certificateToPreview && (
                    <CertificatePreviewModal
                        participant={certificateToPreview}
                        onClose={() => setCertificateToPreview(null)}
                        onEdit={() => {
                            setCertificateToEdit(certificateToPreview)
                            setCertificateToPreview(null)
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {certificateToEdit && (
                    <CertificateNameEditModal
                        participant={certificateToEdit}
                        onClose={() => setCertificateToEdit(null)}
                    />
                )}
            </AnimatePresence>

            {/* Delete code confirm */}
            <AnimatePresence>
                {statusToConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-md border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-yellow-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <AlertTriangle size={28} strokeWidth={3} />
                            </div>
                            <h3 className="font-handwriting text-3xl font-black leading-tight text-gray-900">
                                {statusToConfirm.confirmTitle}
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                                {statusToConfirm.confirmMessage}
                            </p>
                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setStatusToConfirm(null)}
                                    disabled={isPending}
                                    className="rounded-md border-2 border-gray-900 bg-white px-5 py-2.5 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-100 disabled:opacity-60"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                        const targetStatus = statusToConfirm.targetStatus
                                        setStatusToConfirm(null)
                                        onRunAction(() => updateTryoutEventStatus(event.id, targetStatus))
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-60"
                                >
                                    {isPending && <Loader2 className="animate-spin" size={16} />}
                                    {statusToConfirm.confirmLabel}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {codeToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-sm border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="font-handwriting text-2xl font-black text-gray-900">Hapus Kode?</h3>
                            <p className="mt-2 text-sm font-medium text-gray-600">Kode <strong>{codeToDelete.code}</strong> akan dihapus permanen.</p>
                            <div className="mt-4 flex gap-3">
                                <button onClick={() => setCodeToDelete(null)} className="flex-1 border-2 border-gray-900 bg-white py-2 font-black text-gray-900">Batal</button>
                                <button disabled={isPending} onClick={() => { onRunAction(() => deleteTryoutEventCode(codeToDelete.id)); setCodeToDelete(null) }}
                                    className="flex-1 flex items-center justify-center gap-1 border-2 border-gray-900 bg-gray-900 py-2 font-black text-white disabled:opacity-60">
                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Hapus
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {(pendingTab || pendingClose) && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-md border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-yellow-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <AlertTriangle size={28} strokeWidth={3} />
                            </div>
                            <h3 className="font-handwriting text-3xl font-black leading-tight text-gray-900">
                                Perubahan Belum Disimpan
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                                Ada perubahan pengaturan event yang belum disimpan. Kalau keluar dari tab Pengaturan sekarang, perubahan jadwal, akses, pembayaran, atau link group bisa hilang.
                            </p>
                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPendingTab(null)
                                        setPendingClose(false)
                                    }}
                                    className="rounded-md border-2 border-gray-900 bg-white px-5 py-2.5 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-100"
                                >
                                    Tetap di Pengaturan
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmLeaveSettings}
                                    className="rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-800"
                                >
                                    Tinggalkan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ─── Code Creation Form ───────────────────────────────────────────────────────
function CodeForm({ eventId, onRunAction, isPending }: {
    eventId: string
    onRunAction: (cb: () => Promise<{ success: boolean; message: string }>) => void
    isPending: boolean
}) {
    const [code, setCode] = useState('')
    const [maxUses, setMaxUses] = useState('1')
    const [expiresAt, setExpiresAt] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fd = new FormData()
        fd.set('code', code)
        fd.set('max_uses', maxUses)
        if (expiresAt) fd.set('expires_at', expiresAt)
        onRunAction(() => createTryoutEventCode(eventId, fd))
        setCode('')
    }

    return (
        <form onSubmit={handleSubmit} className="border-2 border-gray-900 bg-white p-4 space-y-3">
            <div className="grid grid-cols-[1fr_80px] gap-2">
                <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Kode</label>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required minLength={4} maxLength={32}
                        placeholder="AKBAR-2026"
                        className="w-full border-2 border-gray-300 px-3 py-2 font-black uppercase text-gray-900 outline-none focus:border-gray-900" />
                </div>
                <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Limit</label>
                    <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} required
                        className="w-full border-2 border-gray-300 px-3 py-2 font-black text-gray-900 outline-none focus:border-gray-900" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Kadaluarsa (opsional)</label>
                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full border-2 border-gray-300 px-3 py-2 font-bold text-gray-900 outline-none focus:border-gray-900" />
            </div>
            <button type="submit" disabled={isPending || !code}
                className="flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] disabled:opacity-60 transition hover:translate-y-px hover:shadow-none">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Buat Kode
            </button>
        </form>
    )
}

// ─── Event Create Modal ───────────────────────────────────────────────────────
export function EventCreateController() {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleCreate = (formData: FormData) => {
        startTransition(async () => {
            const result = await createTryoutEvent(formData)
            if (result.success) {
                toast.success(result.message)
                setIsOpen(false)
                router.refresh()
            }
            else toast.error(result.message)
        })
    }

    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition hover:translate-y-px hover:shadow-none hover:bg-gray-800">
                <Plus size={18} /> Buat Event
            </button>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative mt-10 w-full max-w-2xl border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <button type="button" onClick={() => setIsOpen(false)} className="absolute right-4 top-4 border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <X size={16} />
                            </button>
                            <h2 className="pr-12 font-handwriting text-3xl font-black text-gray-900">Buat Event Baru</h2>
                            <p className="mb-5 mt-1 text-sm font-medium text-gray-600">Siapkan jadwal dan aturan dasar Tryout Akbar.</p>
                            <EventForm action={handleCreate} isPending={isPending} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TryoutAkbarClient({ events }: TryoutAkbarClientProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [eventToDelete, setEventToDelete] = useState<TryoutEvent | null>(null)
    const [dirtySettingsEventId, setDirtySettingsEventId] = useState<string | null>(null)
    const [pendingExpandedId, setPendingExpandedId] = useState<string | null | undefined>(undefined)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const summary = useMemo(() => ({
        total: events.length,
        scheduled: events.filter((e) => e.status === 'scheduled').length,
        live: events.filter((e) => e.status === 'live').length,
        participants: events.reduce((sum, e) => sum + e.participant_count, 0),
        bots: events.reduce((sum, e) => sum + e.bot_count, 0),
    }), [events])

    const runAction = (callback: () => Promise<{ success: boolean; message: string }>) => {
        startTransition(async () => {
            const result = await callback()
            if (result.success) {
                toast.success(result.message)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    const handleUpdate = (eventId: string, formData: FormData) => {
        startTransition(async () => {
            const result = await updateTryoutEvent(eventId, formData)
            if (result.success) {
                toast.success(result.message)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    const handleDelete = () => {
        if (!eventToDelete) return
        startTransition(async () => {
            const result = await deleteTryoutEvent(eventToDelete.id)
            if (result.success) {
                toast.success(result.message)
                setEventToDelete(null)
                setExpandedId(null)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    const requestExpandedId = (nextExpandedId: string | null) => {
        if (expandedId && dirtySettingsEventId === expandedId && nextExpandedId !== expandedId) {
            setPendingExpandedId(nextExpandedId)
            return
        }

        setExpandedId(nextExpandedId)
    }

    const confirmExpandChange = () => {
        setDirtySettingsEventId(null)
        setExpandedId(pendingExpandedId ?? null)
        setPendingExpandedId(undefined)
    }

    return (
        <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                {[
                    { label: 'Total Event', value: summary.total, icon: <BarChart3 size={18} className="text-gray-400" /> },
                    { label: 'Scheduled', value: summary.scheduled, icon: <Clock size={18} className="text-blue-400" /> },
                    { label: 'Live', value: summary.live, icon: <Radio size={18} className="text-red-500" /> },
                    { label: 'Total Peserta', value: summary.participants, icon: <Users size={18} className="text-green-500" /> },
                    { label: 'Bot Leaderboard', value: summary.bots, icon: <Users size={18} className="text-indigo-500" /> },
                ].map(({ label, value, icon }) => (
                    <div key={label} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
                            {icon}
                        </div>
                        <p className="mt-2 font-handwriting text-4xl font-black text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            {/* Event List */}
            <div className="space-y-0">
                {events.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-900 bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-4 font-handwriting text-3xl font-black text-gray-900">Belum ada event</h2>
                        <p className="mt-2 text-sm font-medium text-gray-600">Klik Buat Event untuk menyiapkan Tryout Akbar.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((event) => {
                            const isExpanded = expandedId === event.id
                            return (
                                <div key={event.id}>
                                    {/* Event Row */}
                                    <div className={cn(
                                        'border-2 border-gray-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition',
                                        isExpanded && 'shadow-none border-b-0'
                                    )}>
                                        <div className="flex items-center gap-4 p-4">
                                            {/* Expand toggle */}
                                            <button onClick={() => requestExpandedId(isExpanded ? null : event.id)}
                                                className="shrink-0 border-2 border-gray-900 p-1.5 hover:bg-gray-100 transition">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>

                                            <div className="relative hidden h-14 w-20 shrink-0 overflow-hidden border-2 border-gray-200 bg-gray-50 sm:block">
                                                {event.flyer_image_url ? (
                                                    <Image
                                                        src={event.flyer_image_url}
                                                        alt={`Flyer ${event.title}`}
                                                        fill
                                                        className="object-cover"
                                                        sizes="80px"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-300">
                                                        <ImageIcon size={18} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                    <h3 className="font-handwriting text-xl font-black text-gray-900 truncate">{event.title}</h3>
                                                    <StatusBadge status={event.status} />
                                                    {event.requires_code && (
                                                        <span className="border border-gray-300 px-1.5 py-0.5 text-[10px] font-black uppercase text-gray-500">
                                                            🔑 Kode
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-gray-500">
                                                    {formatDate(event.starts_at)} · {event.duration_minutes}m · {event.question_count} soal
                                                </p>
                                            </div>

                                            {/* Quick stats */}
                                            <div className="hidden sm:flex items-center gap-4 text-center shrink-0">
                                                <div>
                                                    <p className="text-xl font-black text-gray-900">{event.participant_count}</p>
                                                    <p className="text-[10px] font-bold uppercase text-gray-400">Peserta</p>
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-gray-900">{event.completed_count}</p>
                                                    <p className="text-[10px] font-bold uppercase text-gray-400">Selesai</p>
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-green-600">{event.passed_count}</p>
                                                    <p className="text-[10px] font-bold uppercase text-gray-400">Lulus</p>
                                                </div>
                                            </div>

                                            {/* Delete */}
                                            <button onClick={() => setEventToDelete(event)}
                                                className="shrink-0 border-2 border-gray-200 bg-white p-1.5 text-gray-400 hover:border-red-400 hover:text-red-500 transition">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline Detail Panel */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <DetailPanel
                                                event={event}
                                                onClose={() => setExpandedId(null)}
                                                isPending={isPending}
                                                onRunAction={runAction}
                                                onUpdate={handleUpdate}
                                                onSettingsDirtyChange={(hasChanges) => {
                                                    setDirtySettingsEventId(hasChanges ? event.id : null)
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Delete Event Modal */}
            <AnimatePresence>
                {pendingExpandedId !== undefined && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-md border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-yellow-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <AlertTriangle size={28} strokeWidth={3} />
                            </div>
                            <h3 className="font-handwriting text-3xl font-black leading-tight text-gray-900">
                                Perubahan Belum Disimpan
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                                Ada perubahan pengaturan event yang belum disimpan. Kalau membuka event lain sekarang, perubahan jadwal, akses, pembayaran, atau link group bisa hilang.
                            </p>
                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setPendingExpandedId(undefined)}
                                    className="rounded-md border-2 border-gray-900 bg-white px-5 py-2.5 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-100"
                                >
                                    Tetap di Event Ini
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmExpandChange}
                                    className="rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-2.5 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-800"
                                >
                                    Tinggalkan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {eventToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            className="w-full max-w-sm border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={20} className="text-red-500" />
                                <h2 className="font-handwriting text-2xl font-black text-gray-900">Hapus Event?</h2>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-gray-700">
                                Event <strong>{eventToDelete.title}</strong> akan dihapus permanen, termasuk semua pendaftaran, kode masuk, dan sesi pengerjaan.
                            </p>
                            <div className="mt-5 flex gap-3">
                                <button onClick={() => setEventToDelete(null)} disabled={isPending}
                                    className="flex-1 border-2 border-gray-900 bg-white py-2.5 font-black text-gray-900">Batal</button>
                                <button onClick={handleDelete} disabled={isPending}
                                    className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-900 bg-red-600 py-2.5 font-black text-white disabled:opacity-60">
                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Hapus
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
