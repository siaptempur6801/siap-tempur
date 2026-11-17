import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { adminQuestionTypeLabel, formatDateTime } from '@/lib/admin-format'
import { adminPageSummaryLabel } from '@/lib/admin-pagination'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'
import {
  questionTaxonomyAndReview,
  questionTaxonomyOptions,
} from '@/src/services/admin-question-ux.service'
import Link from '@/components/admin/navigation/AdminLink'
import AdminPagination from './AdminPagination'
import {
  DOMAIN_SEARCH_PLACEHOLDER,
  DOMAIN_STATUS_OPTIONS,
  PageOutOfRange,
  PermissionEmpty,
  s,
  type AdminQuestionsPanelProps,
} from './AdminResourceShared'
import AdminTableToolbar from './AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminRowActions,
  AdminSectionHeading,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from './AdminUi'

export default async function AdminQuestionsPanel(props: AdminQuestionsPanelProps) {
  const {
    canQuestions,
    program,
    track,
    pathname,
    activeFilters,
    pageSummary,
    pageOutOfRange,
    questions,
    missingQuestion,
    workspace,
    params,
    subjectById,
    editHref,
  } = props

  if (!canQuestions) return <PermissionEmpty permission="question.manage" />

  const [metadata, nodes] = await Promise.all([
    questionTaxonomyAndReview(questions),
    questionTaxonomyOptions(workspace.catalog.subjects.map((subject) => subject.id)),
  ])
  const hasFilters = Boolean(
    activeFilters.q ||
    activeFilters.status ||
    activeFilters.subject ||
    activeFilters.material ||
    activeFilters.submaterial ||
    activeFilters.review,
  )
  const resetQuery = new URLSearchParams({ program, track })
  const resetHref = `${pathname}?${resetQuery}`
  const selectedSubjectId = workspace.catalog.subjects.find(
    (subject) => subject.code === params.subject,
  )?.id
  const visibleNodes = nodes.filter(
    (node) => !selectedSubjectId || node.subject_id === selectedSubjectId,
  )

  return (
    <section className="flex flex-col gap-4">
      {missingQuestion ? (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger"
        >
          Soal tidak ditemukan pada konteks ini.
        </p>
      ) : null}

      <AdminTableToolbar
        pathname={pathname}
        program={program}
        track={track}
        search={activeFilters.q}
        status={activeFilters.status}
        statusOptions={DOMAIN_STATUS_OPTIONS.questions}
        placeholder={DOMAIN_SEARCH_PLACEHOLDER.questions}
        resultCount={pageSummary?.total || 0}
        selects={[
          {
            name: 'subject',
            ariaLabel: 'Filter subtes',
            placeholder: 'Semua subtes',
            defaultValue: params.subject || '',
            clearOnChange: ['material', 'submaterial'],
            options: workspace.catalog.subjects.map((subject) => ({
              value: subject.code,
              label: `${subject.code} · ${subject.name}`,
            })),
          },
          {
            name: 'material',
            ariaLabel: 'Filter materi',
            placeholder: 'Semua materi',
            defaultValue: params.material || '',
            clearOnChange: ['submaterial'],
            options: visibleNodes
              .filter((node) => !node.parent_id)
              .map((node) => ({ value: String(node.id), label: String(node.name) })),
          },
          {
            name: 'submaterial',
            ariaLabel: 'Filter submateri',
            placeholder: 'Semua submateri',
            defaultValue: params.submaterial || '',
            options: visibleNodes
              .filter(
                (node) =>
                  node.parent_id && (!params.material || node.parent_id === params.material),
              )
              .map((node) => ({ value: String(node.id), label: String(node.name) })),
          },
          {
            name: 'review',
            ariaLabel: 'Filter status review',
            placeholder: 'Semua status review',
            defaultValue: params.review || '',
            options: [
              { value: 'needs_review', label: 'Perlu ditinjau' },
              { value: 'approved', label: 'Disetujui' },
              { value: 'rejected', label: 'Ditolak' },
              { value: 'blocked_asset', label: 'Aset terblokir' },
              { value: 'blocked_content', label: 'Konten terblokir' },
            ],
          },
        ]}
      />

      <AdminCard>
        <div className="p-4 sm:p-5">
          <AdminSectionHeading
            title="Daftar soal"
            description={pageSummary ? adminPageSummaryLabel(pageSummary, 'soal') : undefined}
          />
        </div>
        <AdminDataTable caption="Daftar bank soal" className="w-full min-w-[1050px] text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              {['Soal', 'Taksonomi', 'Jenis', 'Review', 'Status', 'Diperbarui', 'Aksi'].map(
                (heading) => (
                  <AdminTh key={heading}>{heading}</AdminTh>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {questions.map((question) => {
              const id = s(question.id)
              const code = s(question.question_code)
              const placeholder = isLegacyHistoryPlaceholder(question.source_type)
              const meta = metadata.get(id)
              const taxonomy = subjectById.get(s(question.subject_id))
              const preview = placeholder
                ? 'Placeholder riwayat lama — terkunci.'
                : s(question.stem)
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .trim()
                    .slice(0, 180)
              const reviewHref = `/admin/content/review?${new URLSearchParams({
                program,
                track,
                question: id,
                returnTo: `${pathname}?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(activeFilters).filter((entry): entry is [string, string] =>
                      Boolean(entry[1]),
                    ),
                  ),
                  page: String(pageSummary?.page || 1),
                })}`,
              })}`

              return (
                <tr key={id} data-question-id={id} className="hover:bg-muted/60">
                  <td className="max-w-md px-5 py-3.5">
                    {placeholder ? (
                      <p className="font-semibold">
                        {code} · v{s(question.version)}
                      </p>
                    ) : (
                      <Link
                        href={editHref('questions', id)}
                        className="block rounded-sm font-semibold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={`Ubah soal ${code}`}
                      >
                        {code} · v{s(question.version)}
                      </Link>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
                  </td>
                  <td className="max-w-xs px-4 py-3.5 text-xs">
                    <span className="font-medium">{taxonomy?.code || '—'}</span>
                    <p className="mt-1 text-muted-foreground">
                      {meta?.taxonomy || 'Belum ditetapkan'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    {adminQuestionTypeLabel(question.question_type)}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminStatusBadge status={meta?.review || 'needs_review'} />
                    {meta?.blockedAsset ? (
                      <p className="mt-1 max-w-40 text-xs text-warning">
                        Aset perlu diperiksa pada Technical QA.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminStatusBadge status={question.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                    {formatDateTime(question.updated_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    {placeholder ? (
                      <span className="text-xs text-muted-foreground">Terkunci</span>
                    ) : (
                      <AdminRowActions>
                        <Link
                          className={adminTableActionClass}
                          href={reviewHref}
                          aria-label={`Buka review soal ${code}`}
                        >
                          Review
                        </Link>
                      </AdminRowActions>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </AdminDataTable>

        {!questions.length ? (
          pageOutOfRange ? (
            <PageOutOfRange
              lastPage={pageSummary?.totalPages || 1}
              href={`${pathname}?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(activeFilters).filter((entry): entry is [string, string] =>
                    Boolean(entry[1]),
                  ),
                ),
                page: String(pageSummary?.totalPages || 1),
              })}`}
              noun="soal"
            />
          ) : (
            <AdminEmptyState
              title={hasFilters ? 'Tidak ada soal yang cocok' : 'Belum ada soal'}
              description={
                hasFilters
                  ? 'Coba ubah pencarian atau filter untuk melihat soal lain.'
                  : 'Tambahkan soal ke bank untuk mulai membangun materi assessment.'
              }
              action={
                <Link
                  className={adminSecondaryButtonClass}
                  href={
                    hasFilters
                      ? resetHref
                      : `${pathname}?${new URLSearchParams({ program, track, new: '1' })}`
                  }
                >
                  {hasFilters ? 'Reset filter' : 'Tambah soal'}
                </Link>
              }
            />
          )
        ) : null}

        {pageSummary ? (
          <AdminPagination
            pathname={pathname}
            params={activeFilters}
            summary={pageSummary}
            noun="soal"
          />
        ) : null}
      </AdminCard>
    </section>
  )
}
