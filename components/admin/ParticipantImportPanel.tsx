'use client'

import { useActionState, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toCsvWithColumns, safeFileName } from '@/lib/csv'
import { adminDangerButtonClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import {
    IMPORT_STATUS_LABELS,
    PARTICIPANT_IMPORT_COLUMNS,
    PARTICIPANT_IMPORT_COLUMN_LABELS,
    PARTICIPANT_IMPORT_SAMPLE,
    type ImportPreview,
} from '@/lib/participant-import'
import {
    commitParticipantsAction,
    previewParticipantsAction,
    type ImportActionResult,
} from '@/app/actions/admin-participant-import'

/**
 * Panel bulk import peserta (PRD §7.2.1).
 *
 * Client component karena hasil import adalah laporan PER BARIS yang harus
 * dibaca dan diperbaiki sebelum diulang — bukan pesan flash sekali tampil.
 * Lihat catatan di `app/actions/admin-participant-import.ts`.
 *
 * Berkas TIDAK diunggah ke server: isinya dibaca di browser lalu dikirim sebagai
 * teks lewat server action. Dengan begitu tidak perlu ada endpoint unggah,
 * penyimpanan sementara, maupun pembersihannya — dan berkas berisi data pribadi
 * peserta tidak pernah mampir ke storage.
 */

const IDLE: ImportActionResult = { status: 'idle' }

const STATUS_STYLE: Record<string, string> = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    duplicate: 'border-slate-200 bg-slate-50 text-slate-600',
    error: 'border-red-200 bg-red-50 text-red-800',
}

const STATUS_BADGE: Record<string, string> = {
    ok: 'bg-emerald-100 text-emerald-800',
    duplicate: 'bg-slate-200 text-slate-700',
    error: 'bg-red-100 text-red-800',
}

function download(fileName: string, content: string) {
    // BOM ditambahkan supaya Excel di Windows membaca aksen dan huruf non-ASCII
    // dengan benar; tanpa itu "é" menjadi "Ã©".
    const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
}

export default function ParticipantImportPanel({ batchId, batchCode }: { batchId: string; batchCode: string }) {
    // Dua action, dua state: masing-masing sudah membawa modenya sendiri,
    // sehingga tidak ada `mode` yang perlu dikirim dari klien.
    const [previewState, previewAction, previewPending] = useActionState(previewParticipantsAction, IDLE)
    const [commitState, commitAction, commitPending] = useActionState(commitParticipantsAction, IDLE)
    const pending = previewPending || commitPending
    const state = commitState.status !== 'idle' ? commitState : previewState
    const [csv, setCsv] = useState('')
    const [fileName, setFileName] = useState('')
    const fileInput = useRef<HTMLInputElement>(null)

    const preview = state.status === 'preview' || state.status === 'imported' ? state.preview : null
    const hasBlockingErrors = Boolean(preview && preview.error > 0)

    const templateCsv = useMemo(
        () => toCsvWithColumns([PARTICIPANT_IMPORT_SAMPLE], PARTICIPANT_IMPORT_COLUMNS),
        [],
    )

    function errorFileCsv(current: ImportPreview) {
        const failed = current.rows.filter((row) => row.status === 'error')
        return toCsvWithColumns(
            failed.map((row) => ({
                line: row.line,
                participant_code: row.participant_code,
                full_name: row.full_name,
                email: row.email,
                phone: row.phone,
                errors: row.errors.join(' | '),
            })),
            ['line', ...PARTICIPANT_IMPORT_COLUMNS, 'errors'],
        )
    }

    async function readFile(file: File) {
        const content = await file.text()
        setCsv(content)
        setFileName(file.name)
    }

    return (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <FileSpreadsheet size={16}/>Impor peserta dari CSV
                    </div>
                    <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">
                        Untuk instansi yang sudah punya daftar peserta final. Peserta yang sudah ada tidak akan digandakan.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => download(`template-peserta-${safeFileName(batchCode)}.csv`, templateCsv)} className={`${adminSecondaryButtonClass} min-h-9 px-3 text-xs`}>
                        <Download size={14}/>Template
                    </button>
                    {preview && preview.error > 0 ? (
                        <button type="button" onClick={() => download(`kesalahan-impor-${safeFileName(batchCode)}.csv`, errorFileCsv(preview))} className={`${adminDangerButtonClass} min-h-9 px-3 text-xs`}>
                            <Download size={14}/>Berkas kesalahan
                        </button>
                    ) : null}
                </div>
            </div>

            <details className="mt-3">
                <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wide text-slate-500 hover:text-slate-600">Kolom yang dikenali</summary>
                <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    {PARTICIPANT_IMPORT_COLUMNS.map((column) => (
                        <div key={column} className="flex gap-2 text-[11px] leading-5">
                            <dt className="font-mono font-bold text-slate-600">{column}</dt>
                            <dd className="font-medium text-slate-500">{PARTICIPANT_IMPORT_COLUMN_LABELS[column]}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500">
                    Pemisah koma maupun titik koma dikenali, begitu juga berkas ekspor Excel dengan BOM.
                    Baris dengan kode/email/HP yang sama tidak akan digandakan.
                </p>
            </details>

            {/*
                DUA form terpisah, bukan satu form dengan `formAction` di tombolnya.

                Riwayat percobaan, supaya tidak diulang:
                  1. satu form + <button name="mode" value="...">  -> klik "Impor
                     sekarang" tetap terkirim sebagai mode preview;
                  2. satu form + hidden `mode` yang diisi lewat DOM di onClick
                     -> sama saja;
                  3. satu form + `formAction={commitAction}` di tombol
                     -> action commit tidak pernah berjalan sama sekali.

                Ketiganya gagal secara SENYAP: tidak ada galat, panel hanya
                menampilkan ulang hasil pemeriksaan, sehingga tampak seperti
                tombolnya rusak. Dua form dengan action masing-masing tidak
                menyisakan apa pun untuk ditebak.
            */}
            <form action={previewAction} className="mt-3 space-y-3">
                <input type="hidden" name="batch_id" value={batchId}/>
                <input type="hidden" name="csv" value={csv}/>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".csv,text/csv,text/plain"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void readFile(file)
                        }}
                    />
                    <button type="button" onClick={() => fileInput.current?.click()} className={adminSecondaryButtonClass}>
                        <Upload size={15}/>Pilih berkas CSV
                    </button>
                    {fileName ? <span className="text-xs font-semibold text-slate-500">{fileName}</span> : null}
                    {csv ? <span className="text-xs font-medium text-slate-500">{csv.split(/\r?\n/).filter((line) => line.trim()).length} baris terbaca</span> : null}
                </div>

                <label className="block space-y-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Atau tempel isi CSV</span>
                    <textarea
                        value={csv}
                        onChange={(event) => { setCsv(event.target.value); setFileName('') }}
                        className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder={'participant_code,full_name,email,phone\n,Andi,andi@contoh.id,081234567890'}
                    />
                </label>

                <button type="submit" disabled={pending || !csv.trim()} className={adminSecondaryButtonClass}>
                    {previewPending ? 'Memeriksa…' : 'Periksa dulu'}
                </button>
            </form>

            <form action={commitAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="batch_id" value={batchId}/>
                <input type="hidden" name="csv" value={csv}/>
                <button type="submit" disabled={pending || !csv.trim() || hasBlockingErrors} className={adminPrimaryButtonClass}>
                    {commitPending ? 'Mengimpor…' : 'Impor sekarang'}
                </button>
                {hasBlockingErrors ? (
                    <span className="text-xs font-semibold text-red-600">
                        Perbaiki {preview?.error} baris bermasalah dulu, atau unduh berkas kesalahan.
                    </span>
                ) : null}
            </form>

            {state.status === 'error' ? (
                <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-800">
                    <AlertTriangle className="mt-0.5 shrink-0" size={16}/>{state.message}
                </div>
            ) : null}

            {preview ? (
                <div className="mt-4 space-y-3">
                    <div role="status" className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold', state.status === 'imported' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-blue-50 text-blue-800')}>
                        <CheckCircle2 className="mt-0.5 shrink-0" size={16}/>
                        <span>
                            {state.status === 'imported'
                                ? `${preview.imported} peserta diimpor. ${preview.duplicate} sudah ada sebelumnya dan dilewati.`
                                : `Pemeriksaan selesai: ${preview.ok} baris siap, ${preview.duplicate} sudah ada, ${preview.error} perlu diperbaiki.`}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                            { label: 'Total baris', value: preview.total, tone: 'text-slate-900' },
                            { label: state.status === 'imported' ? 'Diimpor' : 'Siap', value: state.status === 'imported' ? preview.imported : preview.ok, tone: 'text-emerald-700' },
                            { label: 'Sudah ada', value: preview.duplicate, tone: 'text-slate-500' },
                            { label: 'Perlu diperbaiki', value: preview.error, tone: preview.error > 0 ? 'text-red-600' : 'text-slate-400' },
                        ].map((metric) => (
                            <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</div>
                                <div className={cn('mt-1 text-lg font-black', metric.tone)}>{metric.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">Baris</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Kode</th>
                                    <th className="px-3 py-2">Nama</th>
                                    <th className="px-3 py-2">Kontak</th>
                                    <th className="px-3 py-2">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {preview.rows.map((row) => (
                                    <tr key={`${row.line}-${row.participant_code}`} className={STATUS_STYLE[row.status]}>
                                        <td className="px-3 py-2 font-mono text-xs font-bold">{row.line}</td>
                                        <td className="px-3 py-2">
                                            <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', STATUS_BADGE[row.status])}>
                                                {IMPORT_STATUS_LABELS[row.status]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">{row.participant_code || '—'}</td>
                                        <td className="px-3 py-2 font-semibold">{row.full_name || '—'}</td>
                                        <td className="px-3 py-2 text-xs">{row.email || row.phone || '—'}</td>
                                        <td className="px-3 py-2 text-xs">
                                            {row.errors.length > 0 ? row.errors.join(' · ') : row.status === 'duplicate' ? 'Sudah terdaftar di batch ini' : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
