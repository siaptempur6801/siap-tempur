import { adminRoutes } from '@/lib/admin-routes'
import { linkEventProductAction } from '@/app/actions/admin-v2'
import AdminModal from '@/components/admin/AdminModal'
import AdminMonitoringTable from '@/components/admin/AdminMonitoringTable'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminMetric,
  AdminSectionHeading,
  AdminTh,
  adminTableHeadClass,
  adminInputClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import Link from '@/components/admin/navigation/AdminLink'
import { adminPageSummary } from '@/lib/admin-pagination'
import { createAdminClient } from '@/lib/utils/supabase/server'
import {
  getAdminMonitoring,
  getAdminMonitoringSummary,
} from '@/src/services/admin-monitoring.service'
import type { EventWorkspaceParams } from './EventWorkspace'

const PATH = adminRoutes.events

export async function EventTicketLink({
  eventId,
  sessions,
  program,
  track,
  returnTo,
}: {
  returnTo: string
  eventId: string
  sessions: { id: string; name: string }[]
  program: string
  track: string
}) {
  const db = await createAdminClient()
  const { data, error } = await db
    .from('products')
    .select('id,name,programs!inner(code),tracks!inner(code)')
    .eq('product_type', 'EVENT_TICKET')
    .in('status', ['DRAFT', 'ACTIVE'])
    .eq('programs.code', program)
    .eq('tracks.code', track)
    .limit(25)
  if (error || !data?.length || !sessions.length) return null
  return (
    <AdminModal title="Hubungkan tiket" triggerLabel="Hubungkan tiket" triggerVariant="secondary">
      <form action={linkEventProductAction} className="space-y-4">
        <input type="hidden" name="return_to" value={returnTo} />
        <p className="text-sm text-muted-foreground">
          Hubungkan tiket Draft ke sesi, kemudian aktifkan dari Products setelah readiness
          terpenuhi.
        </p>
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="program_code" value={program} />
        <input type="hidden" name="track_code" value={track} />
        <AdminField label="Sesi">
          <select className={adminInputClass} name="session_id">
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Produk tiket">
          <select className={adminInputClass} name="product_id">
            {data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminSubmitButton>Hubungkan tiket</AdminSubmitButton>
      </form>
    </AdminModal>
  )
}

export async function EventParticipants({
  eventId,
  title,
  params,
  returnTo,
}: {
  eventId: string
  title: string
  params: EventWorkspaceParams
  returnTo: string
}) {
  let data: Awaited<ReturnType<typeof getAdminMonitoring>>
  try {
    data = await getAdminMonitoring({
      event: eventId,
      q: params.participant_search,
      status: params.participant_status,
      page: params.participant_page,
    })
  } catch {
    return <AdminErrorState noun="peserta event" retryHref={returnTo} />
  }
  const query = {
    program: params.program || 'CPNS',
    track: params.track || (params.program === 'TKA' ? 'SMP' : 'SKD'),
    event: eventId,
    tab: 'participants',
    q: params.q || '',
    status: params.status || '',
    participant_search: params.participant_search || '',
    participant_status: params.participant_status || '',
    participant_page: String(data.page),
  }
  const hasFilters = Boolean(params.participant_search || params.participant_status)
  const resetQuery = new URLSearchParams({
    program: query.program,
    track: query.track,
    event: eventId,
    tab: 'participants',
  })
  const pageOneQuery = new URLSearchParams(
    Object.entries(query).filter(([, value]) => Boolean(value)),
  )
  pageOneQuery.delete('participant_page')
  const resetHref = `${PATH}?${resetQuery}`
  const pageOneHref = `${PATH}?${pageOneQuery}`
  const emptyTitle = data.total
    ? 'Tidak ada peserta di halaman ini'
    : hasFilters
      ? 'Tidak ada peserta yang cocok'
      : 'Belum ada peserta'
  const emptyDescription = data.total
    ? 'Kembali ke halaman pertama untuk melihat peserta yang tersedia.'
    : hasFilters
      ? 'Ubah pencarian atau reset filter untuk melihat peserta lain.'
      : 'Peserta akan tampil setelah mendaftar ke event ini.'

  return (
    <>
      <AdminSectionHeading
        title="Daftar peserta"
        description={`Peserta terdaftar pada ${title}, termasuk status pengerjaan dan hasil yang tersedia.`}
      />
      <AdminTableToolbar
        pathname={PATH}
        searchName="participant_search"
        statusName="participant_status"
        search={params.participant_search || ''}
        placeholder="Cari nama atau email peserta..."
        hiddenFields={{
          ...query,
          participant_page: undefined,
          participant_search: undefined,
          participant_status: undefined,
        }}
        status={params.participant_status}
        statusOptions={[
          { value: 'not_started', label: 'Belum Mulai' },
          { value: 'in_progress', label: 'Sedang Mengerjakan' },
          { value: 'completed', label: 'Selesai' },
        ]}
        resultCount={data.total}
      />
      <AdminCard>
        {data.rows.length ? (
          <>
            <AdminMonitoringTable
              caption={`Peserta ${title}`}
              data={data}
              params={{ event: eventId }}
              returnTo={returnTo}
            />
            <AdminPagination
              pageKey="participant_page"
              pathname={PATH}
              params={query}
              summary={adminPageSummary(data.page, data.rows.length, data.total)}
              noun="peserta"
            />
          </>
        ) : (
          <AdminEmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              data.total ? (
                <Link className={adminSecondaryButtonClass} href={pageOneHref}>
                  Ke halaman pertama
                </Link>
              ) : hasFilters ? (
                <Link className={adminSecondaryButtonClass} href={resetHref}>
                  Reset filter
                </Link>
              ) : undefined
            }
          />
        )}
      </AdminCard>
    </>
  )
}

export async function EventMonitoring({
  eventId,
  title,
  program,
  track,
  section,
  canReadReports,
  overviewHref,
  reportsHref,
  participantsHref,
}: {
  eventId: string
  title: string
  program: string
  track: string
  section: 'overview' | 'reports'
  canReadReports: boolean
  overviewHref: string
  reportsHref: string
  participantsHref: string
}) {
  let data: Awaited<ReturnType<typeof getAdminMonitoringSummary>>
  try {
    data = await getAdminMonitoringSummary({ event: eventId }, canReadReports)
  } catch {
    return (
      <AdminErrorState
        noun={section === 'reports' ? 'laporan event' : 'monitoring event'}
        retryHref={section === 'reports' ? reportsHref : overviewHref}
      />
    )
  }
  const tabs = [
    { id: 'overview', label: 'Ringkasan', href: overviewHref },
    ...(canReadReports ? [{ id: 'reports', label: 'Laporan', href: reportsHref }] : []),
  ]
  const exportHref = `/admin/monitoring/export?${new URLSearchParams({ event: eventId, program, track })}`
  const report = data.report
  return (
    <>
      <AdminSectionHeading
        title={section === 'reports' ? 'Laporan event' : 'Monitoring event'}
        description={
          section === 'reports'
            ? `Penyelesaian dan distribusi nilai peserta untuk ${title}.`
            : `Ringkasan pelaksanaan dan progres peserta untuk ${title}.`
        }
        action={
          section === 'reports' ? (
            <Link prefetch={false} className={adminSecondaryButtonClass} href={exportHref}>
              Unduh laporan CSV
            </Link>
          ) : (
            <Link className={adminSecondaryButtonClass} href={participantsHref}>
              Lihat peserta
            </Link>
          )
        }
      />
      <AdminTabs active={section} label="Bagian monitoring event" tabs={tabs} />
      {section === 'overview' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Terdaftar', data.summary.total],
              ['Belum Mulai', data.summary.notStarted],
              ['Sedang Mengerjakan', data.summary.inProgress],
              ['Selesai', data.summary.completed],
            ].map(([label, value]) => (
              <AdminMetric key={String(label)} label={String(label)} value={Number(value)} />
            ))}
          </div>
          {canReadReports && report && (
            <AdminCard className="p-5">
              <AdminSectionHeading
                title="Penyelesaian assessment"
                description="Completion dan distribusi nilai tersedia di Laporan."
                action={
                  <Link className={adminSecondaryButtonClass} href={reportsHref}>
                    Buka laporan
                  </Link>
                }
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <AdminMetric
                  label="Completion"
                  value={report.completionRate === null ? '—' : `${report.completionRate}%`}
                />
                <AdminMetric label="Hasil dengan skor" value={report.scored} />
              </div>
            </AdminCard>
          )}
        </>
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetric label="Peserta" value={data.summary.total} />
            <AdminMetric label="Selesai" value={data.summary.completed} />
            <AdminMetric
              label="Completion"
              value={report.completionRate === null ? '—' : `${report.completionRate}%`}
            />
            <AdminMetric label="Hasil dengan skor" value={report.scored} />
          </div>
          <AdminCard className="p-5">
            <AdminSectionHeading
              title="Distribusi nilai"
              description="Persentase tersimpan dari pengerjaan terakhir setiap peserta yang menyelesaikan assessment."
            />
            {report.bands.some((band) => band.count > 0) ? (
              <div className="mt-4">
                <AdminDataTable
                  caption="Distribusi nilai event"
                  className="w-full min-w-[420px] text-sm"
                >
                  <thead className={adminTableHeadClass}>
                    <tr>
                      <AdminTh>Persentase nilai</AdminTh>
                      <AdminTh>Peserta selesai</AdminTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.bands.map((band) => (
                      <tr key={band.label}>
                        <td className="px-5 py-3">{band.label}</td>
                        <td className="px-5 py-3">{band.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </AdminDataTable>
              </div>
            ) : (
              <AdminEmptyState
                title="Belum ada hasil selesai"
                description="Distribusi nilai akan muncul setelah peserta menyelesaikan assessment."
                action={
                  <Link className={adminSecondaryButtonClass} href={participantsHref}>
                    Lihat peserta
                  </Link>
                }
              />
            )}
          </AdminCard>
        </>
      ) : (
        <AdminErrorState noun="laporan event" retryHref={reportsHref} />
      )}
    </>
  )
}
