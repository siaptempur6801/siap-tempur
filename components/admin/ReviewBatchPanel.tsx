import { CheckCircle2, ClipboardCheck, Clock3, Send, ShieldCheck, Sparkles, UserCheck, XCircle } from 'lucide-react'
import { AdminBadge, AdminCard, adminDangerButtonClass, adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass, adminSuccessButtonClass, adminWarningButtonClass } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/server'
import {
    DEFAULT_REVIEW_BATCH_CODE,
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
    batch = DEFAULT_REVIEW_BATCH_CODE,
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
    if (!canReview && !canPublish) return <AdminCard className="border-amber-200 bg-amber-50 p-5">
        <h2 className="font-black text-amber-900">Akun belum dapat menjalankan review massal</h2>
        <p className="mt-1 text-sm font-medium text-amber-800">Minta peran Reviewer Konten atau permission publish kepada administrator.</p>
    </AdminCard>

    let summary: BatchSummary
    try {
        summary = await loadBatchSummary(batch, actorId)
    } catch {
        return <AdminCard className="border-red-200 bg-red-50 p-5">
            <h2 className="font-black text-red-900">Review massal tidak dapat dimuat</h2>
            <p className="mt-1 text-sm font-medium text-red-800">Muat ulang halaman. Jika tetap gagal, pastikan akun memiliki permission review konten.</p>
        </AdminCard>
    }
    if (summary.total === 0) return <AdminCard className="border-amber-200 bg-amber-50 p-5">
        <h2 className="font-black text-amber-900">Belum ada soal dalam batch</h2>
        <p className="mt-1 text-sm font-medium text-amber-800">Batch {batch} belum berisi soal yang disiapkan untuk review massal.</p>
    </AdminCard>

    const preparable = (summary.byStatus.draft ?? 0) + (summary.byStatus.revision_required ?? 0)
    const active = (summary.byStatus.submitted ?? 0)
        + (summary.byStatus.editorial_review ?? 0)
        + (summary.byStatus.academic_review ?? 0)
        + (summary.byStatus.technical_qa ?? 0)

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
                        <AdminBadge>CPNS / SKD · TIU 35 + TKP 45</AdminBadge>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                        {summary.total} soal telah dipilih khusus untuk satu Full Tryout. Kerjakan tombol yang disorot,
                        lalu lanjutkan sampai tahap terbit. Setiap keputusan hanya memproses status yang sedang aktif.
                    </p>
                </div>
                {summary.isDone ? <AdminBadge variant="green">Batch selesai terbit</AdminBadge> : null}
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="space-y-4">
                    <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Sebaran status</div>
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
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-500"><UserCheck size={13} />Ditugaskan ke saya</div>
                            <div className="mt-1 text-xl font-black text-slate-900">{summary.assignedToMe}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-500"><Clock3 size={13} />Belum ada reviewer</div>
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
                                    <h3 className="text-sm font-black text-slate-900">Langkah 1 · Siapkan &amp; klaim</h3>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">{preparable > 0 ? `${preparable} soal akan dikirim ke Editorial dan ditugaskan kepada Anda.` : 'Selesai. Tidak ada draft yang perlu disiapkan lagi.'}</p>
                                </div>
                                <button className={adminPrimaryButtonClass} disabled={!summary.needsPrepare}><Send size={15} />{preparable > 0 ? `Siapkan ${preparable} soal` : 'Sudah disiapkan'}</button>
                            </div>
                        </form>
                    ) : null}

                    {canReview && summary.activeStage ? (
                        <form action={reviewReviewBatchStageAction} className={cn('rounded-xl border p-4', focus === 2 ? 'border-blue-300 bg-blue-50/60' : 'border-blue-200 bg-blue-50/40')}>
                            {context}
                            <input type="hidden" name="stage" value={summary.activeStage} />
                            <h3 className="text-sm font-black text-slate-900">
                                {summary.activeStages.length > 1
                                    ? `Langkah 2 · Putuskan tahap aktif (${summary.activeStages.map((stage) => STAGE_LABEL[stage]).join(' + ')})`
                                    : `Langkah 2 · Putuskan tahap ${STAGE_LABEL[summary.activeStage]}`}
                            </h3>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                                Berlaku untuk {active} soal pada tahap aktif. Setiap soal naik SATU tahap, lalu
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
                                <button className={adminSuccessButtonClass} name="decision" value="approve"><CheckCircle2 size={16} />Setujui {active} soal</button>
                                <button className={adminWarningButtonClass} name="decision" value="revision_required"><Clock3 size={16} />Revisi {active} soal</button>
                                <button className={adminDangerButtonClass} name="decision" value="reject"><XCircle size={16} />Tolak {active} soal</button>
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
                                    <h3 className="text-sm font-black text-slate-900">Langkah 3 · Terbitkan</h3>
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
