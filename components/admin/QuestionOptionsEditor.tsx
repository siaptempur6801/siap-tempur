'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { adminInputClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'

 type OptionRow = {
    /**
     * Identitas baris yang stabil dan tidak dapat diedit — dipakai sebagai React key.
     *
     * JANGAN memakai `key` (kode opsi A/B/C) sebagai React key: field itu terikat
     * ke sebuah <input>, sehingga setiap ketikan mengubah key, React me-remount
     * baris, dan input kehilangan fokus. Gejalanya: admin hanya bisa mengetik satu
     * karakter per klik.
     */
    id: string
    key: string
    content: string
    score: string
    isCorrect: boolean
    responseGroup: string
    responseGroupOrder: string
    imageUrl: string
}

export function newRowId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback untuk lingkungan tanpa crypto.randomUUID (mis. jsdom lama).
    return `row-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function defaultRows(): OptionRow[] {
    return ['A', 'B', 'C', 'D'].map((key, index) => ({
        id: newRowId(),
        key,
        content: `Pilihan ${key}`,
        score: '',
        isCorrect: index === 0,
        responseGroup: '',
        responseGroupOrder: '',
        imageUrl: '',
    }))
}

function parseDefaultValue(value?: string): OptionRow[] {
    if (!value?.trim()) return defaultRows()
    const rows = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [key = '', content = '', score = '', correct = '', responseGroup = '', responseGroupOrder = '', imageUrl = ''] = line.split('|')
            return {
                id: newRowId(),
                key,
                content,
                score,
                isCorrect: ['true', '1', 'yes', 'ya'].includes(correct.toLowerCase()),
                responseGroup,
                responseGroupOrder,
                imageUrl,
            }
        })
    return rows.length >= 2 ? rows : defaultRows()
}

function nextKey(rows: OptionRow[]) {
    const used = new Set(rows.map((row) => row.key.toUpperCase()))
    for (let code = 65; code <= 90; code += 1) {
        const key = String.fromCharCode(code)
        if (!used.has(key)) return key
    }
    return String(rows.length + 1)
}

export default function QuestionOptionsEditor({ defaultValue, label = 'Pilihan jawaban' }: { defaultValue?: string; label?: string }) {
    const [rows, setRows] = useState<OptionRow[]>(() => parseDefaultValue(defaultValue))

    const serialized = useMemo(() => rows.map((row) => [
        row.key.trim().toUpperCase(),
        row.content.replace(/\r?\n/g, ' ').replace(/\|/g, '/'),
        row.score.trim(),
        row.isCorrect ? 'true' : 'false',
        row.responseGroup.replace(/\|/g, '/'),
        row.responseGroupOrder.trim(),
        row.imageUrl.replace(/\|/g, '/'),
    ].join('|')).join('\n'), [rows])

    function update(index: number, patch: Partial<OptionRow>) {
        setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
    }

    function addRow() {
        setRows((current) => [...current, {
            id: newRowId(),
            key: nextKey(current),
            content: '',
            score: '',
            isCorrect: false,
            responseGroup: '',
            responseGroupOrder: '',
            imageUrl: '',
        }])
    }

    function removeRow(index: number) {
        setRows((current) => current.length <= 2 ? current : current.filter((_, rowIndex) => rowIndex !== index))
    }

    return (
        <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <legend className="text-sm font-black text-slate-900">{label}</legend>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Isi jawaban secara visual. Field teknis disimpan otomatis di belakang layar.</p>
                </div>
                <button type="button" className={adminSecondaryButtonClass} onClick={addRow}><Plus size={15}/>Tambah opsi</button>
            </div>

            <textarea aria-label="Options serialized payload" name="options" value={serialized} readOnly className="sr-only" />

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-[88px_minmax(0,1fr)_120px_110px_auto] md:items-end">
                            <label className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Kode</span>
                                <input className={adminInputClass} value={row.key} onChange={(event) => update(index, { key: event.target.value.slice(0, 4) })} aria-label={`Kode opsi ${index + 1}`} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Isi opsi {row.key || index + 1}</span>
                                <textarea className={`${adminInputClass} min-h-11 resize-y`} value={row.content} onChange={(event) => update(index, { content: event.target.value })} aria-label={`Isi opsi ${row.key || index + 1}`} required />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Skor</span>
                                <input className={adminInputClass} inputMode="decimal" value={row.score} onChange={(event) => update(index, { score: event.target.value })} aria-label={`Skor opsi ${row.key || index + 1}`} placeholder="Opsional" />
                            </label>
                            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                                <input type="checkbox" checked={row.isCorrect} onChange={(event) => update(index, { isCorrect: event.target.checked })} aria-label={`Jawaban benar ${row.key || index + 1}`} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                                Benar
                            </label>
                            <button type="button" onClick={() => removeRow(index)} disabled={rows.length <= 2} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Hapus opsi ${row.key || index + 1}`}><Trash2 size={16}/></button>
                        </div>

                        <details className="mt-3 border-t border-dashed border-slate-200 pt-3">
                            <summary className="cursor-pointer text-xs font-bold text-slate-500">Pengaturan lanjutan: kategori, urutan, gambar</summary>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <label className="space-y-1"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Response group</span><input className={adminInputClass} value={row.responseGroup} onChange={(event) => update(index, { responseGroup: event.target.value })} aria-label={`Response group ${row.key || index + 1}`} /></label>
                                <label className="space-y-1"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Group order</span><input className={adminInputClass} inputMode="numeric" value={row.responseGroupOrder} onChange={(event) => update(index, { responseGroupOrder: event.target.value })} aria-label={`Group order ${row.key || index + 1}`} /></label>
                                <label className="space-y-1"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Image URL</span><input className={adminInputClass} value={row.imageUrl} onChange={(event) => update(index, { imageUrl: event.target.value })} aria-label={`Image URL ${row.key || index + 1}`} /></label>
                            </div>
                        </details>
                    </div>
                ))}
            </div>
        </fieldset>
    )
}
