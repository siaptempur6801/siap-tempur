import { CheckCircle2, ClipboardCheck, Clock3, Send, ShieldCheck, Sparkles, UserCheck, XCircle } from 'lucide-react'
import { AdminBadge, AdminCard, adminButtonClass, adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/server'
import {
    nextStep,
    STATUS_LABEL,
    STATUS_ORDER,
    STAGE_LABEL,
    summarizeBatch,
    type BatchSummary,
} from '@/lib/review-batch'
import {
    prepareReviewBatchAction,
    publishReviewBatchAction,
    reviewReviewBatchStageAction,
} from '@/app/actions/content-review-batch'

/**
 * Panel review MASSAL untuk satu batch soal.
 *
 * Alur review normal hanya menyediakan satu soal per satu form. Untuk batch 80
 * soal (satu set Full Tryout SKD) itu ~1.700 klik. Panel ini memadatkannya jadi
 * tiga langkah yang masing-masing satu klik, memakai RPC massal yang sudah ada
 * di database.
 *
 * Panel ini TIDAK mengambil keputusan apa pun secara otomatis: setiap tombol
 * memanggil RPC resmi yang tetap menegakkan `auth.uid()`, permission, aturan
 * "author != reviewer", dan penjaga workflow. Keputusan approve tetap milik
 * manusia — panel ini hanya menghapus klik yang mekanis.
 */

export const BATCH_CODE = 'cpns-full-tryout-1'

function stepClass(active: boolean) {
    return cn('flex gap-2 rounded-lg px-2 py-1', active ? 'bg-blue-50 text-blue-800' : '')
}

async function loadBatchSummary(batch: string, actorId: string): Promise<BatchSummary> {
    const client = await createClient()
    const { data, error } = await client
        .from('questions')
        .select('status, reviewer_id, author_id')
        .contains('response_config', { pilotBatch: batch })
        .limit(500)

    if (error) throw error
    return summarizeBatch(
        (data ?? []).map((row) => ({
            status: String(row.status ?? ''),
            reviewerId: row.reviewer_id == null ? null : String(row.reviewer_id),
            authorId: row.author_id == null ? null : String(row.author_id),
        })),
        actorId,
    )
}

export default async function ReviewBatchPanel({
    batch = BATCH_CODE,
    program,
    track,
    actorId,
    canReview,
    canPublish,
    className,
}: {
    batch?: string
    program: string
    track: string
    actorId: string
    canReview: boolean
    canPublish: boolean
    className?: string
}) {
    if (!canReview && !canPublish) return null

    let summary: BatchSummary
    try {
        summary = await loadBatchSummary(batch, actorId)
    } catch {
        // Panel ini pelengkap. Bila query gagal (mis. RLS), jangan jatuhkan
        // seluruh halaman review — cukup sembunyikan.
        return null
    }
    if (summary.total === 0) return null

    const context = (
        <>
            <input type="hidden" name="batch" value={batch} />
            <input type="hidden" name="program_code" value={program} />
            <input type="hidden" name="track_code" value={track} />
        </>
    )

    const focus = nextStep(summary)

    return (
        <AdminCard className={cn('overflow-hidden ring-4 ring-blue-50', className)}>
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50/80 to-white p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Sparkles className="text-blue-600" size={18} />
                        <h2 className="text-base font-black text-slate-950">Review massal — batch</h2>
                        <AdminBadge variant="blue">{batch}</AdminBadge>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                        {summary.total} soal dalam satu batch. Tiga langkah di bawah memanggil RPC massal resmi, jadi
                        tidak perlu membuka soal satu per satu. Keputusan review tetap milik Anda: tidak ada yang
                        disetujui atau diterbitkan otomatis.
                    </p>
                </div>
                {summary.isDone ? <AdminBadge variant="green">Batch selesai terbit</AdminBadge> : null}
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="space-y-4">
                    <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Sebaran status</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {STATUS_ORDER.filter((key) => (summary.byStatus[key] ?? 0) > 0).map((key) => (
                                <span key={key} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                    {STATUS_LABEL[key]}
                                    <b className="text-slate-900">{summary.byStatus[key]}</b>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><UserCheck size={13} />Ditugaskan ke saya</div>
                            <div className="mt-1 text-xl font-black text-slate-900">{summary.assignedToMe}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><Clock3 size={13} />Belum ada reviewer</div>
                            <div className="mt-1 text-xl font-black text-slate-900">{summary.unassigned}</div>
                        </div>
                    </div>

                    {summary.selfAssigned > 0 ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-800">
                            {summary.selfAssigned} soal draft masih membawa <code className="font-mono">reviewer_id</code> = author
                            sebagai sisa importer legacy. Nilai itu tidak sah dan dikosongkan otomatis oleh langkah 1 —
                            tidak perlu dibersihkan manual.
                        </p>
                    ) : null}

                    <ol className="space-y-1.5 text-xs font-semibold text-slate-500">
                        <li className={stepClass(focus === 1)}>
                            <span className="font-black">1.</span> Siapkan &amp; klaim — kirim draft ke review, tugaskan diri sendiri sebagai reviewer.
                        </li>
                        <li className={stepClass(focus === 2)}>
                            <span className="font-black">2.</span> Putuskan tahap berjalan{summary.activeStages.length > 1 ? ` (${summary.activeStages.map((stage) => STAGE_LABEL[stage]).join(' + ')})` : summary.activeStage ? ` (${STAGE_LABEL[summary.activeStage]})` : ''} — satu klik per tahap, klaim reviewer otomatis.
                        </li>
                        <li className={stepClass(focus === 3)}>
                            <span className="font-black">3.</span> Terbitkan — hanya soal berstatus approved yang diproses.
                        </li>
                    </ol>
                </div>

                <div className="space-y-4">
                    {canReview ? (
                        <form action={prepareReviewBatchAction} className={cn('rounded-xl border p-4', focus === 1 ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-slate-50')}>
                            {context}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-black text-slate-900">Langkah 1 · Siapkan &amp; klaim</div>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">Aman diulang: soal yang sudah di alur review dilewati.</p>
                                </div>
                                <button className={adminPrimaryButtonClass}><Send size={15} />Siapkan &amp; klaim</button>
                            </div>
                        </form>
                    ) : null}

                    {canReview && summary.activeStage ? (
                        <form action={reviewReviewBatchStageAction} className={cn('rounded-xl border p-4', focus === 2 ? 'border-blue-300 bg-blue-50/60' : 'border-blue-200 bg-blue-50/40')}>
                            {context}
                            <input type="hidden" name="stage" value={summary.activeStage} />
                            <div className="text-sm font-black text-slate-900">
                                {summary.activeStages.length > 1
                                    ? `Langkah 2 · Putuskan tahap aktif (${summary.activeStages.map((stage) => STAGE_LABEL[stage]).join(' + ')})`
                                    : `Langkah 2 · Putuskan tahap ${STAGE_LABEL[summary.activeStage]}`}
                            </div>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                                Berlaku untuk seluruh batch yang ditugaskan kepada Anda. Setiap soal naik SATU tahap, lalu
                                klaim reviewer dikosongkan — panel ini mengklaim ulang otomatis, jadi satu klik per tahap.
                            </p>
                            {summary.activeStages.length > 1 ? (
                                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-800">
                                    Batch tidak seragam: {summary.activeStages.map((stage) => STAGE_LABEL[stage]).join(' dan ')} berjalan
                                    bersamaan. Satu klik memajukan setiap soal satu tahap sesuai posisinya masing-masing — batch akan
                                    menyeragamkan diri setelah beberapa klik.
                                </p>
                            ) : null}
                            <textarea
                                className={`${adminInputClass} mt-3 min-h-20 resize-y`}
                                name="notes"
                                placeholder="Catatan review untuk seluruh batch (opsional)..."
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700" name="decision" value="approve"><CheckCircle2 size={16} />Setujui semua</button>
                                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100" name="decision" value="revision_required"><Clock3 size={16} />Minta revisi</button>
                                <button className={adminButtonClass} name="decision" value="reject"><XCircle size={16} />Tolak</button>
                            </div>
                        </form>
                    ) : null}

                    {canReview && !summary.activeStage && !summary.needsPrepare && !summary.isDone ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-black text-emerald-900"><ClipboardCheck size={16} />Tidak ada tahap review aktif</div>
                            <p className="mt-1 text-xs font-medium text-emerald-800">
                                Seluruh batch sudah lewat tiga tahap review. Lanjut ke langkah 3 bila sudah berstatus approved.
                            </p>
                        </div>
                    ) : null}

                    {canPublish ? (
                        <form action={publishReviewBatchAction} className={cn('rounded-xl border p-4', focus === 3 ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-slate-50')}>
                            {context}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-black text-slate-900">Langkah 3 · Terbitkan</div>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                        {summary.approved > 0 ? `${summary.approved} soal siap terbit.` : 'Belum ada soal approved di batch ini.'}
                                    </p>
                                </div>
                                <button className={adminSecondaryButtonClass} disabled={summary.approved === 0}><ShieldCheck size={15} />Terbitkan batch</button>
                            </div>
                        </form>
                    ) : null}
                </div>
            </div>
        </AdminCard>
    )
}
