import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
AdminCard,
AdminEmptyState,
AdminFeedbackBanner,
AdminPage,
AdminPageHeader,
AdminRowActions,
AdminStatusBadge,
AdminTh,
adminPrimaryButtonClass,
adminSecondaryButtonClass,
adminTableActionClass,
adminTableHeadClass
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { adminExamTypeLabel,adminStatusLabel,formatDateTime } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
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
  listQuery
}: AssessmentWorkspaceProps) {
  const typeById = new Map(data.catalog.examTypes.map((t) => [t.id, t]))
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Assessment' }, { label: program }, { label: track }]} />
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
          label: adminStatusLabel(value)
        }))}
        program={program}
        track={track}
        resultCount={data.total}
        selects={[
          {
            name: 'domain',
            ariaLabel: 'Filter program',
            placeholder: 'Pilih program',
            defaultValue: program,
            options: ['CPNS', 'TKA'].map((value) => ({ value, label: value }))
          },
          {
            name: 'type',
            ariaLabel: 'Filter jenis assessment',
            placeholder: 'Semua jenis',
            defaultValue: params.type || '',
            options: data.catalog.examTypes.map((t) => ({
              value: t.code,
              label: adminExamTypeLabel(t.code)
            }))
          },
          {
            name: 'level',
            ariaLabel: 'Filter jenjang',
            placeholder: 'Pilih jenjang',
            defaultValue: track,
            options: (program === 'TKA' ? ['SD', 'SMP', 'SMA'] : ['SKD']).map((value) => ({
              value,
              label: value
            }))
          }
        ]}
      />
      <AdminCard>
        <AdminDataTable className="w-full min-w-[1000px] text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              {[
                'Assessment',
                'Domain',
                'Jenis',
                'Level / Bagian',
                'Soal',
                'Readiness',
                'Status',
                'Diperbarui',
                'Aksi'
              ].map((c) => (
                <AdminTh key={c}>{c}</AdminTh>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.exams.map((e) => (
              <tr key={e.id} className="hover:bg-muted" data-assessment-id={e.id}>
                <td className="max-w-xs px-5 py-4 font-semibold">
                  <Link href={href({ assessment: e.id, tab: 'overview' })}>{e.title}</Link>
                </td>
                <td className="px-4">{program}</td>
                <td className="px-4">{adminExamTypeLabel(typeById.get(e.exam_type_id)?.code)}</td>
                <td className="px-4">{track}</td>
                <td className="px-4">{readiness.get(e.id)?.questionCount}</td>
                <td className="px-4">
                  <AdminStatusBadge
                    status={eligibleIds.has(e.id) ? 'ready' : 'unavailable'}
                    label={eligibleIds.has(e.id) ? 'Siap distribusi' : 'Belum siap'}
                  />
                </td>
                <td className="px-4">
                  <AdminStatusBadge status={e.status} />
                </td>
                <td className="whitespace-nowrap px-4 text-xs">{formatDateTime(e.updated_at)}</td>
                <td className="px-5">
                  <AdminRowActions>
                  <Link
                    className={adminTableActionClass}
                    href={href({ assessment: e.id, tab: 'overview' })}
                  >
                    Lihat
                  </Link>
                  </AdminRowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
        {!data.exams.length && (
          <AdminEmptyState
            title="Belum ada assessment yang cocok"
            description="Ubah filter atau buat assessment baru."
            action={
              <Link className={adminSecondaryButtonClass} href={href({ new: '1' })}>
                Buat Assessment
              </Link>
            }
          />
        )}
        <AdminPagination
          pathname={PATH}
          params={Object.fromEntries(listQuery)}
          summary={adminPageSummary(data.page, data.exams.length, data.total)}
          noun="assessment"
        />
      </AdminCard>
    </AdminPage>
  )
}
