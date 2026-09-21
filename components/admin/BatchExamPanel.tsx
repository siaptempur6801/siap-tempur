'use client'

import { useActionState, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime, formatLocalDateTimeInput } from '@/lib/admin-format'
import { adminInputClass, adminPrimaryButtonClass } from '@/components/admin/AdminUi'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import {
    durationMinutes,
    templateComposition,
    templateShortages,
    type AssignmentRow,
    type OrgTemplate,
} from '@/lib/organization-exam'
import {
    composeExamAction,
    deleteComposedExamAction,
    saveAssignmentAction,
    type ComposeActionResult,
} from '@/app/actions/admin-organization-exam'

/**
 * Panel ujian untuk satu batch (PRD §6.4, §7.3, §7.4).
 *
 * Client component karena komposisi exam mengembalikan DAFTAR KEKURANGAN soal
 * per subjek yang harus dibaca dan ditindaklanjuti — bukan pesan flash sekali
 * tampil. Lihat catatan di `app/actions/admin-organization-exam.ts`.
 *
 * Alur yang didukung, mengikuti §10.1 langkah 4–5:
 *   1. pilih template,
 *   2. bentuk exam (30 TWK + 35 TIU + 45 TKP),
 *   3. jadwalkan assignment untuk batch ini.
 */

const IDLE: ComposeActionResult = { status: 'idle' }

export default function BatchExamPanel({
    batchId,
    organizationId,
    templates,
    available,
    assignments,
}: {
    batchId: string
    organizationId: string
    templates: OrgTemplate[]
    available: Record<string, number>
    assignments: AssignmentRow[]
}) {
    const [composeState, composeAction, composing] = useActionState(composeExamAction, IDLE)
    const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null

    /** Kekurangan dihitung di klien HANYA untuk pratinjau; server tetap memutuskan. */
    const previewShortages = selectedTemplate ? templateShortages(selectedTemplate, available) : []

    const hiddenContext = (
        <>
            <input type="hidden" name="batch_id" value={batchId}/>
            <input type="hidden" name="org" value={organizationId}/>
        </>
    )

    return (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <ClipboardList size={16}/>Ujian batch ini
            </h3>

            {templates.length === 0 ? (
                <p className="text-xs font-medium leading-5 text-slate-500">
                    Belum ada template ujian. Buat template terlebih dahulu di bagian Template ujian di atas.
                </p>
            ) : (
                <>
                    {/* ------------------------------------------- bentuk exam */}
                    <form action={composeAction} className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 lg:grid-cols-3">
                        {hiddenContext}
                        <input type="hidden" name="template_name" value={selectedTemplate?.name ?? ''}/>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Template</span>
                            <select
                                className={adminInputClass}
                                name="template_id"
                                value={selectedTemplateId}
                                onChange={(event) => setSelectedTemplateId(event.target.value)}
                                aria-label="Template ujian"
                            >
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name} — {templateComposition(template)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Judul ujian</span>
                            <input
                                className={adminInputClass}
                                name="title"
                                placeholder={selectedTemplate?.name ?? 'Ujian Instansi'}
                            />
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Status exam</span>
                            <select className={adminInputClass} name="exam_status" defaultValue="draft" aria-label="Status exam">
                                <option value="draft">Draft</option>
                                <option value="active">Aktif</option>
                            </select>
                        </label>

                        {selectedTemplate ? (
                            <div className="lg:col-span-3">
                                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                                    <span className="rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">{templateComposition(selectedTemplate)}</span>
                                    <span className="rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">{durationMinutes(selectedTemplate.duration_seconds)} menit</span>
                                    <span className="rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                                        {selectedTemplate.randomize_questions ? 'Soal diacak' : 'Soal berurutan'}
                                    </span>
                                    <span className={cn('rounded-md px-2 py-1 ring-1', previewShortages.length === 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200')}>
                                        {previewShortages.length === 0 ? 'Soal cukup' : 'Soal belum cukup'}
                                    </span>
                                </div>
                            </div>
                        ) : null}

                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Buka (WIB)</span>
                            <input className={adminInputClass} type="datetime-local" name="starts_at"/>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Tutup (WIB)</span>
                            <input className={adminInputClass} type="datetime-local" name="due_at"/>
                        </label>
                        <label className="flex items-center gap-2 pt-6">
                            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-slate-300"/>
                            <span className="text-sm font-bold text-slate-700">Langsung aktifkan</span>
                        </label>

                        <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
                            <button disabled={composing} className={adminPrimaryButtonClass}>
                                <Sparkles size={15}/>{composing ? 'Membentuk…' : 'Bentuk & jadwalkan'}
                            </button>
                            <span className="text-[11px] font-medium text-slate-500">
                                Membentuk exam baru dari template lalu menjadwalkannya untuk batch ini. Soal diambil dari yang sudah <b>terbit</b>, jumlahnya persis seperti template.
                            </span>
                        </div>
                    </form>

                    {/* ---------------------------------------- hasil komposisi */}
                    {composeState.status === 'error' ? (
                        <div role="status" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-800">
                            <AlertTriangle className="mt-0.5 shrink-0" size={16}/>{composeState.message}
                        </div>
                    ) : null}

                    {composeState.status === 'shortages' ? (
                        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={17}/>
                                <div className="min-w-0">
                                    <div className="text-sm font-black text-amber-900">Soal terbit belum cukup untuk template ini</div>
                                    <p className="mt-1 text-xs font-medium leading-5 text-amber-800">
                                        Exam <b>tidak</b> dibentuk, jadi tidak ada ujian setengah jadi yang tertinggal. Lengkapi soal berikut lalu coba lagi.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full min-w-[420px] text-left text-xs">
                                    <thead className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                                        <tr><th className="py-1.5">Subjek</th><th className="py-1.5 text-right">Butuh</th><th className="py-1.5 text-right">Tersedia</th><th className="py-1.5 text-right">Kurang</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-200">
                                        {composeState.shortages.map((row) => (
                                            <tr key={row.subject}>
                                                <td className="py-1.5 font-bold text-amber-900">{row.subject}</td>
                                                <td className="py-1.5 text-right font-semibold text-amber-800">{row.required}</td>
                                                <td className="py-1.5 text-right font-semibold text-amber-800">{row.available}</td>
                                                <td className="py-1.5 text-right font-black text-red-700">{row.missing}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}

                    {composeState.status === 'composed' ? (
                        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800">
                            <CheckCircle2 className="mt-0.5 shrink-0" size={16}/>
                            Exam “{composeState.title}” terbentuk dengan {composeState.totalQuestions} soal
                            {composeState.scheduled ? ' dan sudah dijadwalkan untuk batch ini.' : '.'}
                        </div>
                    ) : null}
                </>
            )}

            {/* ------------------------------------------------ daftar ujian */}
            <div className="border-t border-slate-200 pt-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Ujian terjadwal ({assignments.length})</div>
                {assignments.length === 0 ? (
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                        Belum ada ujian untuk batch ini. Bentuk exam dari template di atas, lalu isi jadwalnya.
                    </p>
                ) : (
                    <div className="mt-2 space-y-2">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-black text-slate-900">{assignment.exam_title || 'Tanpa judul'}</span>
                                            <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', assignment.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600')}>
                                                {assignment.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                                            <span>{assignment.question_count} soal</span>
                                            <span>{assignment.attempt_count} pengerjaan</span>
                                            <span className="inline-flex items-center gap-1"><CalendarClock size={11}/>{formatDateTime(assignment.starts_at)} — {formatDateTime(assignment.due_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <form action={saveAssignmentAction}>
                                            {hiddenContext}
                                            <input type="hidden" name="assignment_id" value={assignment.id}/>
                                            <input type="hidden" name="exam_id" value={assignment.exam_id}/>
                                            <input type="hidden" name="template_id" value={assignment.template_id ?? ''}/>
                                            <input type="hidden" name="starts_at" value={formatLocalDateTimeInput(assignment.starts_at)}/>
                                            <input type="hidden" name="due_at" value={formatLocalDateTimeInput(assignment.due_at)}/>
                                            <input type="hidden" name="is_active" value={assignment.is_active ? 'on' : ''}/>
                                            <input type="hidden" name="notes" value={assignment.notes ?? ''}/>
                                            <button className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700">
                                                {assignment.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            </button>
                                        </form>
                                        {/* Exam salah bentuk harus bisa dibuang. Hanya ditawarkan
                                            bila belum ada yang mengerjakan — database tetap
                                            menolaknya walau tombolnya dipaksa. */}
                                        {assignment.attempt_count === 0 ? (
                                            <form action={deleteComposedExamAction}>
                                                {hiddenContext}
                                                <input type="hidden" name="exam_id" value={assignment.exam_id}/>
                                                <input type="hidden" name="exam_title" value={assignment.exam_title ?? ''}/>
                                                <ConfirmSubmit
                                                    title="Hapus exam?"
                                                    message={`Exam “${assignment.exam_title || 'tanpa judul'}” akan dihapus permanen dari batch ini.`}
                                                    detail="Ujian, jadwalnya, dan assignment peserta ikut terhapus. Tindakan ini tidak dapat dibatalkan."
                                                    confirmLabel="Hapus exam"
                                                    trigger={<button type="button" className="text-[11px] font-extrabold text-red-600 hover:text-red-700">Hapus exam</button>}
                                                />
                                            </form>
                                        ) : null}
                                    </div>
                                </div>

                                <form action={saveAssignmentAction} className="mt-3 grid gap-2 border-t border-slate-200 pt-3 lg:grid-cols-4">
                                    {hiddenContext}
                                    <input type="hidden" name="assignment_id" value={assignment.id}/>
                                    {/* exam_id sebagai hidden, BUKAN <select> satu opsi: dua field
                                        bernama sama membuat FormData ambigu — kelas bug yang sudah
                                        dua kali menggigit di modul ini. */}
                                    <input type="hidden" name="exam_id" value={assignment.exam_id}/>
                                    <input type="hidden" name="template_id" value={assignment.template_id ?? ''}/>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Buka (WIB)</span>
                                        <input className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" type="datetime-local" name="starts_at" defaultValue={formatLocalDateTimeInput(assignment.starts_at)}/>
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Tutup (WIB)</span>
                                        <input className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" type="datetime-local" name="due_at" defaultValue={formatLocalDateTimeInput(assignment.due_at)}/>
                                    </label>
                                    <div className="flex items-end gap-2">
                                        <label className="flex items-center gap-1.5">
                                            <input type="checkbox" name="is_active" defaultChecked={assignment.is_active} className="h-3.5 w-3.5 rounded border-slate-300"/>
                                            <span className="text-[11px] font-bold text-slate-600">Aktif</span>
                                        </label>
                                        <button className="inline-flex min-h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50">Simpan jadwal</button>
                                    </div>
                                </form>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
