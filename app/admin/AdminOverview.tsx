import {Suspense} from 'react'
import DashboardReviewQueue from '@/components/admin/domain/dashboard/DashboardReviewQueue'
import {
AdminCard,
AdminEmptyState,
AdminMetric,
AdminPage,
AdminPageHeader,
AdminSectionHeading,
AdminStatusBadge,
AdminTh,
adminPrimaryButtonClass,
adminSecondaryButtonClass,
adminTableHeadClass
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { formatDateTime } from '@/lib/admin-format'
import { PERMISSIONS } from '@/src/auth/permissions'
import { getAdminDashboard } from '@/src/services/admin-dashboard.service'
import { ArrowRight,CalendarDays } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

export default async function AdminOverview({
  params
}: {
  params: { program?: string; track?: string }
}) {
  const context = {
    programCode: (params.program || 'CPNS').toUpperCase(),
    trackCode: (params.track || (params.program === 'TKA' ? 'SMP' : 'SKD')).toUpperCase()
  }
  let data
  try {
    data = await getAdminDashboard(context)
  } catch {
    return <AdminErrorState noun="Dashboard" retryHref="/admin" />
  }
  const { program, track, review } = data,
    permissions = new Set(data.permissions)
  const href = (path: string, extra: Record<string, string> = {}) =>
    `${path}?${new URLSearchParams({ program, track, ...extra })}`
  const needsReview =
    (review?.counts.editorial || 0) +
    (review?.counts.academic || 0) +
    (review?.counts.technical || 0) +
    (review?.counts.revisionRequired || 0) +
    (review?.counts.draft || 0)
  const metrics = [
    data.canExams
      ? {
          label: 'Assessment aktif',
          value: data.activeAssessments,
          href: href('/admin/assessments', { status: 'active' })
        }
      : null,
    data.canEvents
      ? {
          label: 'Event aktif',
          value: data.activeEvents,
          href: href('/admin/events', { status: 'active' })
        }
      : null,
    data.canExams
      ? { label: 'Pengerjaan hari ini', value: data.attemptsToday, href: href('/admin/monitoring') }
      : null,
    data.canContent
      ? { label: 'Konten perlu tindakan', value: needsReview, href: href('/admin/content/review') }
      : null
  ].filter(Boolean)
  const noSession = data.events.filter((e) => !(e.event_sessions as unknown[])?.length)
  const attention = [
    data.draftAssessments
      ? {
          text: `${data.draftAssessments} assessment masih draft`,
          action: 'Siapkan Assessment',
          href: href('/admin/assessments', { status: 'draft' })
        }
      : null,
    needsReview
      ? {
          text: `${needsReview} konten memerlukan persiapan, review, atau revisi`,
          action: 'Kerjakan Review',
          href: href('/admin/content/review')
        }
      : null,
    ...noSession.map((e) => ({
      text: `${e.title} belum memiliki sesi`,
      action: 'Konfigurasi Event',
      href: href('/admin/events', { event: String(e.id), tab: 'settings' })
    }))
  ].filter(Boolean)
  const action = data.canExams ? (
    <Link className={adminPrimaryButtonClass} href={href('/admin/assessments', { new: '1' })}>
      Buat Assessment
    </Link>
  ) : permissions.has(PERMISSIONS.CONTENT_CREATE) ? (
    <Link className={adminPrimaryButtonClass} href={href('/admin/content/review', { new: '1' })}>
      Buat soal
    </Link>
  ) : undefined
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Dashboard' }]} />
      <AdminPageHeader
        title="Dashboard"
        description={`Pekerjaan yang perlu perhatian dan operasi aktif ${program} / ${track}.`}
        action={action}
      />
      {metrics.length > 0 && (
        <section
          aria-label="Ringkasan operasional"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metrics.map(
            (m) =>
              m && (
                <Link key={m.label} href={m.href} className="rounded-lg focus-visible:outline-2">
                  <AdminMetric label={m.label} value={m.value} />
                </Link>
              )
          )}
        </section>
      )}
      {(data.canExams || data.canEvents || data.canContent) && (
        <section>
          <AdminSectionHeading
            title="Perlu perhatian"
            description="Selesaikan pekerjaan berikut agar distribusi berjalan lancar."
          />
          {attention.length ? (
            <ul className="mt-3 divide-y divide-border">
              {attention.map(
                (item) =>
                  item && (
                    <li key={item.text}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-4 py-3 text-sm"
                      >
                        <span>{item.text}</span>
                        <span className="flex shrink-0 items-center gap-2 font-medium text-info">
                          {item.action}
                          <ArrowRight size={14} aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  )
              )}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Tidak ada pekerjaan yang membutuhkan perhatian saat ini.
            </p>
          )}
        </section>
      )}
      {data.canEvents && (
        <section className="flex flex-col gap-4">
          <AdminSectionHeading
            title="Operasi aktif"
            description="Lima event berjalan atau mendatang terdekat."
            action={
              <Link className={adminSecondaryButtonClass} href={href('/admin/events')}>
                Semua Event
              </Link>
            }
          />
          <AdminCard>
            <AdminDataTable
              caption="Operasi aktif"
              className="min-w-[650px]"
              empty={
                !data.events.length
                  ? {
                      title: 'Belum ada operasi aktif',
                      description: 'Buat Event untuk mendistribusikan assessment ke peserta.',
                      action: (
                        <Link
                          className={adminSecondaryButtonClass}
                          href={href('/admin/events', { new: '1' })}
                        >
                          Buat Event
                        </Link>
                      )
                    }
                  : undefined
              }
            >
              <thead className={adminTableHeadClass}>
                <tr>
                  {['Event', 'Jadwal', 'Status', 'Actions'].map((h) => (
                    <AdminTh key={h}>{h}</AdminTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={String(e.id)}>
                    <td className="font-medium">{String(e.title)}</td>
                    <td className="text-xs">{formatDateTime(e.starts_at)}</td>
                    <td>
                      <AdminStatusBadge
                        status={
                          Date.parse(String(e.starts_at)) > data.nowMs ? 'scheduled' : 'active'
                        }
                      />
                    </td>
                    <td>
                      <Link
                        className={adminSecondaryButtonClass}
                        href={href('/admin/events', {
                          event: String(e.id),
                          tab: 'overview'
                        })}
                      >
                        <CalendarDays size={14} />
                        Lihat Event
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminDataTable>
          </AdminCard>
        </section>
      )}
      {data.canContent && (
        <section className="flex flex-col gap-4">
          <AdminSectionHeading
            title="Pekerjaan konten"
            description="Enam konten terbaru yang membutuhkan tindakan."
            action={
              <Link className={adminSecondaryButtonClass} href={href('/admin/content/review')}>
                Semua Review
              </Link>
            }
          />
          <Suspense fallback={<AdminCard><AdminDataTable caption="Memuat antrean review" loading/></AdminCard>}>
            <DashboardReviewQueue program={program} track={track} queue={data.reviewQueue}/>
          </Suspense>
        </section>
      )}
      {!data.canExams && !data.canEvents && !data.canContent && (
        <AdminEmptyState
          title="Workspace Anda"
          description="Buka pekerjaan sesuai peran Anda melalui sidebar."
          action={
            <div className="flex flex-wrap gap-2">
              {permissions.has(PERMISSIONS.ORDER_READ) && (
                <Link className={adminSecondaryButtonClass} href="/admin/commerce/orders">
                  Orders
                </Link>
              )}
              {permissions.has(PERMISSIONS.USER_READ) && (
                <Link className={adminSecondaryButtonClass} href="/admin/users">
                  Users
                </Link>
              )}
              {permissions.has(PERMISSIONS.ORGANIZATION_MANAGE) && (
                <Link className={adminSecondaryButtonClass} href="/admin/organizations">
                  Instansi
                </Link>
              )}
            </div>
          }
        />
      )}
    </AdminPage>
  )
}
