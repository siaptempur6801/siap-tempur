import AdminMonitoringTable from '@/components/admin/AdminMonitoringTable'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import AdminWorkspaceTabs from '@/components/admin/AdminWorkspaceTabs'
import MonitoringAssignmentScope from '@/components/admin/domain/monitoring/MonitoringAssignmentScope'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import Link from '@/components/admin/navigation/AdminLink'
import { adminPageSummary } from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { PERMISSIONS } from '@/src/auth/permissions'
import { getAdminMonitoring, type MonitoringParams } from '@/src/services/admin-monitoring.service'
import { authorizationService } from '@/src/services/authorization.service'

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<MonitoringParams>
}) {
  const params = await searchParams
  const actor = await authorizationService.requireAuthenticated()
  const canEvent = actor.permissions.includes(PERMISSIONS.EVENT_MANAGE)
  const canOrg = actor.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE)
  const canReport = actor.permissions.includes(PERMISSIONS.REPORT_READ)

  if (
    (params.event && !canEvent) ||
    (params.org && !canOrg) ||
    (!canEvent && !canOrg && !canReport)
  ) {
    return (
      <AdminEmptyState
        title="Akses tidak tersedia"
        description="Hubungi pengelola untuk akses monitoring distribusi."
      />
    )
  }

  if (!canEvent && !canOrg) {
    return (
      <AdminPage>
        <AdminBreadcrumbs items={[{ label: 'Monitoring' }]} />
        <AdminPageHeader
          title="Monitoring"
          description="Ringkasan aktivitas dan laporan operasional."
        />
        <AdminWorkspaceTabs workspace="monitoring" permissions={actor.permissions} />
        <AdminCard>
          <AdminEmptyState
            title="Buka laporan"
            description="Lihat ringkasan aktivitas dan transaksi sesuai akses akun."
            action={
              <Link className={adminSecondaryButtonClass} href="/admin/monitoring/reports">
                Lihat laporan
              </Link>
            }
          />
        </AdminCard>
      </AdminPage>
    )
  }

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const self = `/admin/monitoring?${query}`

  if (!params.event && !(params.org && params.batch)) {
    return (
      <AdminPage>
        <AdminBreadcrumbs items={[{ label: 'Monitoring' }]} />
        <AdminPageHeader
          title="Monitoring"
          description="Pantau peserta melalui Event atau Instansi, dan buka laporan untuk ringkasan."
        />
        <AdminWorkspaceTabs workspace="monitoring" permissions={actor.permissions} />
        <AdminCard>
          <AdminEmptyState
            title="Pilih Event atau Instansi"
            description="Buka workspace distribusi, lalu pilih Pantau Peserta. Ringkasan tersedia di tab Laporan."
            action={
              <div className="flex flex-wrap gap-3">
                {canEvent ? (
                  <Link
                    className={adminSecondaryButtonClass}
                    href={params.exam ? `/admin/events?exam=${params.exam}` : '/admin/events'}
                  >
                    Event
                  </Link>
                ) : null}
                {canOrg ? (
                  <Link
                    className={adminSecondaryButtonClass}
                    href={
                      params.exam
                        ? `/admin/organizations?exam=${params.exam}`
                        : '/admin/organizations'
                    }
                  >
                    Instansi
                  </Link>
                ) : null}
              </div>
            }
          />
        </AdminCard>
      </AdminPage>
    )
  }

  let data
  try {
    data = await getAdminMonitoring(params)
  } catch {
    return <AdminErrorState noun="monitoring" retryHref={self} />
  }

  const context = data.context
  const hasNoBatchAssignments = Boolean(context.batch && context.assignments.length === 0)
  const back = adminReturnUrl(
    params.returnTo,
    context.event
      ? `/admin/events?event=${context.event.id}`
      : `/admin/organizations?org=${context.organization!.id}&batch=${context.batch!.id}&tab=assignments`,
  )
  const breadcrumbs = context.event
    ? [
        { label: 'Event', href: '/admin/events' },
        { label: context.event.title, href: back },
      ]
    : [
        { label: 'Instansi', href: '/admin/organizations' },
        {
          label: context.organization!.name,
          href: `/admin/organizations?org=${context.organization!.id}`,
        },
        { label: context.batch!.name, href: back },
        ...(context.assignment
          ? [{ label: context.assignment.exam_title || 'Penugasan', href: back }]
          : []),
      ]
  const metrics = [
    [
      context.event ? 'Peserta event' : context.assignment ? 'Peserta ditugaskan' : 'Peserta batch',
      data.summary.total,
    ],
    ['Belum Mulai', data.summary.notStarted],
    ['Sedang Mengerjakan', data.summary.inProgress],
    ['Selesai', data.summary.completed],
  ] as const
  const queryParams = Object.fromEntries(query)

  return (
    <AdminPage>
      <AdminBreadcrumbs items={[...breadcrumbs, { label: 'Monitoring' }]} />
      <AdminPageHeader
        title="Monitoring Peserta"
        description={`${context.title}${context.batch ? ` · ${context.batch.name}` : ''}${context.assignment ? ` · ${context.assignment.exam_title}` : ''}`}
        action={
          <Link className={adminSecondaryButtonClass} href={self}>
            Perbarui
          </Link>
        }
      />
      <AdminWorkspaceTabs workspace="monitoring" permissions={actor.permissions} />

      {context.batch && context.assignments.length > 0 ? (
        <MonitoringAssignmentScope
          pathname="/admin/monitoring"
          params={params}
          assignments={context.assignments}
          returnTo={back}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {context.batch ? (
          <Link
            prefetch={false}
            className={adminSecondaryButtonClass}
            href={`/admin/organizations/export?org=${context.organization!.id}&batch=${context.batch.id}`}
          >
            Unduh XLSX
          </Link>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Diperbarui saat halaman dimuat. Pilih Perbarui untuk progres terbaru.
        </p>
      </div>

      {hasNoBatchAssignments ? (
        <AdminCard>
          <AdminEmptyState
            title="Belum ada penugasan assessment"
            description="Tugaskan assessment ke batch ini sebelum memantau progres peserta."
            action={
              <Link
                className={adminPrimaryButtonClass}
                href={`/admin/organizations/${context.organization!.id}/batches/${context.batch!.id}/assignments`}
              >
                Tugaskan assessment
              </Link>
            }
          />
        </AdminCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value]) => (
              <AdminMetric key={label} label={label} value={value} />
            ))}
          </div>

          <AdminTableToolbar
            pathname="/admin/monitoring"
            search={params.q || ''}
            status={params.status}
            placeholder="Cari peserta..."
            statusOptions={[
              { value: 'not_started', label: 'Belum Mulai' },
              { value: 'in_progress', label: 'Sedang Mengerjakan' },
              { value: 'completed', label: 'Selesai' },
            ]}
            hiddenFields={{
              event: params.event,
              org: params.org,
              batch: params.batch,
              assignment: params.assignment,
              exam: params.exam,
              returnTo: back,
            }}
            resultCount={data.total}
          />

          <AdminCard>
            {data.rows.length ? (
              <AdminMonitoringTable data={data} params={queryParams} returnTo={self} />
            ) : (
              <AdminEmptyState
                title="Belum ada peserta yang cocok"
                description="Ubah filter, atau buka distribusi untuk mengelola peserta."
                action={
                  <Link className={adminSecondaryButtonClass} href={back}>
                    Kelola distribusi
                  </Link>
                }
              />
            )}
            {data.total > 0 ? (
              <AdminPagination
                pathname="/admin/monitoring"
                params={queryParams}
                summary={adminPageSummary(data.page, data.rows.length, data.total)}
                noun="peserta"
              />
            ) : null}
          </AdminCard>
        </>
      )}
    </AdminPage>
  )
}
