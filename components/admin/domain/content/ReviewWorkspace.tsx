import { saveContentDraftAction } from '@/app/actions/content-review'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminBadge,
  AdminCard,
  AdminFeedbackBanner,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminRowActions,
  AdminStatusBadge,
  AdminTh,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import QuestionRichTextEditor from '@/components/admin/QuestionRichTextEditor'
import ReviewBatchPanel from '@/components/admin/ReviewBatchPanel'
import ReviewDraftForm from '@/components/admin/ReviewDraftForm'
import ReviewQuestionFields from '@/components/admin/ReviewQuestionFields'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import { adminStatusLabel, formatDateTime } from '@/lib/admin-format'
import { adminPageSummary, parseAdminPage } from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'
import { DEFAULT_REVIEW_BATCH_CODE } from '@/lib/review-batch'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import { adminWorkspaceService } from '@/src/services/admin-workspace.service'
import { authorizationService } from '@/src/services/authorization.service'
import { contentReviewService } from '@/src/services/content-review.service'
import { ArrowLeft, FilePlus2, Sparkles } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import { redirect } from 'next/navigation'
import ReviewQuestionWorkspace from './ReviewQuestionWorkspace'
import {
  HiddenContext,
  lower,
  n,
  profileName,
  s,
  stageLabel,
  workspaceHref,
} from './ReviewWorkspace.shared'
import type {
  ReviewWorkspaceRow as Row,
  ReviewWorkspaceSearchParams as SearchParams,
} from './ReviewWorkspace.shared'

/** Urutan status pada filter — label memakai `adminStatusLabel` agar konsisten. */
const REVIEW_STATUS_OPTIONS = [
  'draft',
  'submitted',
  'editorial_review',
  'academic_review',
  'technical_qa',
  'revision_required',
  'approved',
  'published',
  'rejected',
] as const

/** Deteksi konflik yang bisa dikenali tanpa menebak isi pembahasan. */
function singleChoiceAnswerMismatch(questionType: unknown, options: Row[], explanation: unknown) {
  if (lower(questionType) !== 'single_choice') return null
  const marked = options
    .filter((option) => option.is_correct === true)
    .map((option) => s(option.option_key).trim().toUpperCase())
    .filter(Boolean)
  if (marked.length !== 1) return null
  const plainExplanation = s(explanation)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
  const stated = plainExplanation
    .match(/jawaban\s+benar\s*[:：]\s*([a-z0-9]+)/i)?.[1]
    ?.toUpperCase()
  if (!stated || stated === marked[0]) return null
  return { marked: marked[0], stated }
}

function queueTaskLabel(question: Row) {
  if (isLegacyHistoryPlaceholder(question.source_type)) return 'Placeholder riwayat'
  const pending = question.pending_review as Row | null | undefined
  if (question.current_stage && !pending?.reviewer_id) return 'Pilih reviewer'
  if (question.current_stage) return `Review ${stageLabel(question.current_stage)}`
  if (lower(question.status) === 'approved') return 'Siap diterbitkan'
  if (lower(question.status) === 'revision_required') return 'Perlu revisi'
  if (lower(question.status) === 'published') return 'Sudah terbit'
  return 'Lengkapi draf'
}

export default async function ContentReviewWorkspace({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const rawParams = await searchParams
  const params = {
    ...rawParams,
    status:
      rawParams.view === 'approved'
        ? 'approved'
        : rawParams.view === 'rejected'
          ? 'rejected'
          : rawParams.view === 'blocked'
            ? 'all'
            : rawParams.status,
  }
  const authorization = await authorizationService.requireAuthenticated()
  const permissions = new Set(authorization.permissions)
  const canEnter = [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_REVIEW,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.QUESTION_MANAGE,
  ].some((permission) => permissions.has(permission))
  if (!canEnter) redirect('/cpns/dashboard')
  const canManageQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)

  const context = {
    programCode: (params.program || 'TKA').toUpperCase(),
    trackCode: (params.track || 'SMP').toUpperCase(),
  }
  if (params.new === '1' && canManageQuestions) {
    const createQuery = new URLSearchParams({
      program: context.programCode,
      track: context.trackCode,
      new: '1',
    })
    redirect(`/admin/content/questions?${createQuery}`)
  }

  const blocked =
    params.view === 'blocked'
      ? await adminWorkspaceService.listDomainPage('questions', {
          context,
          review: 'blocked',
          search: params.q,
          subject: params.subject,
          stage: params.stage,
          reviewer: params.reviewer,
          page: parseAdminPage(params.page),
        })
      : null
  const workspaceData = await contentReviewService.getWorkspaceData(
    context,
    {
      subject: params.subject || null,
      status: params.status || null,
      stage: params.stage || null,
      reviewer: params.reviewer || null,
      q: params.q || null,
      page: blocked ? 1 : parseAdminPage(params.page),
      ids: blocked?.rows.map((row) => s(row.id)),
      assignee: authorization.userId,
    },
    params.question || null,
  )

  const data = blocked
    ? {
        ...workspaceData,
        total: blocked.total,
        page: parseAdminPage(params.page),
        lastPage: blocked.lastPage,
        clampTo: blocked.clampTo,
      }
    : workspaceData

  if (!params.question && data.clampTo !== null) {
    redirect(
      workspaceHref(
        { ...params, program: data.catalog.program.code, track: data.catalog.track.code },
        { page: String(data.clampTo) },
      ),
    )
  }

  const program = data.catalog.program.code
  const track = data.catalog.track.code
  const selected = data.selectedQuestion as Row | null
  const placeholder = isLegacyHistoryPlaceholder(selected?.source_type)
  const pendingReview =
    selected?.pending_review && typeof selected.pending_review === 'object'
      ? (selected.pending_review as Row)
      : null
  const author = selected ? data.profileById.get(s(selected.author_id)) : null
  const assignedReviewer = selected?.reviewer_id
    ? data.profileById.get(s(selected.reviewer_id))
    : null
  const currentActorIsAuthor = selected ? s(selected.author_id) === authorization.userId : false
  const canCreate = permissions.has(PERMISSIONS.CONTENT_CREATE) || canManageQuestions
  const canEdit =
    !placeholder &&
    Boolean(selected) &&
    ['draft', 'revision_required', 'rejected'].includes(lower(selected?.status)) &&
    (permissions.has(PERMISSIONS.CONTENT_UPDATE) || canManageQuestions) &&
    (currentActorIsAuthor || canManageQuestions)
  const canSubmit =
    !placeholder &&
    Boolean(selected) &&
    ['draft', 'revision_required'].includes(lower(selected?.status)) &&
    (permissions.has(PERMISSIONS.CONTENT_UPDATE) ||
      permissions.has(PERMISSIONS.CONTENT_CREATE) ||
      canManageQuestions) &&
    (currentActorIsAuthor || canManageQuestions)
  // Aturan C: menugaskan ke orang lain = aksi manajerial; reviewer hanya
  // mengklaim untuk dirinya sendiri.
  const canAssignOthers =
    !placeholder &&
    Boolean(selected?.current_stage) &&
    Boolean(pendingReview) &&
    (permissions.has(PERMISSIONS.CONTENT_ASSIGN) || canManageQuestions)
  const canClaim =
    !placeholder &&
    Boolean(selected?.current_stage) &&
    Boolean(pendingReview) &&
    !pendingReview?.reviewer_id &&
    permissions.has(PERMISSIONS.CONTENT_REVIEW) &&
    !currentActorIsAuthor
  const canReview =
    !placeholder &&
    Boolean(selected?.current_stage) &&
    Boolean(pendingReview) &&
    permissions.has(PERMISSIONS.CONTENT_REVIEW) &&
    s(selected?.reviewer_id) === authorization.userId &&
    !currentActorIsAuthor
  const canPublish =
    !placeholder &&
    lower(selected?.status) === 'approved' &&
    permissions.has(PERMISSIONS.CONTENT_PUBLISH)
  const nextActionCopy = placeholder
    ? 'Placeholder riwayat attempt lama — tidak ada tindakan yang tersedia dan soal ini tidak dapat diedit.'
    : canReview
      ? 'Periksa isi soal di atas, lalu pilih keputusan. Catatan wajib untuk revisi atau penolakan.'
      : canAssignOthers
        ? `Pilih reviewer untuk tahap ${stageLabel(selected?.current_stage)}.`
        : canClaim
          ? `Klaim review tahap ${stageLabel(selected?.current_stage)} untuk diri Anda, lalu beri keputusan.`
          : canSubmit
            ? 'Pastikan draf lengkap, lalu kirim ke Editorial Review.'
            : canPublish
              ? 'Seluruh tahap review selesai. Soal siap diterbitkan.'
              : 'Tidak ada tindakan yang perlu Anda lakukan pada tahap ini.'
  const primaryNode = data.knowledgeMappings.find(
    (row) => lower(row.relation_type) === 'primary',
  ) as Row | undefined
  const answerMismatch = selected
    ? singleChoiceAnswerMismatch(selected.question_type, data.options, data.explanation?.content)
    : null

  const visibleQuestions = data.questions
  // Angka-angka ini exact (agregat seluruh tabel), bukan hasil menghitung
  // jendela daftar — lihat `countQuestionsByStatus`.

  const createNew = params.new === '1'
  const activeSubjectCode = params.subject || data.catalog.subjects[0]?.code || ''
  // Panel review massal hanya relevan untuk batch CPNS/SKD yang sedang
  // dikerjakan. Konteks lain tidak perlu query tambahan.
  const isBatchContext = program === 'CPNS' && track === 'SKD'
  const canUseBulk =
    permissions.has(PERMISSIONS.CONTENT_REVIEW) || permissions.has(PERMISSIONS.CONTENT_PUBLISH)
  // Detail soal dari panel batch tetap memakai layar review normal. Penanda
  // batch hanya mengubah layar antrean, supaya konteksnya bisa dipulihkan.
  const batchContext = isBatchContext && params.bulk === '1' && canUseBulk
  const bulkMode = batchContext && !params.question

  return (
    <AdminPage>
      <AdminBreadcrumbs
        items={[
          { label: 'Content' },
          {
            label: 'Review',
            href: selected
              ? workspaceHref({ ...params, program, track }, { question: undefined })
              : undefined,
          },
          ...(selected ? [{ label: s(selected.question_code) }] : []),
        ]}
      />
      <AdminPageHeader
        title={selected ? 'Periksa soal' : 'Review'}
        description={
          selected
            ? canReview
              ? 'Periksa isi soal dan pembahasannya sebelum memilih keputusan.'
              : canSubmit
                ? 'Pastikan soal lengkap, lalu ajukan ke tahap Editorial Review.'
                : canPublish
                  ? 'Semua tahap review selesai. Periksa kembali sebelum menerbitkan.'
                  : 'Periksa isi soal dan tindak lanjuti tahap yang sedang berjalan.'
            : `Antrean tugas review konten ${program} / ${track}.`
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {params.returnTo && (
              <Link
                href={adminReturnUrl(params.returnTo, '/admin/content/questions')}
                className={adminSecondaryButtonClass}
              >
                Kembali ke Question Bank
              </Link>
            )}
            {bulkMode ? (
              <Link
                href={workspaceHref({ ...params, program, track }, { bulk: undefined })}
                className={adminSecondaryButtonClass}
              >
                <ArrowLeft size={16} />
                Kembali ke antrean
              </Link>
            ) : !selected && !batchContext && canUseBulk ? (
              <Link
                href={workspaceHref({ program: 'CPNS', track: 'SKD', bulk: '1' })}
                className={adminSecondaryButtonClass}
              >
                <Sparkles size={16} />
                Buka review massal
              </Link>
            ) : null}
            {canCreate && !canManageQuestions && !bulkMode && !selected && params.new !== '1' ? (
              <Link
                href={workspaceHref(
                  { ...params, program, track },
                  { new: '1', question: undefined },
                )}
                className={adminPrimaryButtonClass}
              >
                <FilePlus2 size={16} />
                Buat draf soal
              </Link>
            ) : undefined}
          </div>
        }
      />

      <AdminFeedbackBanner ok={params.ok} error={params.error} />

      {bulkMode ? (
        <div id="review-massal">
          <ReviewBatchPanel
            batch={DEFAULT_REVIEW_BATCH_CODE}
            program={program}
            track={track}
            actorId={authorization.userId}
            canReview={permissions.has(PERMISSIONS.CONTENT_REVIEW)}
            canPublish={permissions.has(PERMISSIONS.CONTENT_PUBLISH)}
          />
        </div>
      ) : null}

      {!bulkMode && !selected && !createNew && (
        <AdminTabs
          className="grid grid-cols-2 overflow-visible sm:flex [&>a]:min-h-11 [&>a]:justify-center"
          active={params.view || 'needs_review'}
          tabs={[
            ['needs_review', 'Perlu tindakan'],
            ['blocked', 'Terblokir'],
            ['approved', 'Disetujui'],
            ['rejected', 'Ditolak'],
          ].map(([id, label]) => ({
            id,
            label,
            href: workspaceHref(
              { ...params, program, track },
              { view: id, status: undefined, page: undefined, question: undefined },
            ),
          }))}
        />
      )}
      <div className={bulkMode || selected || createNew ? 'hidden' : ''}>
        <AdminTableToolbar
          pathname="/admin/content/review"
          program={program}
          track={track}
          hiddenFields={{ view: params.view, returnTo: params.returnTo }}
          search={params.q || ''}
          status={params.status || ''}
          statusOptions={[
            ...REVIEW_STATUS_OPTIONS.map((status) => ({
              value: status,
              label: status === 'submitted' ? 'Diajukan untuk review' : adminStatusLabel(status),
            })),
            { value: 'all', label: 'Semua status' },
          ]}
          statusPlaceholder="Perlu tindakan"
          placeholder="Cari kode atau isi soal..."
          resultCount={data.total}
          selects={[
            {
              name: 'subject',
              ariaLabel: 'Filter subtes',
              placeholder: 'Semua subtes',
              defaultValue: params.subject || '',
              options: data.catalog.subjects.map((subject) => ({
                value: subject.code,
                label: `${subject.code} · ${subject.name}`,
              })),
            },
            {
              name: 'stage',
              ariaLabel: 'Filter tahap review',
              placeholder: 'Semua tahap',
              defaultValue: params.stage || '',
              options: [
                { value: 'editorial', label: 'Editorial' },
                { value: 'academic', label: 'Academic' },
                { value: 'technical_qa', label: 'Technical QA' },
              ],
            },
            {
              name: 'reviewer',
              ariaLabel: 'Filter reviewer',
              placeholder: 'Semua reviewer',
              defaultValue: params.reviewer || '',
              options: [
                { value: 'unassigned', label: 'Belum di-assign' },
                ...data.reviewers.map((reviewer) => ({
                  value: reviewer.id,
                  label: reviewer.full_name,
                })),
              ],
            },
          ]}
        />
      </div>

      {!bulkMode && createNew && canCreate ? (
        <section className="w-full max-w-[960px]">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Buat draf soal</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Isi konten utama terlebih dahulu. Klasifikasi dan opsi disimpan bersama dalam satu
                transaksi.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              href={workspaceHref(
                { ...params, program, track },
                { new: undefined, question: undefined },
              )}
            >
              Tutup
            </Link>
          </div>
          <ReviewDraftForm action={saveContentDraftAction}>
            <AdminFormSection title="Isi & Klasifikasi">
              <HiddenContext
                filters={params}
                program={program}
                track={track}
                returnTo={params.returnTo}
              />
              <AdminField label="Mapel / subtes">
                <select
                  className={adminInputClass}
                  name="subject_code"
                  required
                  defaultValue={activeSubjectCode}
                >
                  {data.catalog.subjects.map((subject) => (
                    <option key={subject.id} value={subject.code}>
                      {subject.code} · {subject.name}
                    </option>
                  ))}
                </select>
              </AdminField>
              <ReviewQuestionFields
                middle={
                  <>
                    <QuestionRichTextEditor
                      name="stem"
                      label="Pertanyaan"
                      className="lg:col-span-2"
                      required
                      placeholder="Tulis pertanyaan dengan jelas..."
                      minHeight="min-h-32"
                    />
                    <AdminField label="Tingkat kesulitan">
                      <select className={adminInputClass} name="difficulty" defaultValue="medium">
                        <option value="easy">Mudah</option>
                        <option value="medium">Sedang</option>
                        <option value="hard">Sulit</option>
                      </select>
                    </AdminField>
                    <AdminField label="Level kognitif">
                      <input
                        className={adminInputClass}
                        name="cognitive_level"
                        placeholder="application / reasoning"
                      />
                    </AdminField>
                    <AdminField label="Estimasi detik">
                      <input
                        className={adminInputClass}
                        type="number"
                        min="1"
                        name="estimated_seconds"
                        placeholder="60"
                      />
                    </AdminField>
                    <AdminField label="Sumber / referensi">
                      <input
                        className={adminInputClass}
                        name="source_reference"
                        placeholder="Sumber atau referensi"
                      />
                    </AdminField>
                  </>
                }
              />
              <QuestionRichTextEditor
                name="explanation"
                label="Pembahasan"
                className="lg:col-span-2"
                placeholder="Tulis alasan jawaban dan konsep yang diuji..."
                minHeight="min-h-32"
              />
              <AdminField label="Alasan / catatan perubahan" className="lg:col-span-2">
                <input
                  className={adminInputClass}
                  name="change_reason"
                  defaultValue="Draf awal dari Reviewer Workspace"
                />
              </AdminField>
              <div className="flex flex-wrap gap-2 lg:col-span-2">
                <button className={adminPrimaryButtonClass}>
                  <FilePlus2 size={16} />
                  Simpan draft
                </button>
                <Link
                  href={workspaceHref(
                    { ...params, program, track },
                    { new: undefined, question: undefined },
                  )}
                  className={adminSecondaryButtonClass}
                >
                  Batal
                </Link>
              </div>
            </AdminFormSection>
          </ReviewDraftForm>
        </section>
      ) : null}

      {!bulkMode ? (
        <div className="flex flex-col gap-6">
          <AdminCard className={cn('overflow-hidden', selected || createNew ? 'hidden' : '')}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Antrean review</h2>
                <p className="text-xs font-medium text-muted-foreground">
                  {data.total} soal sesuai filter
                </p>
              </div>
              <AdminBadge>{data.counts.unassigned} belum ditugaskan</AdminBadge>
            </div>
            <AdminDataTable
              caption="Antrean review"
              className="min-w-[900px]"
              empty={
                !visibleQuestions.length
                  ? {
                      title: 'Antrean kosong',
                      description:
                        'Tidak ada soal untuk filter ini. Ubah filter atau ajukan konten untuk review.',
                    }
                  : undefined
              }
            >
              <thead className={adminTableHeadClass}>
                <tr>
                  {[
                    'Soal',
                    'Materi',
                    'Isu / Tindakan berikutnya',
                    'Status review',
                    'Diperbarui',
                    'Tindakan',
                  ].map((h) => (
                    <AdminTh key={h}>{h}</AdminTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleQuestions.map((question) => {
                  const id = s(question.id),
                    subject = data.subjectById.get(s(question.subject_id)),
                    pending = question.pending_review
                  const assignedName = question.reviewer_id
                    ? profileName(data.profileById.get(s(question.reviewer_id)))
                    : ''
                  const nextTask = pending?.reviewer_id
                    ? s(pending.reviewer_id) === authorization.userId
                      ? `Menunggu keputusan Anda · ${stageLabel(question.current_stage)}`
                      : `Menunggu ${assignedName} · ${stageLabel(question.current_stage)}`
                    : s(pending?.notes) || queueTaskLabel(question)
                  return (
                    <tr key={id}>
                      <td className="max-w-md">
                        <p className="font-medium">
                          {s(question.question_code) || 'Tanpa kode'} · v{n(question.version)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {s(question.stem)
                            .replace(/<[^>]*>/g, ' ')
                            .slice(0, 180)}
                        </p>
                      </td>
                      <td>{s(subject?.code) || 'Belum ditetapkan'}</td>
                      <td className="max-w-xs">
                        <p className="text-xs">{nextTask}</p>
                      </td>
                      <td>
                        <AdminStatusBadge status={question.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {formatDateTime(question.updated_at)}
                      </td>
                      <td>
                        <AdminRowActions>
                          <Link
                            href={workspaceHref(
                              { ...params, program, track },
                              { question: id, new: undefined },
                            )}
                            className={adminTableActionClass}
                          >
                            Periksa soal
                          </Link>
                        </AdminRowActions>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </AdminDataTable>
            {data.total > 0 ? (
              <AdminPagination
                pathname="/admin/content/review"
                params={{
                  program,
                  track,
                  subject: params.subject || '',
                  status: params.status || '',
                  view: params.view || '',
                  stage: params.stage || '',
                  reviewer: params.reviewer || '',
                  q: params.q || '',
                }}
                summary={adminPageSummary(data.page, visibleQuestions.length, data.total)}
                noun="soal"
              />
            ) : null}
          </AdminCard>

          <ReviewQuestionWorkspace
            data={data}
            selected={selected}
            params={params}
            program={program}
            track={track}
            placeholder={placeholder}
            author={author}
            assignedReviewer={assignedReviewer}
            pendingReview={pendingReview}
            currentActorIsAuthor={currentActorIsAuthor}
            canEdit={canEdit}
            canSubmit={canSubmit}
            canAssignOthers={canAssignOthers}
            canClaim={canClaim}
            canReview={canReview}
            canPublish={canPublish}
            nextActionCopy={nextActionCopy}
            primaryNode={primaryNode}
            answerMismatch={answerMismatch}
            authorization={authorization}
            batchContext={batchContext}
          />
        </div>
      ) : null}
    </AdminPage>
  )
}
