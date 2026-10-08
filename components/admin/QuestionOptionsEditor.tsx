'use client'
import dynamic from 'next/dynamic'

import { adminInputClass,adminLabelClass,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import QuestionImageButton from '@/components/admin/QuestionImageButton'

import { parseQuestionOptions } from '@/lib/question-options'
import { Plus,Trash2 } from 'lucide-react'
import { useMemo,useState } from 'react'

const QuestionRichTextEditor = dynamic(() => import('@/components/admin/QuestionRichTextEditor'), { loading: () => <div role="status" className="min-h-28 animate-pulse rounded-md bg-muted">Memuat editor…</div> })

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
    isCorrect: boolean | null
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
    return ['A', 'B', 'C', 'D'].map((key) => ({
        id: newRowId(),
        key,
        content: '',
        score: '',
        isCorrect: false,
        responseGroup: '',
        responseGroupOrder: '',
        imageUrl: '',
    }))
}

function parseDefaultValue(value?: string): OptionRow[] {
    if (!value?.trim()) return defaultRows()
    return parseQuestionOptions(value).map((option) => ({
        id: newRowId(), key: option.key, content: option.content, score: option.score == null ? '' : String(option.score),
        isCorrect: option.isCorrect, responseGroup: option.responseGroup ?? '',
        responseGroupOrder: option.responseGroupOrder == null ? '' : String(option.responseGroupOrder), imageUrl: option.imageUrl ?? '',
    }))
}

function nextKey(rows: OptionRow[]) {
    const used = new Set(rows.map((row) => row.key.toUpperCase()))
    for (let code = 65; code <= 90; code += 1) {
        const key = String.fromCharCode(code)
        if (!used.has(key)) return key
    }
    return String(rows.length + 1)
}

/**
 * Isi opsi dengan editor visual ringkas.
 *
 * Rumus dan gambar tampil langsung; nilai disimpan sebagai HTML di dalam JSON
 * `options` (`<input type="hidden" name="options">`), sehingga editor ini tidak
 * merender input tersembunyi sendiri (`hiddenInput={false}`).
 */
function OptionContentField({ row, index, update, editable }: {
    row: OptionRow; index: number; update: (index: number, patch: Partial<OptionRow>) => void; editable: boolean;
}) {
    const suffix = row.key || index + 1
    return (
        <div className="space-y-1">
            <span className={adminLabelClass}>Isi opsi {suffix}</span>
            <QuestionRichTextEditor
                compact
                hiddenInput={false}
                name={`option-content-${suffix}`}
                label={`Isi opsi ${suffix}`}
                defaultValue={row.content}
                onValueChange={(html) => update(index, { content: html })}
                editable={editable}
            />
        </div>
    )
}

/**
 * Field lanjutan per opsi.
 *
 * Untuk tipe `category`, `responseGroup` bukan pengaturan lanjutan — ia wajib,
 * sehingga field-nya dirender langsung di luar `<details>` (`requiredGroup`).
 * Sebelumnya admin harus tahu sendiri bahwa jawabannya tersembunyi di balik
 * "Pengaturan lanjutan", dan validasi baru muncul setelah submit.
 */
function OptionAdvancedFields({ row, index, update, requiredGroup }: {
    row: OptionRow; index: number; update: (index: number, patch: Partial<OptionRow>) => void; requiredGroup: boolean;
}) {
    const suffix = row.key || index + 1
    return (
        <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
                <span className={adminLabelClass}>Response group{requiredGroup ? ' (wajib)' : ''}</span>
                <input className={adminInputClass} value={row.responseGroup} onChange={(event) => update(index, { responseGroup: event.target.value })} aria-label={`Response group ${suffix}`} required={requiredGroup}/>
            </label>
            <label className="space-y-1">
                <span className={adminLabelClass}>Group order</span>
                <input className={adminInputClass} inputMode="numeric" value={row.responseGroupOrder} onChange={(event) => update(index, { responseGroupOrder: event.target.value })} aria-label={`Group order ${suffix}`}/>
            </label>
            <label className="space-y-1">
                <span className={adminLabelClass}>URL gambar (manual)</span>
                <input type="url" className={adminInputClass} value={row.imageUrl} onChange={(event) => update(index, { imageUrl: event.target.value })} aria-label={`Image URL ${suffix}`}/>
            </label>
        </div>
    )
}

export default function QuestionOptionsEditor({ defaultValue, label = 'Pilihan jawaban', onChange, questionType = 'multiple_choice', editable = true }: {
    defaultValue?: string; label?: string; onChange?: (payload: string) => void; questionType?: string; editable?: boolean;
}) {
    const [rows, setRows] = useState<OptionRow[]>(() => parseDefaultValue(defaultValue))
    const isCategory = questionType === 'category'
    const serialized = useMemo(() => JSON.stringify(rows.map(({ id: _id, ...row }) => row)), [rows])
    function changeRows(updater: (rows: OptionRow[]) => OptionRow[]) {
        const next = updater(rows)
        setRows(next)
        onChange?.(JSON.stringify(next.map(({ id: _id, ...row }) => row)))
    }

    function update(index: number, patch: Partial<OptionRow>) {
        changeRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : questionType === 'single_choice' && patch.isCorrect === true ? { ...row, isCorrect: false } : row))
    }

    function addRow() {
        changeRows((current) => [...current, {
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
        changeRows((current) => current.length <= 2 ? current : current.filter((_, rowIndex) => rowIndex !== index))
    }

    return (
        <fieldset className="space-y-3 rounded-lg border border-border bg-muted/60 p-4 lg:col-span-2">
            <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">Isi opsi dan tandai jawaban benar. Simbol, rumus, dan baris baru akan dipertahankan.</p>
                </div>
                <button type="button" className={adminSecondaryButtonClass} onClick={addRow} disabled={rows.length >= 100}><Plus size={15}/>Tambah opsi</button>
            </div>

            {isCategory ? (
                <p role="note" className="rounded-lg border border-info-border bg-info-muted/60 px-3 py-2 text-xs font-semibold leading-5 text-blue-900">
                    Tipe kategori: setiap opsi wajib punya <b>Response group</b>. Minimal dua kelompok; tiap kelompok minimal dua opsi
                    dan tepat satu jawaban benar.
                </p>
            ) : null}

            <input type="hidden" name="options" value={serialized} />

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={row.id} data-option-row={row.key} className="rounded-lg border border-border bg-card p-3 ">
                        <div className="grid gap-3 md:grid-cols-[88px_minmax(0,1fr)_120px_110px_auto] md:items-end">
                            <label className="space-y-1">
                                <span className={adminLabelClass}>Kode</span>
                                <input className={adminInputClass} required maxLength={16} value={row.key} onChange={(event) => update(index, { key: event.target.value.slice(0, 16) })} aria-label={`Kode opsi ${index + 1}`} />
                            </label>
                            <OptionContentField row={row} index={index} update={update} editable={editable}/>
                            <label className="space-y-1">
                                <span className={adminLabelClass}>Skor</span>
                                <input className={adminInputClass} inputMode="decimal" value={row.score} onChange={(event) => update(index, { score: event.target.value })} aria-label={`Skor opsi ${row.key || index + 1}`} placeholder="Opsional" />
                            </label>
                            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm font-medium text-foreground">
                                <input type="checkbox" checked={row.isCorrect === true} onChange={(event) => update(index, { isCorrect: event.target.checked })} aria-label={`Jawaban benar ${row.key || index + 1}`} className="h-4 w-4 rounded border-border text-info" />
                                Benar
                            </label>
                            <div className="flex items-center gap-1.5"><QuestionImageButton compact ariaLabel={`Gambar opsi ${row.key || index + 1}`} value={row.imageUrl || null} onUploaded={(url) => update(index, { imageUrl: url })} onClear={() => update(index, { imageUrl: '' })} testId={`option-${row.key || index + 1}`}/><button type="button" onClick={() => removeRow(index)} disabled={rows.length <= 2} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger-border text-red-500 transition hover:bg-danger-muted disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Hapus opsi ${row.key || index + 1}`}><Trash2 size={16}/></button></div>
                        </div>

                        {isCategory ? (
                            <div className="mt-3 border-t border-dashed border-border pt-3">
                                <OptionAdvancedFields row={row} index={index} update={update} requiredGroup/>
                            </div>
                        ) : (
                            <details className="mt-3 border-t border-dashed border-border pt-3">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Pengaturan lanjutan: kategori, urutan, gambar</summary>
                                <div className="mt-3">
                                    <OptionAdvancedFields row={row} index={index} update={update} requiredGroup={false}/>
                                </div>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        </fieldset>
    )
}
