'use client'

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'

const exportTypes = [
    {
        value: 'sessions',
        label: 'Hasil Tryout',
        description: 'Rekap session user, skor, status, dan passing grade.',
    },
    {
        value: 'ranking',
        label: 'Ranking',
        description: 'Leaderboard nasional berdasarkan skor terbaik user.',
    },
    {
        value: 'questions',
        label: 'Bank Soal',
        description: 'Backup soal, opsi jawaban, kunci, poin TKP, dan pembahasan.',
    },
    {
        value: 'vouchers',
        label: 'Voucher',
        description: 'Rekap kode voucher, kuota, klaim, dan email pengguna.',
    },
    {
        value: 'events',
        label: 'Event',
        description: 'Rekap event, peserta, kode masuk, session, skor, dan kelulusan.',
    },
] as const

const sessionStatuses = [
    { value: '', label: 'Semua status' },
    { value: 'completed', label: 'Selesai' },
    { value: 'in_progress', label: 'Sedang ujian' },
    { value: 'abandoned', label: 'Abandoned' },
]

const questionTypes = [
    { value: '', label: 'Semua tipe' },
    { value: 'TWK', label: 'TWK' },
    { value: 'TIU', label: 'TIU' },
    { value: 'TKP', label: 'TKP' },
]

type ExportType = (typeof exportTypes)[number]['value']
type ExportFormat = 'xlsx' | 'csv'

type ExportEvent = {
    id: string
    title: string
    status: string
    starts_at: string
}

interface ExportDataClientProps {
    events: ExportEvent[]
}

function formatEventDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

export default function ExportDataClient({ events }: ExportDataClientProps) {
    const [exportType, setExportType] = useState<ExportType>('sessions')
    const [format, setFormat] = useState<ExportFormat>('xlsx')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [status, setStatus] = useState('')
    const [questionType, setQuestionType] = useState('')
    const [eventId, setEventId] = useState('')
    const [isExporting, setIsExporting] = useState(false)

    const selectedExport = useMemo(
        () => exportTypes.find((item) => item.value === exportType) || exportTypes[0],
        [exportType]
    )
    const selectedEvent = useMemo(
        () => events.find((event) => event.id === eventId) || null,
        [eventId, events]
    )

    const exportHref = useMemo(() => {
        const params = new URLSearchParams()
        params.set('type', exportType)
        params.set('format', format)

        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        if (status && exportType === 'sessions') params.set('status', status)
        if (questionType && exportType === 'questions') params.set('question_type', questionType)
        if (eventId && exportType === 'events') params.set('event_id', eventId)

        return `/api/admin/export?${params.toString()}`
    }, [dateFrom, dateTo, eventId, exportType, format, questionType, status])

    const handleExport = () => {
        setIsExporting(true)
        window.location.href = exportHref
        window.setTimeout(() => setIsExporting(false), 1500)
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {exportTypes.map((item) => {
                        const isActive = exportType === item.value
                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setExportType(item.value)}
                                className={`border-2 p-5 text-left transition-all ${
                                    isActive
                                        ? 'translate-x-1 -translate-y-1 border-gray-900 bg-gray-900 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]'
                                        : 'border-gray-900 bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5'
                                }`}
                            >
                                <FileSpreadsheet className="mb-4 h-7 w-7" />
                                <h3 className="font-handwriting text-2xl font-black">{item.label}</h3>
                                <p className={`mt-2 text-sm font-medium ${isActive ? 'text-gray-200' : 'text-gray-600'}`}>
                                    {item.description}
                                </p>
                            </button>
                        )
                    })}
                </div>

                <div className="border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="font-handwriting text-3xl font-black text-gray-900">Filter Export</h2>
                    <p className="mt-1 text-sm font-medium text-gray-600">
                        Pilih format dan filter data sebelum mengunduh file.
                    </p>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                Format File
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['xlsx', 'csv'] as const).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setFormat(item)}
                                        className={`rounded-md border-2 px-4 py-3 text-sm font-black uppercase transition ${
                                            format === item
                                                ? 'border-gray-900 bg-gray-900 text-white'
                                                : 'border-gray-900 bg-white text-gray-900 hover:bg-gray-100'
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {exportType === 'sessions' ? (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                    Status Session
                                </label>
                                <select
                                    value={status}
                                    onChange={(event) => setStatus(event.target.value)}
                                    className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                >
                                    {sessionStatuses.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        {exportType === 'questions' ? (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                    Tipe Soal
                                </label>
                                <select
                                    value={questionType}
                                    onChange={(event) => setQuestionType(event.target.value)}
                                    className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                >
                                    {questionTypes.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        {exportType === 'events' ? (
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                    Pilih Event
                                </label>
                                <select
                                    value={eventId}
                                    onChange={(event) => setEventId(event.target.value)}
                                    className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                >
                                    <option value="">Semua event</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.title} - {event.status} - {formatEventDate(event.starts_at)}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs font-bold text-gray-500">
                                    Pilih satu event supaya file hanya berisi peserta dan hasil event tersebut.
                                </p>
                            </div>
                        ) : null}

                        {exportType !== 'ranking' ? (
                            <>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                        Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) => setDateFrom(event.target.value)}
                                        className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                        Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) => setDateTo(event.target.value)}
                                        className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            <aside className="h-fit border-2 border-gray-900 bg-gray-100 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="font-handwriting text-3xl font-black text-gray-900">Ringkasan</h2>
                <div className="mt-5 space-y-4 text-sm">
                    <div className="border-b-2 border-gray-900 pb-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Jenis Data</p>
                        <p className="mt-1 font-black text-gray-900">{selectedExport.label}</p>
                    </div>
                    <div className="border-b-2 border-gray-900 pb-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Format</p>
                        <p className="mt-1 font-black uppercase text-gray-900">{format}</p>
                    </div>
                    {exportType === 'events' ? (
                        <div className="border-b-2 border-gray-900 pb-3">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Event</p>
                            <p className="mt-1 font-black text-gray-900">{selectedEvent?.title || 'Semua event'}</p>
                        </div>
                    ) : null}
                    <p className="font-medium leading-relaxed text-gray-600">
                        Export dibatasi maksimal 5.000 baris per unduhan supaya proses tetap ringan.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Download Export
                </button>
            </aside>
        </div>
    )
}
