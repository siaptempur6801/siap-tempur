import { adminRoutes } from '@/lib/admin-routes'
import {
  archiveEventAction,
  deleteEventSessionAction,
  saveEventSessionAction,
} from '@/app/actions/admin-v2'
import AdminModal from '@/components/admin/AdminModal'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminRowActions,
  AdminSectionHeading,
  AdminStatusBadge,
  AdminTh,
  adminDangerButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import AssessmentSelector from '@/components/admin/AssessmentSelector'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import EventWorkflowForm from '@/components/admin/EventWorkflowForm'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import { formatDateTime, formatLocalDateTimeInput } from '@/lib/admin-format'
import { adminEventStatusLabel } from '@/lib/admin-event-format'
import { adminOffset, adminPageSummary, parseAdminPage } from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import { adminResourceCounts } from '@/src/services/admin-resource-counts.service'
import { assessmentOptions } from '@/src/services/admin-assessment-ux.service'
import { authorizationService } from '@/src/services/authorization.service'
import { catalogContextService } from '@/src/services/catalog-context.service'
import Link from '@/components/admin/navigation/AdminLink'
import { ChevronDown } from 'lucide-react'
import { EventMonitoring, EventParticipants, EventTicketLink } from './EventWorkspacePanels'

export type EventWorkspaceParams = {
  program?: string
  track?: string
  edit?: string
  event?: string
  tab?: string
  monitoring_section?: string
  settings_section?: string
  ok?: string
  error?: string
  new?: string
  exam?: string
  session_event?: string
  q?: string
  status?: string
  page?: string
  participant_page?: string
  participant_search?: string
  participant_status?: string
  returnTo?: string
  selector_search?: string
  selector_domain?: string
  selector_type?: string
  selector_level?: string
  selector_page?: string
}
const PATH = adminRoutes.events
function lifecycle(e: { status: string; starts_at: string; ends_at: string }) {
  const status = e.status.toLowerCase()
  if (['draft', 'archived', 'closed'].includes(status)) return status
  const now = Date.now()
  return Date.parse(e.ends_at) < now
    ? 'closed'
    : Date.parse(e.starts_at) > now
      ? 'scheduled'
      : 'live'
}
export default async function EventsRoute({
  searchParams,
}: {
  searchParams: Promise<EventWorkspaceParams>
}) {
  const params = await searchParams
  const actor = await authorizationService.getCurrentAuthorization()
  if (!actor?.permissions.includes(PERMISSIONS.EVENT_MANAGE))
    return (
      <AdminEmptyState
        title="Akses tidak tersedia"
        description="Hubungi pengelola untuk akses Event."
      />
    )
  const program = params.program || 'CPNS'
  const track = params.track || (program === 'TKA' ? 'SMP' : 'SKD')
  const context = await catalogContextService.resolve({ programCode: program, trackCode: track })
  const db = await createAdminClient()
  const listQuery = new URLSearchParams({ program, track })
  for (const k of ['q', 'status', 'page'] as const) if (params[k]) listQuery.set(k, params[k])
  const listHref = `${PATH}?${listQuery}`
  const href = (extra: Record<string, string>) => {
    const q = new URLSearchParams(listQuery)
    for (const [k, v] of Object.entries(extra)) q.set(k, v)
    return `${PATH}?${q}`
  }
  const id = params.event || params.edit || params.session_event
  const page = parseAdminPage(params.page)
  let query = db
    .from('events')
    .select(
      'id, code, title, slug, description, flyer_image_url, status, registration_start, registration_end, starts_at, ends_at, event_sessions(id, name, exam_id, starts_at, ends_at, capacity, status, exams(title))',
      { count: 'exact' },
    )
    .eq('program_id', context.program.id)
    .eq('track_id', context.track.id)
    .order('starts_at', { ascending: false })
  if (id) query = query.eq('id', id)
  else {
    if (params.q) query = query.ilike('title', `%${escapePostgrestValue(params.q)}%`)
    const now = new Date().toISOString()
    if (['upcoming', 'active', 'ended'].includes(params.status || '')) {
      query = query.not('status', 'in', '(draft,DRAFT,archived,ARCHIVED)')
      if (params.status === 'upcoming')
        query = query.not('status', 'in', '(closed,CLOSED)').gt('starts_at', now)
      if (params.status === 'active')
        query = query
          .not('status', 'in', '(closed,CLOSED)')
          .lte('starts_at', now)
          .gte('ends_at', now)
      if (params.status === 'ended') query = query.or(`ends_at.lt.${now},status.in.(closed,CLOSED)`)
    } else if (params.status) query = query.eq('status', params.status)
  }
  const { data, count, error } = await query.range(
    id ? 0 : adminOffset(page),
    id ? 0 : adminOffset(page) + 24,
  )
  if (error) return <AdminErrorState noun="event" retryHref={listHref} />
  const events = data ?? []
  const selected = id ? events[0] : undefined
  const needsAssessmentSelector =
    params.new === '1' || (params.tab === 'settings' && params.settings_section === 'sessions')
  const selector = needsAssessmentSelector
    ? await assessmentOptions({
        search: params.selector_search,
        domain: params.selector_domain === 'all' ? undefined : params.selector_domain || program,
        type: params.selector_type,
        level: params.selector_level,
        page: params.selector_page,
        selectedId: params.exam,
      })
    : { options: [], total: 0, page: 1 }
  if (params.new === '1')
    return (
      <AdminPage>
        <AdminBreadcrumbs items={[{ label: 'Event', href: listHref }, { label: 'Buat Event' }]} />
        <AdminPageHeader
          title="Buat Event"
          description="Siapkan event, pilih assessment, lalu tinjau jadwal dan akses."
        />
        <AdminFeedbackBanner error={params.error} />
        <EventWorkflowForm
          options={selector.options}
          selectedId={params.exam}
          total={selector.total}
          page={selector.page}
          program={program}
          track={track}
          returnTo={adminReturnUrl(params.returnTo, listHref)}
        />
      </AdminPage>
    )
  const participantCounts = await adminResourceCounts(
    'event_participants',
    events.map((e) => String(e.id)),
  )
  if (id && !selected)
    return (
      <AdminEmptyState
        title="Event tidak ditemukan"
        action={
          <Link className={adminSecondaryButtonClass} href={listHref}>
            Kembali ke Event
          </Link>
        }
      />
    )
  if (selected) {
    const e = selected
    const tab = params.edit ? 'settings' : params.tab || 'overview'
    const settingsSection = params.settings_section === 'sessions' ? 'sessions' : 'event'
    const sessions = e.event_sessions as unknown as {
      id: string
      name: string
      exam_id: string
      starts_at: string
      ends_at: string
      capacity: number
      status: string
      exams: { title: string }
    }[]
    const currentStatus = lifecycle(e)
    const canReadReports = actor.permissions.includes(PERMISSIONS.REPORT_READ)
    const detail = (nextTab: string, extra: Record<string, string> = {}) =>
      href({
        event: e.id,
        tab: nextTab,
        ...extra,
        ...(nextTab === 'participants'
          ? {
              participant_search: params.participant_search || '',
              participant_status: params.participant_status || '',
              participant_page: params.participant_page || '1',
            }
          : {}),
      })
    const settingsHref = (section: 'event' | 'sessions') =>
      detail('settings', { settings_section: section })
    const primaryAction =
      currentStatus === 'archived' ? (
        <Link className={adminPrimaryButtonClass} href={settingsHref('event')}>
          Tinjau status event
        </Link>
      ) : currentStatus === 'draft' ? (
        <Link
          className={adminPrimaryButtonClass}
          href={sessions.length ? settingsHref('event') : settingsHref('sessions')}
        >
          {sessions.length ? 'Lanjutkan pengaturan' : 'Atur sesi & assessment'}
        </Link>
      ) : currentStatus === 'scheduled' && !sessions.length ? (
        <Link className={adminPrimaryButtonClass} href={settingsHref('sessions')}>
          Atur sesi & assessment
        </Link>
      ) : currentStatus === 'scheduled' ? (
        <Link className={adminPrimaryButtonClass} href={detail('participants')}>
          Lihat peserta
        </Link>
      ) : currentStatus === 'live' ? (
        <Link className={adminPrimaryButtonClass} href={detail('monitoring')}>
          Pantau event
        </Link>
      ) : currentStatus === 'closed' ? (
        canReadReports ? (
          <Link
            className={adminPrimaryButtonClass}
            href={detail('monitoring', { monitoring_section: 'reports' })}
          >
            Lihat laporan
          </Link>
        ) : (
          <Link className={adminPrimaryButtonClass} href={detail('participants')}>
            Lihat peserta
          </Link>
        )
      ) : null
    const eventTabs = [
      ['overview', 'Ringkasan', detail('overview')],
      ['participants', 'Peserta', detail('participants')],
      ['monitoring', 'Monitoring', detail('monitoring')],
      ...(program === 'CPNS'
        ? [['leaderboard', 'Papan peringkat', detail('leaderboard')] as string[]]
        : []),
      ['settings', 'Pengaturan', settingsHref('event')],
    ].map(([id, label, tabHref]) => ({ id, label, href: tabHref }))
    const sessionTabActions = (
      <div className="flex flex-wrap items-center gap-2">
        <AdminModal
          title="Buat sesi baru"
          description="Tambahkan assessment dan atur jadwal serta batas peserta untuk sesi baru."
          triggerLabel="Buat sesi baru"
          size="wide"
        >
          <form action={saveEventSessionAction} className="flex flex-col gap-5">
            <input type="hidden" name="program_code" value={program} />
            <input type="hidden" name="track_code" value={track} />
            <input type="hidden" name="event_id" value={e.id} />
            <input type="hidden" name="return_to" value={settingsHref('sessions')} />
            <div className="grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AssessmentSelector
                  options={selector.options}
                  selectedId={params.exam}
                  total={selector.total}
                  page={selector.page}
                  maxListHeightClass="max-h-64"
                />
              </div>
              <AdminField
                label="Nama sesi"
                fieldId="event-session-name"
                hint="Bedakan sesi berdasarkan jadwal, kelompok, atau assessment."
              >
                <input
                  id="event-session-name"
                  className={adminInputClass}
                  name="name"
                  required
                  defaultValue={`Sesi ${sessions.length + 1}`}
                />
              </AdminField>
              <AdminField
                label="Batas peserta"
                fieldId="event-session-capacity"
                hint="Jumlah maksimal peserta sesi ini."
              >
                <input
                  id="event-session-capacity"
                  className={adminInputClass}
                  name="capacity"
                  type="number"
                  min={1}
                  required
                  defaultValue="100"
                />
              </AdminField>
              <AdminField label="Mulai sesi" fieldId="event-session-start">
                <input
                  id="event-session-start"
                  className={adminInputClass}
                  name="starts_at"
                  type="datetime-local"
                  required
                  defaultValue={formatLocalDateTimeInput(e.starts_at)}
                />
              </AdminField>
              <AdminField label="Selesai sesi" fieldId="event-session-end">
                <input
                  id="event-session-end"
                  className={adminInputClass}
                  name="ends_at"
                  type="datetime-local"
                  required
                  defaultValue={formatLocalDateTimeInput(e.ends_at)}
                />
              </AdminField>
            </div>
            <input type="hidden" name="status" value="scheduled" />
            <div className="sticky bottom-0 z-10 -mx-5 flex justify-end border-t border-border bg-card px-5 py-4 sm:-mx-6 sm:px-6">
              <AdminSubmitButton>Buat sesi</AdminSubmitButton>
            </div>
          </form>
        </AdminModal>
        <EventTicketLink
          eventId={e.id}
          sessions={sessions}
          program={program}
          track={track}
          returnTo={settingsHref('sessions')}
        />
      </div>
    )

    return (
      <AdminPage>
        <AdminBreadcrumbs items={[{ label: 'Event', href: listHref }, { label: e.title }]} />
        <AdminPageHeader
          title={e.title}
          description={
            sessions.map((session) => session.exams?.title || session.name).join(' · ') ||
            'Assessment belum ditentukan'
          }
          action={primaryAction}
        />
        <div className="flex flex-wrap items-center gap-3">
          <AdminStatusBadge status={currentStatus} label={adminEventStatusLabel(currentStatus)} />
          <span className="text-sm text-muted-foreground">
            {program} · {track}
          </span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(e.starts_at)} — {formatDateTime(e.ends_at)}
          </span>
          {e.status !== 'archived' && (
            <details className="relative">
              <summary className={`${adminSecondaryButtonClass} list-none cursor-pointer`}>
                <span className="flex items-center gap-1.5">
                  Aksi lainnya
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
              </summary>
              <form
                action={archiveEventAction}
                className="absolute left-0 top-full z-10 mt-1 min-w-40 rounded-md border border-border bg-card p-2 shadow-md"
              >
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="program_code" value={program} />
                <input type="hidden" name="track_code" value={track} />
                <input type="hidden" name="return_to" value={detail('overview')} />
                <ConfirmSubmit
                  message={`Arsipkan ${e.title}?`}
                  confirmLabel="Arsipkan Event"
                  trigger={
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger-muted"
                    >
                      Arsipkan Event
                    </button>
                  }
                />
              </form>
            </details>
          )}
        </div>
        <AdminFeedbackBanner ok={params.ok} error={params.error} />
        <AdminTabs active={tab} tabs={eventTabs} />

        {tab === 'overview' && (
          <>
            <AdminCard className="p-5 sm:p-6">
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    'Assessment',
                    sessions.map((session) => session.exams?.title || session.name).join(', ') ||
                      'Belum ada sesi',
                  ],
                  [
                    'Registrasi',
                    `${e.registration_start ? formatDateTime(e.registration_start) : 'Terbuka'} — ${e.registration_end ? formatDateTime(e.registration_end) : 'Tanpa batas akhir'}`,
                  ],
                  ['Jadwal event', `${formatDateTime(e.starts_at)} — ${formatDateTime(e.ends_at)}`],
                  ['Peserta', String(participantCounts.get(e.id) || 0)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </AdminCard>
            {sessions.length ? (
              <AdminCard className="p-5 sm:p-6">
                <AdminSectionHeading
                  title="Sesi assessment"
                  description={`${sessions.length} sesi terhubung ke event ini.`}
                  action={
                    <Link className={adminSecondaryButtonClass} href={settingsHref('sessions')}>
                      Kelola sesi
                    </Link>
                  }
                />
                <div className="mt-4 divide-y divide-border rounded-md border border-border">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex flex-col gap-4 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="min-w-0 break-words text-sm font-semibold">
                          {session.name}
                        </h3>
                        <AdminStatusBadge
                          status={session.status}
                          label={adminEventStatusLabel(session.status)}
                        />
                      </div>
                      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="min-w-0">
                          <dt className="text-xs font-medium text-muted-foreground">Assessment</dt>
                          <dd className="mt-1 break-words text-sm">
                            {session.exams?.title || 'Belum dipilih'}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs font-medium text-muted-foreground">
                            Jadwal sesi · WIB
                          </dt>
                          <dd className="mt-1 break-words text-sm">
                            {formatDateTime(session.starts_at)} — {formatDateTime(session.ends_at)}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs font-medium text-muted-foreground">
                            Batas peserta
                          </dt>
                          <dd className="mt-1 break-words text-sm">
                            {session.capacity
                              ? `Maksimal ${session.capacity} peserta`
                              : 'Belum ditentukan'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </AdminCard>
            ) : (
              <AdminEmptyState
                title="Assessment belum ditambahkan"
                description="Hubungkan assessment ke sesi agar peserta dapat mengikuti event."
                action={
                  <Link className={adminPrimaryButtonClass} href={settingsHref('sessions')}>
                    Atur sesi event
                  </Link>
                }
              />
            )}
          </>
        )}

        {tab === 'participants' && (
          <EventParticipants
            eventId={e.id}
            title={e.title}
            params={params}
            returnTo={detail('participants')}
          />
        )}

        {tab === 'monitoring' && (
          <EventMonitoring
            eventId={e.id}
            title={e.title}
            program={program}
            track={track}
            section={
              canReadReports && params.monitoring_section === 'reports' ? 'reports' : 'overview'
            }
            canReadReports={canReadReports}
            overviewHref={detail('monitoring')}
            reportsHref={detail('monitoring', { monitoring_section: 'reports' })}
            participantsHref={detail('participants')}
          />
        )}

        {program === 'CPNS' && tab === 'leaderboard' && (
          <AdminCard className="p-5 sm:p-6">
            <AdminSectionHeading
              title="Papan peringkat peserta"
              description="Peringkat mengikuti hasil assessment pada event ini."
              action={
                <Link className={adminSecondaryButtonClass} href={`/cpns/live/${e.id}`}>
                  Buka papan peringkat
                </Link>
              }
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Papan peringkat menampilkan hasil publik peserta. Untuk memantau progres dan membuka
              hasil individu, gunakan tab Monitoring.
            </p>
          </AdminCard>
        )}

        {tab === 'settings' && (
          <>
            <div className="flex flex-col gap-4">
              <AdminSectionHeading
                title="Pengaturan event"
                description="Atur informasi, assessment, dan sesi event dari satu tempat."
              />
              <AdminTabs
                active={settingsSection}
                label="Bagian pengaturan event"
                tabs={[
                  { id: 'event', label: 'Informasi event', href: settingsHref('event') },
                  { id: 'sessions', label: 'Sesi & assessment', href: settingsHref('sessions') },
                ]}
              />
            </div>
            {settingsSection === 'event' ? (
              <EventWorkflowForm
                event={e}
                assessmentSummary={sessions
                  .map((session) => session.exams?.title)
                  .filter(Boolean)
                  .join(', ')}
                options={selector.options}
                selectedId={params.exam}
                total={selector.total}
                page={selector.page}
                program={program}
                track={track}
                returnTo={settingsHref('event')}
                showInformationHeading={false}
              />
            ) : (
              <section className="flex flex-col gap-6">
                <AdminSectionHeading
                  title="Sesi event"
                  description="Setiap sesi menghubungkan satu assessment dengan jadwal dan batas peserta."
                  action={sessionTabActions}
                />
                {sessions.length > 0 ? (
                  <ul className="flex flex-col gap-6">
                    {sessions.map((session) => (
                      <li key={session.id} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="min-w-0 break-words text-sm font-semibold">
                              {session.name}
                            </h3>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <AdminStatusBadge
                                status={session.status}
                                label={adminEventStatusLabel(session.status)}
                              />
                              <AdminModal
                                title={`Ubah sesi: ${session.name}`}
                                description="Perubahan hanya berlaku untuk sesi ini."
                                triggerLabel="Ubah sesi"
                                triggerVariant="secondary"
                                size="wide"
                              >
                                <form
                                  action={saveEventSessionAction}
                                  className="flex flex-col gap-5"
                                >
                                  <input type="hidden" name="id" value={session.id} />
                                  <input type="hidden" name="event_id" value={e.id} />
                                  <input type="hidden" name="status" value={session.status} />
                                  <input type="hidden" name="program_code" value={program} />
                                  <input type="hidden" name="track_code" value={track} />
                                  <input
                                    type="hidden"
                                    name="return_to"
                                    value={settingsHref('sessions')}
                                  />
                                  <div className="grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                      <AssessmentSelector
                                        options={selector.options}
                                        selectedId={session.exam_id}
                                        name="exam_id"
                                        total={selector.total}
                                        page={selector.page}
                                        maxListHeightClass="max-h-64"
                                      />
                                    </div>
                                    <AdminField
                                      label="Nama sesi"
                                      fieldId={`session-${session.id}-name`}
                                      hint="Gunakan nama yang membedakan sesi ini."
                                    >
                                      <input
                                        id={`session-${session.id}-name`}
                                        className={adminInputClass}
                                        name="name"
                                        required
                                        defaultValue={session.name}
                                      />
                                    </AdminField>
                                    <AdminField
                                      label="Batas peserta"
                                      fieldId={`session-${session.id}-capacity`}
                                      hint="Maksimal peserta yang dapat mengikuti sesi ini."
                                    >
                                      <input
                                        id={`session-${session.id}-capacity`}
                                        className={adminInputClass}
                                        name="capacity"
                                        type="number"
                                        min={1}
                                        required
                                        defaultValue={session.capacity ?? ''}
                                      />
                                    </AdminField>
                                    <AdminField
                                      label="Mulai sesi"
                                      fieldId={`session-${session.id}-starts`}
                                    >
                                      <input
                                        id={`session-${session.id}-starts`}
                                        className={adminInputClass}
                                        name="starts_at"
                                        type="datetime-local"
                                        required
                                        defaultValue={formatLocalDateTimeInput(session.starts_at)}
                                      />
                                    </AdminField>
                                    <AdminField
                                      label="Selesai sesi"
                                      fieldId={`session-${session.id}-ends`}
                                    >
                                      <input
                                        id={`session-${session.id}-ends`}
                                        className={adminInputClass}
                                        name="ends_at"
                                        type="datetime-local"
                                        required
                                        defaultValue={formatLocalDateTimeInput(session.ends_at)}
                                      />
                                    </AdminField>
                                  </div>
                                  <div className="sticky bottom-0 z-10 -mx-5 flex justify-end border-t border-border bg-card px-5 py-4 sm:-mx-6 sm:px-6">
                                    <AdminSubmitButton>Simpan perubahan sesi</AdminSubmitButton>
                                  </div>
                                </form>
                              </AdminModal>
                              <form action={deleteEventSessionAction}>
                                <input type="hidden" name="id" value={session.id} />
                                <input type="hidden" name="event_id" value={e.id} />
                                <input type="hidden" name="program_code" value={program} />
                                <input type="hidden" name="track_code" value={track} />
                                <input
                                  type="hidden"
                                  name="return_to"
                                  value={settingsHref('sessions')}
                                />
                                <ConfirmSubmit
                                  title="Hapus sesi event?"
                                  message={`Sesi “${session.name}” akan dihapus dari event.`}
                                  detail="Sesi yang sudah memiliki peserta atau terhubung ke tiket tidak dapat dihapus agar riwayat dan akses tetap utuh."
                                  confirmLabel="Hapus sesi"
                                  trigger={
                                    <button type="button" className={adminDangerButtonClass}>
                                      Hapus sesi
                                    </button>
                                  }
                                />
                              </form>
                            </div>
                          </div>
                          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="min-w-0">
                              <dt className="text-xs font-medium text-muted-foreground">
                                Assessment
                              </dt>
                              <dd className="mt-1 break-words text-sm">
                                {session.exams?.title || 'Belum dipilih'}
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs font-medium text-muted-foreground">
                                Jadwal sesi · WIB
                              </dt>
                              <dd className="mt-1 break-words text-sm">
                                {formatDateTime(session.starts_at)} —{' '}
                                {formatDateTime(session.ends_at)}
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs font-medium text-muted-foreground">
                                Batas peserta
                              </dt>
                              <dd className="mt-1 break-words text-sm">
                                {session.capacity
                                  ? `Maksimal ${session.capacity} peserta`
                                  : 'Belum ditentukan'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada sesi yang terhubung. Pilih{' '}
                    <span className="font-medium text-foreground">Buat sesi baru</span> untuk
                    menambahkan sesi pertama.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </AdminPage>
    )
  }
  const hasListFilters = Boolean(params.q || params.status)
  const pageOneQuery = new URLSearchParams(listQuery)
  pageOneQuery.delete('page')
  const pageOneHref = `${PATH}?${pageOneQuery}`
  const resetFiltersHref = `${PATH}?${new URLSearchParams({ program, track })}`
  const emptyTitle = count
    ? 'Tidak ada event di halaman ini'
    : hasListFilters
      ? 'Tidak ada event yang cocok'
      : 'Belum ada event'
  const emptyDescription = count
    ? 'Kembali ke halaman pertama untuk melihat event yang tersedia.'
    : hasListFilters
      ? 'Ubah pencarian atau reset filter untuk melihat event lain.'
      : 'Buat event untuk memilih assessment, mengatur jadwal, dan membuka pendaftaran peserta.'

  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Event' }]} />
      <AdminPageHeader
        title="Event"
        description="Jadwalkan assessment dan pantau pelaksanaannya."
        action={
          <Link className={adminPrimaryButtonClass} href={href({ new: '1' })}>
            Buat Event
          </Link>
        }
      />
      <AdminFeedbackBanner ok={params.ok} error={params.error} />
      <AdminTableToolbar
        pathname={PATH}
        search={params.q || ''}
        placeholder="Cari nama event..."
        status={params.status}
        statusOptions={[
          { value: 'upcoming', label: 'Akan datang' },
          { value: 'active', label: 'Sedang berlangsung' },
          { value: 'ended', label: 'Selesai' },
          { value: 'draft', label: 'Draft' },
        ]}
        program={program}
        track={track}
        resultCount={count || 0}
      />
      <AdminCard>
        {events.length ? (
          <AdminDataTable caption="Daftar event" className="w-full min-w-[800px] text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                {['Event', 'Assessment', 'Jadwal', 'Peserta', 'Status', 'Aksi'].map((column) => (
                  <AdminTh key={column}>{column}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => {
                const eventHref = href({ event: event.id, tab: 'overview' })
                return (
                  <tr key={event.id} data-event-id={event.id} className="hover:bg-muted">
                    <td className="px-5 py-3 font-semibold">
                      <Link
                        className="text-foreground decoration-primary underline-offset-4 hover:text-primary hover:underline"
                        href={eventHref}
                      >
                        {event.title}
                      </Link>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {event.code}
                      </span>
                    </td>
                    <td className="max-w-64 truncate px-4">
                      {(event.event_sessions as unknown as { exams: { title: string } }[])
                        .map((session) => session.exams?.title)
                        .filter(Boolean)
                        .join(', ') || 'Belum ada sesi'}
                    </td>
                    <td className="px-4 text-xs leading-5">
                      {formatDateTime(event.starts_at)}
                      <br />
                      {formatDateTime(event.ends_at)}
                    </td>
                    <td className="px-4">{participantCounts.get(event.id) || 0}</td>
                    <td className="px-4">
                      <AdminStatusBadge
                        status={lifecycle(event)}
                        label={adminEventStatusLabel(lifecycle(event))}
                      />
                    </td>
                    <td className="px-5">
                      <AdminRowActions>
                        <Link className={adminTableActionClass} href={eventHref}>
                          Kelola<span className="sr-only"> {event.title}</span>
                        </Link>
                      </AdminRowActions>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminDataTable>
        ) : (
          <AdminEmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              count ? (
                <Link className={adminSecondaryButtonClass} href={pageOneHref}>
                  Ke halaman pertama
                </Link>
              ) : hasListFilters ? (
                <Link className={adminSecondaryButtonClass} href={resetFiltersHref}>
                  Reset filter
                </Link>
              ) : (
                <Link className={adminPrimaryButtonClass} href={href({ new: '1' })}>
                  Buat Event
                </Link>
              )
            }
          />
        )}
        {events.length ? (
          <AdminPagination
            pathname={PATH}
            params={Object.fromEntries(listQuery)}
            summary={adminPageSummary(page, events.length, count || 0)}
            noun="event"
          />
        ) : null}
      </AdminCard>
    </AdminPage>
  )
}
