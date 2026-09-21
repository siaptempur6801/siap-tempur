'use client'

import { startTransition, useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { saveQuestionBankAction, questionBankWorkflowAction } from '@/app/actions/question-bank'
import { serializeOptionRows, parseQuestionOptions, isHttpsImageUrl } from '@/lib/question-options'
import type { QuestionBankDetail, QuestionBankState } from '@/lib/question-bank'
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { AdminField, adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass, adminDangerButtonClass } from '@/components/admin/AdminUi'

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { loading: () => <p>Memuat pratinjau…</p> })
const text = (v: unknown) => v == null ? '' : String(v)

type Props = {
    detail: QuestionBankDetail; program: string; track: string;
    subjects: { id: string; code: string; name: string }[]; returnFilters: Record<string, string>;
}

export function QuestionBankWorkflow({ question, program, track, returnFilters, canPublish }: {
    question: Record<string, unknown>; program: string; track: string; returnFilters: Record<string, string>; canPublish: boolean;
}) {
    const [state, action, pending] = useActionState(questionBankWorkflowAction, {} as QuestionBankState)
    const { confirm, dialog } = useAdminConfirm()
    const [operation, setOperation] = useState('')
    const status = text(question.status)
    const operations = [
        ...(status === 'approved' && canPublish ? [{ value: 'publish', label: 'Terbitkan soal' }] : []),
        ...(['approved', 'published', 'archived', 'rejected'].includes(status) && (status !== 'published' || canPublish) ? [{ value: 'revise', label: 'Kembalikan ke draf' }] : []),
        ...(status !== 'archived' && (status !== 'published' || canPublish) ? [{ value: 'archive', label: 'Arsipkan soal' }] : []),
    ]
    if (!operations.length) return null
    return <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold">Publikasi membutuhkan persetujuan review. Soal terbit harus kembali ke draf sebelum direvisi.</p>
        <div className="flex flex-wrap gap-2">{operations.map((op) => <button key={op.value} type="button" disabled={pending} className={op.value === 'archive' ? adminDangerButtonClass : adminSecondaryButtonClass} onClick={async (event) => { const dialogEl = event.currentTarget.closest('dialog'); if (dialogEl?.querySelector('[data-pending="true"]')) return; if (dialogEl?.querySelector('[data-dirty="true"]') && !(await confirm({ title: 'Ubah status soal?', message: 'Perubahan isi belum disimpan.', detail: 'Tindakan ini memakai versi soal yang tersimpan di database, bukan isi form yang belum disimpan.', confirmLabel: 'Lanjut ubah status', danger: true }))) return; setOperation(op.value) }}>{op.label}</button>)}</div>
        {operation ? <form onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            startTransition(() => action(form))
        }} className="space-y-3" data-pending={pending || undefined}>
            <input type="hidden" name="operation" value={operation}/><Identity question={question} program={program} track={track}/><ReturnFields filters={returnFilters}/>
            <p className="text-sm">{operation === 'archive' ? 'Soal akan keluar dari pool ujian berikutnya; hasil historis tetap dipertahankan.' : operation === 'revise' ? 'Soal kembali ke draf dan perlu direview lagi sebelum diterbitkan.' : 'Versi yang telah disetujui akan tersedia untuk ujian.'}</p>
            <AdminField label="Alasan tindakan"><input name="changeReason" required maxLength={2000} className={adminInputClass}/></AdminField>
            {state.error ? <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p> : null}
            <button className={adminPrimaryButtonClass} disabled={pending}>{pending ? 'Memproses…' : 'Konfirmasi tindakan'}</button>
            <button type="button" disabled={pending} className={`${adminSecondaryButtonClass} ml-2`} onClick={() => setOperation('')}>Batal</button>
        </form> : null}
        {dialog}
    </div>
}

function ReturnFields({ filters }: { filters: Record<string, string> }) {
    return <>{Object.entries(filters).map(([key, value]) => <input key={key} type="hidden" name={`return_${key}`} value={value}/>)}</>
}
function Identity({ question, program, track }: { question: Record<string, unknown> | null; program: string; track: string }) {
    return <><input type="hidden" name="id" value={text(question?.id)}/><input type="hidden" name="program" value={program}/><input type="hidden" name="track" value={track}/>
        <input type="hidden" name="expectedVersion" value={text(question?.version) || '0'}/><input type="hidden" name="expectedUpdatedAt" value={text(question?.updated_at)}/></>
}

export default function QuestionBankForm({ detail: incomingDetail, subjects, program, track, returnFilters }: Props) {
    // A Server Action also rerenders its RSC tree on failure. Freeze the editor's
    // original snapshot so a concurrent write cannot erase input or silently
    // replace the optimistic concurrency token. Explicit reload opts into new data.
    const [detail] = useState(incomingDetail)
    const q = detail.question
    const [state, action, pending] = useActionState(saveQuestionBankAction, {} as QuestionBankState)
    const router = useRouter()
    const { confirm, dialog } = useAdminConfirm()
    const [dirty, setDirty] = useState(false)
    const [preview, setPreview] = useState(false)
    const [values, setValues] = useState({
        subject: q ? subjects.find((s) => s.id === q.subject_id)?.code ?? '' : subjects[0]?.code ?? '',
        questionType: text(q?.question_type) || 'single_choice', difficulty: text(q?.difficulty) || 'medium', stem: text(q?.stem),
        explanation: detail.explanation, stimulusId: text(q?.stimulus_id), knowledgeNodeId: detail.knowledgeNodeId,
        cognitiveLevel: text(q?.cognitive_level), estimatedSeconds: text(q?.estimated_seconds), sourceReference: text(q?.source_reference),
        changeReason: q ? '' : 'Soal baru',
    })
    const [options, setOptions] = useState(serializeOptionRows(detail.options))
    const subjectId = subjects.find((s) => s.code === values.subject)?.id
    const editable = !q || ['draft', 'revision_required', 'rejected'].includes(text(q.status))
    const reviewHref = `/admin/content/review?${new URLSearchParams({ program, track, ...(q ? { question: text(q.id) } : {}) })}`
    function update(key: keyof typeof values, value: string) {
        setDirty(true)
        setValues((old) => ({ ...old, [key]: value, ...(key === 'subject' ? { stimulusId: '', knowledgeNodeId: '' } : {}) }))
    }
    const labels: Record<keyof typeof values, string> = { subject: 'Mapel / Subtes', questionType: 'Tipe jawaban', difficulty: 'Tingkat kesulitan', stem: 'Pertanyaan', explanation: 'Pembahasan', stimulusId: 'Stimulus', knowledgeNodeId: 'Materi utama', cognitiveLevel: 'Level kognitif', estimatedSeconds: 'Estimasi waktu (detik)', sourceReference: 'Sumber / referensi', changeReason: 'Alasan perubahan' }
    useEffect(() => {
        if (!dirty) return
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirty])
    const input = (key: keyof typeof values) => ({ name: key, 'aria-label': labels[key], value: values[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, e.target.value), id: `qb-${key}` })
    let previewOptions: ReturnType<typeof parseQuestionOptions> = []
    try { previewOptions = parseQuestionOptions(options) } catch { /* Form shows invalid option errors when submitted. */ }
    const stimulus = detail.stimuli.find((s) => s.id === values.stimulusId)
    return <div className="space-y-5">
        {q ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{text(q.question_code)} · Versi {text(q.version)} · {editable ? 'Dapat diedit' : 'Konten terkunci'}</span><Link className={adminSecondaryButtonClass} href={reviewHref} onClick={(event) => { if (!dirty) return; event.preventDefault(); void (async () => { if (await confirm({ title: 'Buka alur review?', message: 'Ada perubahan yang belum disimpan.', detail: 'Perubahan yang belum disimpan akan hilang bila halaman alur review dibuka.', confirmLabel: 'Buka alur review' })) router.push(reviewHref) })() }}>Buka alur review</Link></div> : null}
        {!editable ? <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Konten dikunci selama review dan setelah disetujui. Gunakan alur review atau kembalikan ke draf untuk melakukan perubahan.</p> : null}
        <form onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            startTransition(() => action(form))
        }} data-dirty={dirty || undefined} data-pending={pending || undefined} className="space-y-5">
            <Identity question={q} program={program} track={track}/><ReturnFields filters={returnFilters}/>
            {state.error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{state.error}</p>{state.conflict ? <button type="button" className={`${adminSecondaryButtonClass} mt-2`} onClick={() => { void (async () => { if (await confirm({ title: 'Muat versi terbaru?', message: 'Muat ulang akan mengganti input dengan versi terbaru dari database.', detail: 'Salin perubahan Anda terlebih dahulu; isi form ini akan hilang.', confirmLabel: 'Muat ulang', danger: true })) window.location.reload() })() }}>Muat versi terbaru</button> : null}</div> : null}
            <fieldset disabled={!editable || pending} className="grid min-w-0 gap-4 md:grid-cols-2">
                <legend className="mb-3 font-bold">Isi & klasifikasi soal</legend>
                <AdminField label="Mapel / Subtes" fieldId="qb-subject" error={state.fields?.subject} hint="Mengganti mapel akan melepas stimulus dan pemetaan materi dari mapel sebelumnya."><select {...input('subject')} className={adminInputClass} required><option value="">Pilih mapel</option>{subjects.map((s) => <option key={s.id} value={s.code}>{s.code} · {s.name}</option>)}</select></AdminField>
                <AdminField label="Tipe jawaban" fieldId="qb-questionType" error={state.fields?.questionType}><select {...input('questionType')} className={adminInputClass}><option value="single_choice">Pilihan tunggal</option><option value="multiple_choice">Pilihan majemuk</option><option value="category">Kategori / benar-salah</option></select></AdminField>
                <AdminField label="Tingkat kesulitan" fieldId="qb-difficulty" error={state.fields?.difficulty}><select {...input('difficulty')} className={adminInputClass}><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></AdminField>
                <AdminField label="Materi utama" fieldId="qb-knowledgeNodeId" error={state.fields?.knowledgeNodeId}><select {...input('knowledgeNodeId')} className={adminInputClass}><option value="">Belum dipetakan</option>{detail.knowledgeNodes.filter((n) => n.subject_id === subjectId).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></AdminField>
                <AdminField label="Stimulus" fieldId="qb-stimulusId" error={state.fields?.stimulusId} className="md:col-span-2"><select {...input('stimulusId')} className={adminInputClass}><option value="">Tanpa stimulus</option>{detail.stimuli.filter((s) => s.subject_id === subjectId).map((s) => <option key={s.id} value={s.id}>{s.title || s.content?.slice(0, 100) || s.id}</option>)}</select></AdminField>
                <AdminField label="Pertanyaan" fieldId="qb-stem" error={state.fields?.stem} hint="Rumus dapat ditulis dengan $...$; baris baru dan simbol dipertahankan." className="md:col-span-2"><textarea {...input('stem')} className={`${adminInputClass} min-h-36`} required maxLength={50000}/></AdminField>
                <div className="md:col-span-2" onChange={() => setDirty(true)}><QuestionOptionsEditor defaultValue={detail.question ? serializeOptionRows(detail.options) : undefined} questionType={values.questionType} onChange={setOptions}/>{state.fields?.options ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{state.fields.options}</p> : null}</div>
                <AdminField label="Pembahasan" fieldId="qb-explanation" error={state.fields?.explanation} className="md:col-span-2"><textarea {...input('explanation')} className={`${adminInputClass} min-h-28`} maxLength={50000}/></AdminField>
                <AdminField label="Sumber / referensi" fieldId="qb-sourceReference" error={state.fields?.sourceReference}><input {...input('sourceReference')} className={adminInputClass} maxLength={2000}/></AdminField>
                <AdminField label="Level kognitif" fieldId="qb-cognitiveLevel" error={state.fields?.cognitiveLevel}><input {...input('cognitiveLevel')} className={adminInputClass} maxLength={100} placeholder="Contoh: penalaran"/></AdminField>
                <AdminField label="Estimasi waktu (detik)" fieldId="qb-estimatedSeconds" error={state.fields?.estimatedSeconds}><input {...input('estimatedSeconds')} className={adminInputClass} type="number" min={1} max={86400}/></AdminField>
                <AdminField label="Alasan perubahan" fieldId="qb-changeReason" error={state.fields?.changeReason}><input {...input('changeReason')} className={adminInputClass} required maxLength={2000}/></AdminField>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                {editable ? <button disabled={pending || !subjects.length} className={adminPrimaryButtonClass}>{pending ? 'Menyimpan…' : 'Simpan draf'}</button> : null}
                <button type="button" className={adminSecondaryButtonClass} onClick={() => setPreview(!preview)}>{preview ? 'Tutup pratinjau' : 'Pratinjau soal'}</button>
                <span role="status" className="text-xs text-slate-500">{pending ? 'Tunggu sampai penyimpanan selesai.' : dirty ? 'Ada perubahan yang belum disimpan.' : 'Konten tersimpan tidak diubah sampai Anda menyimpan.'}</span>
            </div>
        </form>
        {preview ? <section aria-label="Pratinjau soal" className="space-y-4 rounded-xl border bg-slate-50 p-4">
            <h3 className="font-bold">Pratinjau soal</h3>
            {stimulus ? <div className="border-b pb-3"><MathRenderer text={stimulus.content || ''}/>{stimulus.image_url ? <MathRenderer text={`[[image:${stimulus.image_url}]]`}/> : null}</div> : null}
            <MathRenderer text={values.stem}/>
            {previewOptions.map((o, i) => <div key={i} className="rounded-lg border bg-white p-3"><b>{o.key}{o.isCorrect ? ' · Jawaban benar' : ''}{o.responseGroup ? ` · ${o.responseGroup}` : ''}</b><MathRenderer text={o.content}/>{o.imageUrl && isHttpsImageUrl(o.imageUrl) ? <MathRenderer text={`[[image:${o.imageUrl}]]`}/> : null}</div>)}
            <h4 className="font-bold">Pembahasan</h4><MathRenderer text={values.explanation || 'Belum diisi.'}/>
        </section> : null}
        {detail.versions.length ? <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Riwayat versi (20 terbaru)</summary><ul className="mt-3 space-y-2 text-sm">{detail.versions.map((v) => <li key={v.version}>Versi {v.version} · {v.change_reason || 'Tanpa catatan'} · {new Date(v.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</li>)}</ul></details> : null}
        {dialog}
    </div>
}
