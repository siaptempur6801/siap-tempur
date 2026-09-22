'use client'

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Check, Eye, FileText, ListChecks, Save, Settings2 } from 'lucide-react'
import { saveQuestionBankAction, questionBankWorkflowAction } from '@/app/actions/question-bank'
import { serializeOptionRows, parseQuestionOptions, isHttpsImageUrl } from '@/lib/question-options'
import type { QuestionBankDetail, QuestionBankState } from '@/lib/question-bank'
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor'
import QuestionRichTextField from '@/components/admin/QuestionRichTextField'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { AdminField, adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass, adminDangerButtonClass } from '@/components/admin/AdminUi'

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { loading: () => <p>Memuat pratinjau…</p> })
const text = (v: unknown) => v == null ? '' : String(v)

function EditorSection({ id, step, title, description, children }: {
    id: string; step: number; title: string; description: string; children: ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white" aria-hidden="true">{step}</span>
                <div>
                    <h3 className="font-black text-slate-950">{title}</h3>
                    <p className="mt-0.5 text-sm font-medium leading-5 text-slate-500">{description}</p>
                </div>
            </div>
            {children}
        </section>
    )
}

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
    const formRef = useRef<HTMLFormElement>(null)
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
    function submitDraft() {
        const form = formRef.current
        if (!form || !form.reportValidity()) return
        startTransition(() => action(new FormData(form)))
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
    const filledOptions = previewOptions.filter((option) => option.content.trim()).length
    const hasCorrectAnswer = previewOptions.some((option) => option.isCorrect === true)
    const readyChecks = [Boolean(values.subject), Boolean(values.stem.trim()), filledOptions >= 2, hasCorrectAnswer]
    const readyCount = readyChecks.filter(Boolean).length
    return <div className="space-y-5">
        {q ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{text(q.question_code)} · Versi {text(q.version)} · {editable ? 'Dapat diedit' : 'Konten terkunci'}</span><Link className={adminSecondaryButtonClass} href={reviewHref} onClick={(event) => { if (!dirty) return; event.preventDefault(); void (async () => { if (await confirm({ title: 'Buka alur review?', message: 'Ada perubahan yang belum disimpan.', detail: 'Perubahan yang belum disimpan akan hilang bila halaman alur review dibuka.', confirmLabel: 'Buka alur review' })) router.push(reviewHref) })() }}>Buka alur review</Link></div> : null}
        {!editable ? <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Konten dikunci selama review dan setelah disetujui. Gunakan alur review atau kembalikan ke draf untuk melakukan perubahan.</p> : null}
        <form ref={formRef} onSubmit={(event) => {
            event.preventDefault()
            submitDraft()
        }} data-dirty={dirty || undefined} data-pending={pending || undefined} className="space-y-5">
            <Identity question={q} program={program} track={track}/><ReturnFields filters={returnFilters}/>
            {state.error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{state.error}</p>{state.conflict ? <button type="button" className={`${adminSecondaryButtonClass} mt-2`} onClick={() => { void (async () => { if (await confirm({ title: 'Muat versi terbaru?', message: 'Muat ulang akan mengganti input dengan versi terbaru dari database.', detail: 'Salin perubahan Anda terlebih dahulu; isi form ini akan hilang.', confirmLabel: 'Muat ulang', danger: true })) window.location.reload() })() }}>Muat versi terbaru</button> : null}</div> : null}
            <nav aria-label="Bagian form soal" className="grid gap-2 sm:grid-cols-3">
                {[
                    { href: '#qb-step-context', icon: Settings2, label: '1. Konteks' },
                    { href: '#qb-step-content', icon: FileText, label: '2. Isi & jawaban' },
                    { href: '#qb-step-complete', icon: ListChecks, label: '3. Kelengkapan' },
                ].map(({ href, icon: Icon, label }) => <a key={href} href={href} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"><Icon size={16} aria-hidden="true"/>{label}</a>)}
            </nav>
            <fieldset disabled={!editable || pending} className="min-w-0 space-y-4">
                <legend className="sr-only">Isi dan klasifikasi soal</legend>
                <EditorSection id="qb-step-context" step={1} title="Tentukan konteks" description="Pilih mapel, tipe jawaban, tingkat kesulitan, dan stimulus sebelum menulis soal.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Mapel / Subtes" fieldId="qb-subject" error={state.fields?.subject} hint="Mengganti mapel akan melepas stimulus dan pemetaan materi dari mapel sebelumnya."><select {...input('subject')} className={adminInputClass} required><option value="">Pilih mapel</option>{subjects.map((s) => <option key={s.id} value={s.code}>{s.code} · {s.name}</option>)}</select></AdminField>
                        <AdminField label="Tipe jawaban" fieldId="qb-questionType" error={state.fields?.questionType}><select {...input('questionType')} className={adminInputClass}><option value="single_choice">Pilihan tunggal</option><option value="multiple_choice">Pilihan majemuk</option><option value="category">Kategori / benar-salah</option></select></AdminField>
                        <AdminField label="Tingkat kesulitan" fieldId="qb-difficulty" error={state.fields?.difficulty}><select {...input('difficulty')} className={adminInputClass}><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></AdminField>
                        <AdminField label="Stimulus" fieldId="qb-stimulusId" error={state.fields?.stimulusId}><select {...input('stimulusId')} className={adminInputClass}><option value="">Tanpa stimulus</option>{detail.stimuli.filter((s) => s.subject_id === subjectId).map((s) => <option key={s.id} value={s.id}>{s.title || s.content?.slice(0, 100) || s.id}</option>)}</select></AdminField>
                    </div>
                </EditorSection>
                <EditorSection id="qb-step-content" step={2} title="Tulis soal dan jawaban" description="Tulis pertanyaan, lengkapi pilihan, lalu tandai jawaban yang benar.">
                    <div className="grid gap-4">
                        <QuestionRichTextField name="stem" label="Pertanyaan" fieldId="qb-stem" error={state.fields?.stem} hint="Rumus dapat ditulis dengan $...$; gambar disisipkan lewat tombol. Baris baru dan simbol dipertahankan." value={values.stem} onValueChange={(value) => update('stem', value)} required minHeight="min-h-36"/>
                        <div onChange={() => setDirty(true)}><QuestionOptionsEditor defaultValue={detail.question ? serializeOptionRows(detail.options) : undefined} questionType={values.questionType} onChange={setOptions}/>{state.fields?.options ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{state.fields.options}</p> : null}</div>
                        <QuestionRichTextField name="explanation" label="Pembahasan" fieldId="qb-explanation" error={state.fields?.explanation} hint="Jelaskan alasan jawaban benar agar soal siap dipelajari peserta." value={values.explanation} onValueChange={(value) => update('explanation', value)} minHeight="min-h-28"/>
                    </div>
                </EditorSection>
                <EditorSection id="qb-step-complete" step={3} title="Lengkapi metadata" description="Tambahkan pemetaan dan catatan perubahan agar soal mudah dilacak.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Materi utama" fieldId="qb-knowledgeNodeId" error={state.fields?.knowledgeNodeId}><select {...input('knowledgeNodeId')} className={adminInputClass}><option value="">Belum dipetakan</option>{detail.knowledgeNodes.filter((n) => n.subject_id === subjectId).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></AdminField>
                        <AdminField label="Sumber / referensi" fieldId="qb-sourceReference" error={state.fields?.sourceReference}><input {...input('sourceReference')} className={adminInputClass} maxLength={2000}/></AdminField>
                        <AdminField label="Level kognitif" fieldId="qb-cognitiveLevel" error={state.fields?.cognitiveLevel}><input {...input('cognitiveLevel')} className={adminInputClass} maxLength={100} placeholder="Contoh: penalaran"/></AdminField>
                        <AdminField label="Estimasi waktu (detik)" fieldId="qb-estimatedSeconds" error={state.fields?.estimatedSeconds}><input {...input('estimatedSeconds')} className={adminInputClass} type="number" min={1} max={86400}/></AdminField>
                        <AdminField label="Alasan perubahan" fieldId="qb-changeReason" error={state.fields?.changeReason} hint="Wajib diisi agar riwayat versi mudah dipahami." className="md:col-span-2"><input {...input('changeReason')} className={adminInputClass} required maxLength={2000}/></AdminField>
                    </div>
                </EditorSection>
            </fieldset>
            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${readyCount === readyChecks.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{readyCount === readyChecks.length ? <Check size={17}/> : `${readyCount}/${readyChecks.length}`}</span>
                    <span role="status">{pending ? 'Menyimpan perubahan…' : dirty ? 'Perubahan belum disimpan' : 'Semua perubahan tersimpan'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={adminSecondaryButtonClass} onClick={() => setPreview(!preview)}><Eye size={16}/>{preview ? 'Tutup pratinjau' : 'Pratinjau'}</button>
                    {editable ? <button type="button" onClick={submitDraft} disabled={pending || !subjects.length} className={adminPrimaryButtonClass}><Save size={16}/>{pending ? 'Menyimpan…' : 'Simpan draf'}</button> : null}
                </div>
            </div>
        </form>
        {preview ? <section aria-label="Pratinjau soal" className="scroll-mt-24 space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5">
            <div><p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">Pratinjau peserta</p><h3 className="mt-1 font-black text-slate-950">Periksa tampilan sebelum disimpan</h3></div>
            {stimulus ? <div className="border-b pb-3"><MathRenderer text={stimulus.content || ''}/>{stimulus.image_url ? <MathRenderer text={`[[image:${stimulus.image_url}]]`}/> : null}</div> : null}
            <MathRenderer text={values.stem}/>
            {previewOptions.map((o, i) => <div key={i} className="rounded-lg border bg-white p-3"><b>{o.key}{o.isCorrect ? ' · Jawaban benar' : ''}{o.responseGroup ? ` · ${o.responseGroup}` : ''}</b><MathRenderer text={o.content}/>{o.imageUrl && isHttpsImageUrl(o.imageUrl) ? <MathRenderer text={`[[image:${o.imageUrl}]]`}/> : null}</div>)}
            <h4 className="font-bold">Pembahasan</h4><MathRenderer text={values.explanation || 'Belum diisi.'}/>
        </section> : null}
        {detail.versions.length ? <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Riwayat versi (20 terbaru)</summary><ul className="mt-3 space-y-2 text-sm">{detail.versions.map((v) => <li key={v.version}>Versi {v.version} · {v.change_reason || 'Tanpa catatan'} · {new Date(v.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</li>)}</ul></details> : null}
        {dialog}
    </div>
}
