import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTh,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { adminExamTypeLabel, adminStatusLabel, formatDateTime } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import { assessmentKindForExamType } from '@/src/domain/assessment'
import Link from '@/components/admin/navigation/AdminLink'

import type { AssessmentWorkspaceProps } from './AssessmentWorkspaceTypes'
const PATH = '/admin/assessments'
export default function AssessmentList({
  data,
  params,
  program,
  track,
  readiness,
  eligibleIds,
  href,
  filters,
  listQuery,
}: AssessmentWorkspaceProps) {
  const typeById = new Map(data.catalog.examTypes.map((t) => [t.id, t]))
  const hasActiveFilters = Boolean(filters.search || filters.type || filters.status)
  const resetFiltersHref = `${PATH}?${new URLSearchParams({ program, track })}`
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Assessment' }]} />
      <AdminPageHeader
        title="Assessment"
        description="Buat, siapkan, dan distribusikan assessment."
        action={
          <Link className={adminPrimaryButtonClass} href={href({ new: '1' })}>
            Buat Assessment
          </Link>
        }
      />
      <AdminFeedbackBanner ok={params.ok} error={params.error} />
      <AdminTableToolbar
        pathname={PATH}
        search={filters.search || ''}
        searchName="search"
        placeholder="Cari assessment..."
        status={params.status}
        statusOptions={['draft', 'ready', 'active', 'scheduled', 'archived'].map((value) => ({
          value,
          label: adminStatusLabel(value),
        }))}
        program={program}
        track={track}
        resultCount={data.total}
        selects={[
          {
            name: 'type',
            ariaLabel: 'Filter jenis assessment',
            placeholder: 'Semua jenis',
            defaultValue: params.type || '',
            options: data.catalog.examTypes.map((t) => ({
              value: t.code,
              label: adminExamTypeLabel(t.code),
            })),
          },
        ]}
      />
      <AdminCard>
        {data.exams.length ? (
          <AdminDataTable className="w-full min-w-[1000px] text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                {['Assessment', 'Jenis', 'Soal', 'Kesiapan', 'Status', 'Diperbarui'].map((c) => (
                  <AdminTh key={c}>{c}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.exams.map((e) => {
                const typeCode = typeById.get(e.exam_type_id)?.code ?? ''
                const isDistributableType = assessmentKindForExamType(typeCode) !== null
                const isEligible = eligibleIds.has(e.id)
                return (
                  <tr key={e.id} className="hover:bg-muted" data-assessment-id={e.id}>
                    <td className="max-w-xs px-5 py-4 font-semibold">
                      <Link
                        className="transition-colors hover:text-primary hover:underline"
                        href={href({ assessment: e.id, tab: 'overview' })}
                      >
                        {e.title}
                      </Link>
                    </td>
                    <td className="px-4">
                      {adminExamTypeLabel(typeById.get(e.exam_type_id)?.code)}
                    </td>
                    <td className="px-4">{readiness.get(e.id)?.questionCount}</td>
                    <td className="px-4">
                      <AdminStatusBadge
                        status={isEligible ? 'ready' : 'unavailable'}
                        label={
                          isEligible
                            ? 'Siap distribusi'
                            : isDistributableType
                              ? 'Belum siap'
                              : 'Di luar katalog'
                        }
                      />
                    </td>
                    <td className="px-4">
                      <AdminStatusBadge status={e.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 text-xs">
                      {formatDateTime(e.updated_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminDataTable>
        ) : (
          <AdminEmptyState
            title={hasActiveFilters ? 'Tidak ada assessment yang cocok' : 'Belum ada assessment'}
            description={
              hasActiveFilters
                ? 'Coba ubah kriteria pencarian atau reset filter untuk melihat assessment lain.'
                : 'Buat assessment draft untuk mulai menyiapkan soal, konfigurasi, dan distribusi.'
            }
            action={
              <Link
                className={adminSecondaryButtonClass}
                href={hasActiveFilters ? resetFiltersHref : href({ new: '1' })}
              >
                {hasActiveFilters ? 'Reset filter' : 'Buat Assessment'}
              </Link>
            }
          />
        )}
        {data.exams.length ? (
          <AdminPagination
            pathname={PATH}
            params={Object.fromEntries(listQuery)}
            summary={adminPageSummary(data.page, data.exams.length, data.total)}
            noun="assessment"
          />
        ) : null}
      </AdminCard>
    </AdminPage>
  )
}
