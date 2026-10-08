import {
AdminCard,
AdminEmptyState,
AdminMetric,
AdminPage,
AdminPageHeader,
AdminTh,
adminSecondaryButtonClass,
adminTableHeadClass
} from '@/components/admin/AdminUi'
import AdminWorkspaceTabs from '@/components/admin/AdminWorkspaceTabs'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { getAdminMonitoringSummary,type MonitoringParams } from '@/src/services/admin-monitoring.service'
import Link from '@/components/admin/navigation/AdminLink'
export async function MonitoringReport({
  params,
  permissions
}: {
  params: MonitoringParams
  permissions: string[]
}) {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => !!entry[1])
  )
  let data: Awaited<ReturnType<typeof getAdminMonitoringSummary>>
  try {
    data = await getAdminMonitoringSummary(params,true)
  } catch {
    return <AdminErrorState noun="Reports distribusi" retryHref={`/admin/monitoring/reports?${query}`} />
  }
  if (!data.report) return <AdminErrorState noun="Reports distribusi" retryHref={`/admin/monitoring/reports?${query}`} />
  const report=data.report
  const c = data.context
  const crumbs = c.event
    ? [
        { label: 'Event', href: `/admin/events?event=${c.event.id}` },
        { label: c.event.title }
      ]
    : [
        { label: 'Instansi', href: `/admin/organizations?org=${c.organization!.id}` },
        { label: c.title },
        { label: c.batch!.name },
        ...(c.assignment ? [{ label: c.assignment.exam_title || 'Assessment' }] : [])
      ]
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[...crumbs, { label: 'Reports' }]} />
      <AdminPageHeader
        title="Reports"
        description={`${c.title}${c.batch ? ` · ${c.batch.name}` : ''}${c.assignment ? ` · ${c.assignment.exam_title}` : ''}`}
        action={
          <Link
            prefetch={false}
            className={adminSecondaryButtonClass}
            href={`/admin/monitoring/export?${query}`}
          >
            Export CSV
          </Link>
        }
      />
      <AdminWorkspaceTabs workspace="monitoring" permissions={permissions} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Peserta" value={data.summary.total} />
        <AdminMetric label="Selesai" value={data.summary.completed} />
        <AdminMetric
          label="Completion"
          value={report.completionRate === null ? '—' : `${report.completionRate}%`}
        />
        <AdminMetric label="Hasil dengan skor" value={report.scored} />
      </div>
      <AdminCard className="p-5">
        <h2 className="mb-3 font-semibold">Distribusi nilai</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Persentase tersimpan dari pengerjaan terakhir setiap peserta. Ringkasan mencakup seluruh
          peserta dalam distribusi ini.
        </p>
      {report.bands.some((band) => band.count > 0) ? <AdminDataTable caption="Distribusi persentase nilai">
          <thead className={adminTableHeadClass}>
            <tr>
              <AdminTh>Persentase nilai</AdminTh>
              <AdminTh>Peserta selesai</AdminTh>
            </tr>
          </thead>
          <tbody>
            {report.bands.map((b) => (
              <tr key={b.label}>
                <td>{b.label}</td>
                <td>{b.count}</td>
              </tr>
            ))}
          </tbody>
      </AdminDataTable> : <AdminEmptyState title="Belum ada hasil selesai" description="Distribusi nilai akan muncul setelah peserta menyelesaikan assessment." />}
      </AdminCard>
      <Link className={adminSecondaryButtonClass} href={`/admin/monitoring?${query}`}>
        Lihat peserta di Monitoring
      </Link>
    </AdminPage>
  )
}
