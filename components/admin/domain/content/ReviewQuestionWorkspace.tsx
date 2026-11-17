import {
  assignContentReviewerAction,
  publishContentQuestionAction,
  submitContentQuestionAction,
  saveContentDraftAction,
} from '@/app/actions/content-review'
import MathRenderer from '@/components/MathRenderer'
import {
  AdminBadge,
  AdminCard,
  AdminField,
  AdminSectionHeading,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import QuestionRichTextEditor from '@/components/admin/QuestionRichTextEditor'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import ReviewDraftDisclosure from '@/components/admin/ReviewDraftDisclosure'
import ReviewDecisionForm from '@/components/admin/ReviewDecisionForm'
import ReviewDraftForm from '@/components/admin/ReviewDraftForm'
import ReviewQuestionFields from '@/components/admin/ReviewQuestionFields'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import {
  adminAuditLabel,
  adminQuestionTypeLabel,
  adminStatusLabel,
  adminStatusVariant,
  formatDateTime,
} from '@/lib/admin-format'
import { serializeOptionRows } from '@/lib/question-options'
import { cn } from '@/lib/utils'
import type { contentReviewService } from '@/src/services/content-review.service'
import { ArrowLeft, Send, ShieldCheck, UserCheck } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import {
  HiddenContext,
  n,
  OptionPreview,
  profileName,
  ReviewProgress,
  s,
  stageLabel,
  workspaceHref,
} from './ReviewWorkspace.shared'
import type { ReviewWorkspaceRow, ReviewWorkspaceSearchParams } from './ReviewWorkspace.shared'

type WorkspaceData = Awaited<ReturnType<typeof contentReviewService.getWorkspaceData>>

type ReviewQuestionWorkspaceProps = {
  data: WorkspaceData
  selected: ReviewWorkspaceRow | null
  params: ReviewWorkspaceSearchParams
  program: string
  track: string
  placeholder: boolean
  author: unknown
  assignedReviewer: unknown
  pendingReview: ReviewWorkspaceRow | null
  currentActorIsAuthor: boolean
  canEdit: boolean
  canSubmit: boolean
  canAssignOthers: boolean
  canClaim: boolean
  canReview: boolean
  canPublish: boolean
  nextActionCopy: string
  primaryNode?: ReviewWorkspaceRow
  answerMismatch: { marked: string; stated: string } | null
  authorization: { userId: string }
  batchContext: boolean
}

export default function ReviewQuestionWorkspace({
  data,
  selected,
  params,
  program,
  track,
  placeholder,
  author,
  assignedReviewer,
  pendingReview,
  currentActorIsAuthor,
  canEdit,
  canSubmit,
  canAssignOthers,
  canClaim,
  canReview,
  canPublish,
  nextActionCopy,
  primaryNode,
  answerMismatch,
  authorization,
  batchContext,
}: ReviewQuestionWorkspaceProps) {
  return (
    <section
      data-review-layout={selected ? '' : undefined}
      className={cn(
        'min-w-0',
        selected
          ? 'grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]'
          : 'space-y-5',
      )}
    >
      {selected ? (
        <div className="flex w-full flex-wrap items-center justify-between gap-3 xl:col-span-2">
          <Link
            href={workspaceHref({ ...params, program, track }, { question: undefined })}
            className={adminSecondaryButtonClass}
          >
            <ArrowLeft size={16} />
            {batchContext ? 'Kembali ke review massal' : 'Kembali ke antrean'}
          </Link>
          <a
            href="#review-actions"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-info hover:underline xl:hidden"
          >
            {canReview
              ? 'Keputusan review'
              : canSubmit
                ? 'Ajukan review'
                : canPublish
                  ? 'Publikasi'
                  : 'Tindakan berikutnya'}
          </a>
        </div>
      ) : null}
      {selected ? (
        <>
          <AdminCard className="p-5 xl:col-span-2">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-info">
                    {s(data.subjectById.get(s(selected.subject_id))?.code)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {adminQuestionTypeLabel(selected.question_type)} · v{n(selected.version)}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {s(selected.question_code) || 'Soal tanpa kode'}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
                  <span>
                    Penulis: <b className="text-foreground">{profileName(author)}</b>
                  </span>
                  {Boolean(selected.current_stage) ? (
                    <span>
                      Reviewer:{' '}
                      <b className="text-foreground">
                        {pendingReview?.reviewer_id
                          ? profileName(assignedReviewer)
                          : 'Belum ditugaskan'}
                      </b>
                    </span>
                  ) : null}
                  <span>Diperbarui: {formatDateTime(selected.updated_at)}</span>
                </div>
              </div>
              {placeholder ? (
                <AdminBadge variant="orange">Placeholder riwayat</AdminBadge>
              ) : (
                <AdminBadge variant={adminStatusVariant(selected.status)}>
                  {adminStatusLabel(selected.status)}
                </AdminBadge>
              )}
            </div>
            <ReviewProgress question={selected} />
          </AdminCard>
          {placeholder ? (
            <div
              role="note"
              className="rounded-lg border border-warning-border bg-warning-muted p-4 text-sm font-semibold leading-6 text-amber-900 xl:col-span-2"
            >
              Soal ini <b>placeholder riwayat</b> dari cutover Schema V2: penampung riwayat
              pengerjaan peserta lama, tanpa opsi jawaban, dan tidak dapat diedit.{' '}
              <b>Jangan dihapus</b> — ratusan baris attempt lama merujuk ke sini.
            </div>
          ) : null}

          <AdminCard className="min-w-0 p-5 xl:col-start-1">
            <AdminSectionHeading
              title="Isi soal"
              description="Periksa pertanyaan, kunci jawaban, pembahasan, dan pemetaan materi."
            />
            {data.stimulus ? (
              <div className="mt-4 rounded-lg border border-warning-border bg-warning-muted p-4">
                {Boolean(data.stimulus.title) ? (
                  <h4 className="mb-2 font-semibold text-foreground">{s(data.stimulus.title)}</h4>
                ) : null}
                <div className="whitespace-pre-wrap text-sm font-medium leading-6 text-foreground">
                  <MathRenderer text={s(data.stimulus.content)} />
                </div>
                {Boolean(data.stimulus.source_reference) ? (
                  <div className="mt-2 text-xs font-semibold text-muted-foreground">
                    Sumber: {s(data.stimulus.source_reference)}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-base font-medium leading-7 text-foreground">
              <MathRenderer text={s(selected.stem)} />
            </div>
            <div className="mt-4 space-y-2.5">
              {data.options.map((option) => (
                <OptionPreview key={s(option.id)} option={option} />
              ))}
            </div>
            {answerMismatch ? (
              <div
                role="note"
                className="mt-4 rounded-lg border border-warning-border bg-warning-muted px-4 py-3 text-sm font-semibold leading-6 text-warning"
              >
                <b>Periksa kunci jawaban:</b> opsi {answerMismatch.marked} ditandai benar, tetapi
                pembahasan menyebut opsi {answerMismatch.stated}. Cocokkan keduanya sebelum mengirim
                atau menyetujui soal.
              </div>
            ) : null}
            <div className="mt-5 border-t border-border pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pembahasan
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground">
                {data.explanation?.content ? (
                  <MathRenderer text={s(data.explanation.content)} />
                ) : (
                  <span className="font-bold text-warning">Pembahasan belum tersedia.</span>
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pemetaan materi
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.knowledgeNodes.length ? (
                  data.knowledgeNodes.map((node) => (
                    <AdminBadge key={s(node.id)} variant="blue">
                      {s(node.name)}
                    </AdminBadge>
                  ))
                ) : (
                  <span className="text-sm font-medium text-warning">Belum dipetakan.</span>
                )}
              </div>
            </div>
          </AdminCard>

          <div
            id="review-actions"
            className="min-w-0 scroll-mt-20 xl:sticky xl:top-20 xl:col-start-2"
          >
            <AdminCard className="p-5">
              <AdminSectionHeading
                title={
                  canReview
                    ? 'Keputusan review'
                    : canSubmit
                      ? 'Ajukan review'
                      : canPublish
                        ? 'Publikasi'
                        : 'Tindakan berikutnya'
                }
                description={
                  Boolean(selected.current_stage)
                    ? `Tahap ${stageLabel(selected.current_stage)} · versi ${n(selected.version)}.`
                    : `Status saat ini: ${adminStatusLabel(selected.status)}.`
                }
              />
              <div className="mt-4 space-y-4">
                <p className="rounded-lg border border-info-border bg-info-muted px-4 py-3 text-sm font-medium leading-6 text-blue-900">
                  {nextActionCopy}
                </p>
                {canEdit ? (
                  <a
                    href="#edit-question"
                    className="inline-flex text-sm font-semibold text-info hover:underline"
                  >
                    Ubah isi soal
                  </a>
                ) : null}
                {canSubmit ? (
                  <form action={submitContentQuestionAction} data-review-submit>
                    <HiddenContext
                      filters={params}
                      program={program}
                      track={track}
                      returnTo={params.returnTo}
                    />
                    <input type="hidden" name="question_id" value={s(selected.id)} />
                    <button className={adminPrimaryButtonClass}>
                      <Send size={16} />
                      Kirim ke Editorial Review
                    </button>
                  </form>
                ) : null}

                {canAssignOthers ? (
                  <form
                    action={assignContentReviewerAction}
                    className="rounded-lg border border-border bg-muted p-4"
                  >
                    <HiddenContext
                      filters={params}
                      program={program}
                      track={track}
                      returnTo={params.returnTo}
                    />
                    <input type="hidden" name="question_id" value={s(selected.id)} />
                    <label
                      htmlFor="assign-reviewer-select"
                      className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Pilih reviewer
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <select
                        id="assign-reviewer-select"
                        className={adminInputClass}
                        name="reviewer_id"
                        required
                        defaultValue={s(pendingReview?.reviewer_id)}
                      >
                        <option value="">Pilih reviewer</option>
                        {data.reviewers
                          .filter((reviewer) => s(reviewer.id) !== s(selected.author_id))
                          .map((reviewer) => (
                            <option key={reviewer.id} value={reviewer.id}>
                              {reviewer.full_name}
                            </option>
                          ))}
                      </select>
                      <button className={adminSecondaryButtonClass}>
                        <UserCheck size={16} />
                        Tugaskan
                      </button>
                    </div>
                  </form>
                ) : null}

                {canClaim && !canAssignOthers ? (
                  <form
                    action={assignContentReviewerAction}
                    className="rounded-lg border border-info-border bg-info-muted/60 p-4"
                  >
                    <HiddenContext
                      filters={params}
                      program={program}
                      track={track}
                      returnTo={params.returnTo}
                    />
                    <input type="hidden" name="question_id" value={s(selected.id)} />
                    <input type="hidden" name="reviewer_id" value={authorization.userId} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium leading-6 text-muted-foreground">
                        Belum ada reviewer untuk tahap ini. Klaim untuk mulai memeriksa.
                      </p>
                      <button className={adminSecondaryButtonClass}>
                        <UserCheck size={16} />
                        Klaim untuk saya
                      </button>
                    </div>
                  </form>
                ) : null}

                {Boolean(selected.current_stage) && !pendingReview ? (
                  <p className="rounded-lg border border-warning-border bg-warning-muted p-3 text-sm font-medium text-warning">
                    Tahap aktif tidak memiliki review yang menunggu. Periksa riwayat alur.
                  </p>
                ) : null}

                {canReview ? (
                  <ReviewDecisionForm
                    questionId={s(selected.id)}
                    workspaceReturnTo={workspaceHref({ ...params, program, track })}
                    returnTo={params.returnTo}
                    program={program}
                    track={track}
                  />
                ) : null}

                {Boolean(selected.current_stage) && !canReview && Boolean(selected.reviewer_id) ? (
                  <p className="text-sm font-medium leading-6 text-muted-foreground">
                    Tahap ini ditugaskan ke{' '}
                    <b className="text-foreground">{profileName(assignedReviewer)}</b>. Hanya
                    reviewer tersebut yang dapat memberikan keputusan.
                  </p>
                ) : null}
                {currentActorIsAuthor && Boolean(selected.current_stage) ? (
                  <div className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm font-medium text-danger">
                    Self-review diblok. Author tidak dapat mereview soal sendiri.
                  </div>
                ) : null}
                {canPublish ? (
                  <form action={publishContentQuestionAction}>
                    <HiddenContext
                      filters={params}
                      program={program}
                      track={track}
                      returnTo={params.returnTo}
                    />
                    <input type="hidden" name="question_id" value={s(selected.id)} />
                    <ConfirmSubmit
                      title="Terbitkan soal?"
                      message="Soal akan tersedia untuk assessment berikutnya."
                      detail="Pastikan seluruh tahap review selesai dan isi soal sudah benar."
                      confirmLabel="Terbitkan soal"
                      confirmClassName={adminPrimaryButtonClass}
                      trigger={
                        <button type="button" className={adminPrimaryButtonClass}>
                          <ShieldCheck size={16} />
                          Terbitkan soal
                        </button>
                      }
                    />
                  </form>
                ) : null}
              </div>
            </AdminCard>
          </div>

          {canEdit ? (
            <ReviewDraftDisclosure
              id="edit-question"
              title="Ubah draf / revisi"
              description="Ubah konten dan klasifikasi. Simpan sebelum mengirim kembali ke review."
              className="xl:col-span-2 xl:col-start-1"
            >
              <ReviewDraftForm action={saveContentDraftAction} className="admin-review-draft-form">
                <div className="p-5">
                  <AdminFormSection title="Isi & Klasifikasi">
                    <HiddenContext
                      filters={params}
                      program={program}
                      track={track}
                      returnTo={params.returnTo}
                    />
                    <input type="hidden" name="id" value={s(selected.id)} />
                    <input type="hidden" name="expected_version" value={s(selected.version)} />
                    <input
                      type="hidden"
                      name="expected_updated_at"
                      value={s(selected.updated_at)}
                    />
                    <AdminField label="Mapel / subtes">
                      <select
                        className={adminInputClass}
                        name="subject_code"
                        required
                        defaultValue={s(data.subjectById.get(s(selected.subject_id))?.code)}
                      >
                        {data.catalog.subjects.map((subject) => (
                          <option key={subject.id} value={subject.code}>
                            {subject.code} · {subject.name}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <ReviewQuestionFields
                      defaultType={s(selected.question_type)}
                      optionsDefaultValue={serializeOptionRows(data.options)}
                      middle={
                        <>
                          <QuestionRichTextEditor
                            name="stem"
                            label="Pertanyaan"
                            className="lg:col-span-2"
                            required
                            defaultValue={s(selected.stem)}
                            minHeight="min-h-32"
                          />
                          <AdminField label="Tingkat kesulitan">
                            <select
                              className={adminInputClass}
                              name="difficulty"
                              defaultValue={s(selected.difficulty)}
                            >
                              <option value="easy">Mudah</option>
                              <option value="medium">Sedang</option>
                              <option value="hard">Sulit</option>
                            </select>
                          </AdminField>
                          <AdminField label="Level kognitif">
                            <input
                              className={adminInputClass}
                              name="cognitive_level"
                              defaultValue={s(selected.cognitive_level)}
                            />
                          </AdminField>
                          <AdminField label="Estimasi detik">
                            <input
                              className={adminInputClass}
                              type="number"
                              min="1"
                              name="estimated_seconds"
                              defaultValue={s(selected.estimated_seconds)}
                            />
                          </AdminField>
                          <AdminField label="Sumber / referensi">
                            <input
                              className={adminInputClass}
                              name="source_reference"
                              defaultValue={s(selected.source_reference)}
                            />
                          </AdminField>
                          <AdminField label="Stimulus">
                            <select
                              className={adminInputClass}
                              name="stimulus_id"
                              defaultValue={s(selected.stimulus_id)}
                            >
                              <option value="">Tanpa stimulus</option>
                              {data.stimulusCandidates.map((stimulus) => (
                                <option key={s(stimulus.id)} value={s(stimulus.id)}>
                                  {s(stimulus.stimulus_code)} ·{' '}
                                  {s(stimulus.title) || s(stimulus.content).slice(0, 60)}
                                </option>
                              ))}
                            </select>
                          </AdminField>
                          <AdminField label="Materi utama">
                            <select
                              className={adminInputClass}
                              name="knowledge_node_id"
                              defaultValue={primaryNode ? s(primaryNode.knowledge_node_id) : ''}
                            >
                              <option value="">Belum dipetakan</option>
                              {data.subjectKnowledgeNodes.map((node) => (
                                <option key={s(node.id)} value={s(node.id)}>
                                  {'—'.repeat(Math.min(n(node.depth), 4))} {s(node.name)}
                                </option>
                              ))}
                            </select>
                          </AdminField>
                        </>
                      }
                    />
                    <QuestionRichTextEditor
                      name="explanation"
                      label="Pembahasan"
                      className="lg:col-span-2"
                      defaultValue={s(data.explanation?.content)}
                      minHeight="min-h-32"
                    />
                    <AdminField label="Alasan perubahan" className="lg:col-span-2">
                      <input
                        className={adminInputClass}
                        name="change_reason"
                        defaultValue="Pembaruan dari Reviewer Workspace"
                      />
                    </AdminField>
                    <div className="flex justify-end border-t border-border pt-4 lg:col-span-2">
                      <button className={adminPrimaryButtonClass}>Simpan perubahan</button>
                    </div>
                  </AdminFormSection>
                </div>
              </ReviewDraftForm>
            </ReviewDraftDisclosure>
          ) : null}

          <section className="grid gap-5 xl:col-span-2 xl:grid-cols-2">
            <AdminCard className="min-w-0 p-5">
              <AdminSectionHeading
                title="Riwayat review"
                description="Keputusan reviewer per tahap dan versi soal."
              />
              <div className="mt-4 space-y-3">
                {data.currentReviews.length === 0 ? (
                  <p className="text-sm font-medium text-muted-foreground">
                    Belum ada riwayat review.
                  </p>
                ) : (
                  data.currentReviews.map((review) => (
                    <div
                      key={s(review.id)}
                      className="rounded-lg border border-border bg-muted p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b className="text-sm text-foreground">
                          Putaran {n(review.review_round)} · {stageLabel(review.review_stage)}
                        </b>
                        <AdminBadge variant={adminStatusVariant(review.status)}>
                          {adminStatusLabel(review.status)}
                        </AdminBadge>
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground">
                        Reviewer: {profileName(data.profileById.get(s(review.reviewer_id)))} · Versi{' '}
                        {s(review.question_version) || '—'} ·{' '}
                        {formatDateTime(review.completed_at || review.updated_at)}
                      </div>
                      {Boolean(review.notes) ? (
                        <div className="mt-2 rounded-lg bg-card p-2.5 text-sm font-medium leading-6 text-foreground ring-1 ring-border">
                          {s(review.notes)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </AdminCard>

            <AdminCard className="min-w-0 p-5">
              <AdminSectionHeading title="Jejak audit" description="Riwayat aksi pada soal ini." />
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {data.auditLogs.length === 0 ? (
                  <p className="text-sm font-medium text-muted-foreground">
                    Belum ada aksi audit untuk soal ini.
                  </p>
                ) : (
                  data.auditLogs.map((log) => (
                    <div key={s(log.id)} className="rounded-lg border border-border p-3">
                      <div className="text-sm font-semibold text-foreground" title={s(log.action)}>
                        {adminAuditLabel(log.action)}
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground">
                        {formatDateTime(log.created_at)} ·{' '}
                        {profileName(data.profileById.get(s(log.actor_user_id)), 'Sistem')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminCard>
          </section>

          <AdminCard className="min-w-0 p-5">
            <AdminSectionHeading
              title="Riwayat versi soal"
              description="Salinan perubahan disimpan untuk audit dan pemulihan konten."
            />
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {data.versions.length === 0 ? (
                <p className="text-sm font-medium text-muted-foreground">
                  Salinan versi belum tersedia.
                </p>
              ) : (
                data.versions.map((version) => (
                  <details
                    key={s(version.id)}
                    className="rounded-lg border border-border bg-muted p-3"
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                      v{n(version.version)} · {formatDateTime(version.created_at)} ·{' '}
                      {s(version.change_reason) || 'Tanpa catatan'}
                    </summary>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] text-slate-200">
                      {JSON.stringify(version.snapshot, null, 2)}
                    </pre>
                  </details>
                ))
              )}
            </div>
          </AdminCard>
        </>
      ) : null}
    </section>
  )
}
