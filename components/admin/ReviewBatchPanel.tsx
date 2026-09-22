import Link from 'next/link'
import { ClipboardCheck, Clock3, Send, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'
import { AdminBadge, AdminCard, AdminStatusBadge, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import ReviewBatchStageForm from '@/components/admin/ReviewBatchStageForm'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/server'
import {
    DEFAULT_REVIEW_BATCH_CODE,
    nextStep,
    STATUS_LABEL,
    STATUS_ORDER,
    STAGE_LABEL,
    STAGE_NUMBER,
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

type BatchQuestion = {
    id: string
    code: string
    status: string
}

/**
 * Ringkasan batch + daftar soalnya.
 *
 * Daftar dipakai bagian "Soal di batch ini": reviewer perlu bisa spot-check
 * soal satu per satu sebelum memutuskan puluhan sekaligus.
 */
async function loadBatchSummary(batch: string, actorId: string): Promise<{ summary: BatchSummary; questions: BatchQuestion[] }> {
    const client = await createClient()
    const { data, error } = await client
        .from('questions')
        .select('id, question_code, status, reviewer_id, author_id')
        .contains('response_config', { pilotBatch: batch })
        .limit(500)

    if (error) throw error
    const rows = data ?? []
    return {
        summary: summarizeBatch(
            rows.map((row) => ({
                status: String(row.status ?? ''),
                reviewerId: row.reviewer_id == null ? null : String(row.reviewer_id),
                authorId: row.author_id == null ? null : String(row.author_id),
            })),
            actorId,
        ),
        questions: rows.map((row) => ({
            id: String(row.id),
            code: String(row.question_code ?? ''),
            status: String(row.status ?? ''),
        })),
    }
}

/** Urut sesuai alur review, lalu kode soal, agar daftar tidak melompat-lompat. */
function orderQuestions(questions: BatchQuestion[]) {
    const order = STATUS_ORDER as readonly string[]
    return [...questions].sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)) || a.code.localeCompare(b.code))
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

    let loaded: { summary: BatchSummary; questions: BatchQuestion[] }
    try {
        loaded = await loadBatchSummary(batch, actorId)
    } catch {
        return <AdminCard className="border-red-200 bg-red-50 p-5">
            <h2 className="font-black text-red-900">Review massal tidak dapat dimuat</h2>
            <p className="mt-1 text-sm font-medium text-red-800">Muat ulang halaman. Jika tetap gagal, pastikan akun memiliki permission review konten.</p>
        </AdminCard>
    }
    const { summary, questions } = loaded
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

            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Apa ini?</h3>
                <ul className="mt-2 grid gap-2 text-xs font-medium leading-5 text-slate-600 sm:grid-cols-3 sm:gap-4">
                    <li>
                        <b className="text-slate-900">Jalur cepat satu batch.</b> Tiga langkah, satu klik per tahap —
                        menggantikan alur satu-form-per-soal yang butuh ratusan klik untuk satu set tryout.
                    </li>
                    <li>
                        <b className="text-slate-900">Keputusan tetap milik Anda.</b> Tidak ada status yang ditembus dan
                        tidak ada persetujuan otomatis; Setujui/Revisi/Tolak selalu diklik eksplisit dan tetap lewat
                        aturan resmi (permission, author ≠ reviewer, penjaga workflow).
                    </li>
                    <li>
                        <b className="text-slate-900">Hanya batch ini.</b> Yang tersentuh hanya soal berpenanda batch ini
                        yang ditugaskan kepada Anda; soal lain di antrean tidak ikut berubah.
                    </li>
                </ul>
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
                        <ReviewBatchStageForm
                            action={reviewReviewBatchStageAction}
                            batch={batch}
                            program={program}
                            track={track}
                            stage={summary.activeStage}
                            stageNumber={STAGE_NUMBER[summary.activeStage]}
                            activeCount={active}
                            activeStages={summary.activeStages}
                            highlight={focus === 2}
                        />
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
                                <button className={adminSecondaryButtonClass} disabled={summary.approved === 0}><ShieldCheck size={15} />Terbitkan {summary.approved} soal</button>
                            </div>
                        </form>
                    ) : null}
                </div>
            </div>

            <div id="review-batch-questions" className="border-t border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900">
                        Soal di batch ini <span className="font-bold text-slate-500">({questions.length})</span>
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                        Spot-check satu per satu dulu bila perlu — keputusan massal tidak menghalangi pemeriksaan.
                    </p>
                </div>
                <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {orderQuestions(questions).map((question) => (
                        <div key={question.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <span className="min-w-0 truncate font-mono text-xs font-bold text-slate-700">{question.code || question.id.slice(0, 8)}</span>
                            <span className="flex items-center gap-2">
                                <AdminStatusBadge status={question.status} />
                                <Link
                                    className="text-xs font-bold text-blue-700 hover:underline"
                                    href={`/admin/content/review?${new URLSearchParams({ program, track, question: question.id }).toString()}`}
                                >
                                    Periksa
                                </Link>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </AdminCard>
    )
}
