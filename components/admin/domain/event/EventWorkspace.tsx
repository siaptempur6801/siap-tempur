import { adminRoutes } from '@/lib/admin-routes'
import { archiveEventAction,linkEventProductAction,saveEventSessionAction } from '@/app/actions/admin-v2'
import AdminModal from '@/components/admin/AdminModal'
import AdminMonitoringTable from '@/components/admin/AdminMonitoringTable'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import { AdminCard,AdminEmptyState,AdminFeedbackBanner,AdminField,AdminPage,AdminPageHeader,AdminStatusBadge,AdminTh,adminInputClass,adminPrimaryButtonClass,adminSecondaryButtonClass,adminTableHeadClass } from '@/components/admin/AdminUi'
import AssessmentSelector from '@/components/admin/AssessmentSelector'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import EventWorkflowForm from '@/components/admin/EventWorkflowForm'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import { formatDateTime,formatLocalDateTimeInput } from '@/lib/admin-format'
import { adminOffset,adminPageSummary,parseAdminPage } from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import { adminResourceCounts } from '@/src/services/admin-resource-counts.service'
import { assessmentOptions } from '@/src/services/admin-assessment-ux.service'
import { getAdminMonitoring } from '@/src/services/admin-monitoring.service'
import { authorizationService } from '@/src/services/authorization.service'
import { catalogContextService } from '@/src/services/catalog-context.service'
import Link from '@/components/admin/navigation/AdminLink'
export type EventWorkspaceParams = { program?: string; track?: string; edit?: string; event?: string; tab?: string; ok?: string; error?: string; new?: string; exam?: string; session_event?: string; q?: string; status?: string; page?: string; participant_page?:string; participant_search?:string; participant_status?:string; returnTo?: string; selector_search?: string; selector_domain?: string; selector_type?: string; selector_level?: string; selector_page?: string }
const PATH = adminRoutes.events
function lifecycle(e:{status:string;starts_at:string;ends_at:string}) { const status=e.status.toLowerCase();if(['draft','archived','closed'].includes(status))return status;const now=Date.now();return Date.parse(e.ends_at)<now?'closed':Date.parse(e.starts_at)>now?'scheduled':'live' }
export default async function EventsRoute({ searchParams }: { searchParams: Promise<EventWorkspaceParams> }) {
  const params = await searchParams
  const actor = await authorizationService.getCurrentAuthorization()
  if (!actor?.permissions.includes(PERMISSIONS.EVENT_MANAGE)) return <AdminEmptyState title="Akses tidak tersedia" description="Hubungi pengelola untuk akses Event."/>
  const program = params.program || 'CPNS'; const track = params.track || (program === 'TKA' ? 'SMP' : 'SKD')
  const context = await catalogContextService.resolve({programCode:program,trackCode:track})
  const db = await createAdminClient()
  const listQuery = new URLSearchParams({program,track}); for(const k of ['q','status','page'] as const) if(params[k]) listQuery.set(k,params[k])
  const listHref = `${PATH}?${listQuery}`
  const href = (extra: Record<string,string>) => {const q = new URLSearchParams(listQuery); for(const [k,v] of Object.entries(extra)) q.set(k,v);return `${PATH}?${q}`}
  const id = params.event || params.edit || params.session_event
  const page = parseAdminPage(params.page)
  let query = db.from('events').select('id, code, title, slug, description, flyer_image_url, status, registration_start, registration_end, starts_at, ends_at, event_sessions(id, name, exam_id, starts_at, ends_at, capacity, status, exams(title))', {count:'exact'}).eq('program_id',context.program.id).eq('track_id',context.track.id).order('starts_at',{ascending:false})
  if(id) query = query.eq('id',id)
  else {
    if(params.q) query = query.ilike('title',`%${escapePostgrestValue(params.q)}%`)
    const now=new Date().toISOString()
    if(['upcoming','active','ended'].includes(params.status || '')) {
      query=query.not('status','in','(draft,DRAFT,archived,ARCHIVED)')
      if(params.status==='upcoming')query=query.not('status','in','(closed,CLOSED)').gt('starts_at',now)
      if(params.status==='active')query=query.not('status','in','(closed,CLOSED)').lte('starts_at',now).gte('ends_at',now)
      if(params.status==='ended')query=query.or(`ends_at.lt.${now},status.in.(closed,CLOSED)`)
    } else if(params.status) query=query.eq('status',params.status)
  }
  const {data, count, error} = await query.range(id ? 0 : adminOffset(page),id ? 0 : adminOffset(page)+24)
  if(error) return <AdminErrorState noun="event" retryHref={listHref}/>
  const events = data ?? []
  const selected = id ? events[0] : undefined
  const selector = params.new === '1' || params.tab === 'settings' ? await assessmentOptions({search:params.selector_search,domain:params.selector_domain==='all'?undefined:params.selector_domain || program,type:params.selector_type,level:params.selector_level,page:params.selector_page,selectedId:params.exam}) : {options:[],total:0,page:1}
  if(params.new === '1') return <AdminPage><AdminBreadcrumbs items={[{label:'Event',href:listHref},{label:'Buat Event'}]}/><AdminPageHeader title="Buat Event" description="Siapkan event, pilih assessment, lalu tinjau jadwal dan akses."/><AdminFeedbackBanner error={params.error}/><EventWorkflowForm options={selector.options} selectedId={params.exam} total={selector.total} page={selector.page} program={program} track={track} returnTo={adminReturnUrl(params.returnTo,listHref)}/></AdminPage>
  const participantCounts = await adminResourceCounts('event_participants', events.map(e => String(e.id)))
  if(id && !selected) return <AdminEmptyState title="Event tidak ditemukan" action={<Link className={adminSecondaryButtonClass} href={listHref}>Kembali ke Event</Link>}/>
  if(selected) {
    const e = selected; const tab = params.edit ? 'settings' : params.tab || 'overview'; const sessions = e.event_sessions as unknown as {id:string;name:string;exam_id:string;starts_at:string;ends_at:string;capacity:number;status:string;exams:{title:string}}[]
    const detail = (tab:string) => href({event:e.id,tab,...(tab === 'participants' ? {participant_search:params.participant_search || '',participant_status:params.participant_status || '',participant_page:params.participant_page || '1'} : {})})
    const monitoring = `/admin/monitoring?${new URLSearchParams({event:e.id,program,track,returnTo:detail('overview')})}`
    const action = lifecycle(e) === 'draft' || !sessions.length ? <Link className={adminPrimaryButtonClass} href={detail('settings')}>Konfigurasi Event</Link> : <Link data-event-id={e.id} className={adminPrimaryButtonClass} href={monitoring}>{['closed','archived'].includes(lifecycle(e)) ? 'Lihat Hasil' : 'Pantau Peserta'}</Link>
    return <AdminPage><AdminBreadcrumbs items={[{label:'Event',href:listHref},{label:e.title}]}/><AdminPageHeader title={e.title} description={`${sessions.map(s => s.exams?.title || s.name).join(' · ') || 'Assessment belum ditentukan'} · ${formatDateTime(e.starts_at)} — ${formatDateTime(e.ends_at)}`} action={action}/><div className="flex flex-wrap gap-3"><AdminStatusBadge status={lifecycle(e)}/><Link className={adminSecondaryButtonClass} href={listHref}>Kembali ke Event</Link>{e.status!=='archived' && <details><summary className={adminSecondaryButtonClass}>Lainnya</summary><form action={archiveEventAction} className="mt-2"><input type="hidden" name="id" value={e.id}/><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/><input type="hidden" name="return_to" value={detail('overview')}/><ConfirmSubmit message={`Arsipkan ${e.title}?`} confirmLabel="Arsipkan Event" trigger={<button type="button" className={adminSecondaryButtonClass}>Arsipkan</button>}/></form></details>}</div><AdminFeedbackBanner ok={params.ok} error={params.error}/><AdminTabs active={tab} tabs={[['overview','Overview'],['participants','Peserta'],['monitoring','Monitoring'],['leaderboard','Leaderboard'],['settings','Pengaturan']].map(([id,label]) => ({id,label,href:id === 'monitoring' ? monitoring : detail(id)}))}/>
      {tab === 'overview' && <><AdminCard className="p-6"><dl className="grid gap-5 sm:grid-cols-2">{[['Assessment',sessions.map(s => s.exams?.title || s.name).join(', ') || 'Belum ada sesi'],['Registrasi',`${formatDateTime(e.registration_start)} — ${formatDateTime(e.registration_end)}`],['Jadwal',`${formatDateTime(e.starts_at)} — ${formatDateTime(e.ends_at)}`],['Peserta',String((participantCounts.get(e.id) || 0))]].map(([label,value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl></AdminCard>{!sessions.length && <AdminCard><AdminEmptyState title="Event belum memiliki sesi" description="Pilih assessment dan konfigurasi sesi agar event dapat digunakan peserta." action={<Link className={adminPrimaryButtonClass} href={detail('settings')}>Konfigurasi Sesi</Link>}/></AdminCard>}</>}
      {tab === 'participants' && <EventParticipants eventId={e.id} params={params} returnTo={detail('participants')}/>}
      {tab === 'leaderboard' && <AdminCard><AdminEmptyState title="Leaderboard Event" description="Peringkat mengikuti hasil sesi event." action={<Link className={adminSecondaryButtonClass} href={`/cpns/live/${e.id}`}>Lihat Leaderboard</Link>}/></AdminCard>}
      {tab === 'settings' && <><EventWorkflowForm event={e} options={selector.options} selectedId={params.exam} total={selector.total} page={selector.page} program={program} track={track} returnTo={detail('overview')}/><AdminCard className="space-y-4 p-6"><h2 className="font-bold">Sesi Event</h2>{sessions.map(s => <div key={s.id} className="rounded-lg border p-4"><p className="font-semibold">{s.name} · {s.exams?.title}</p><p className="text-sm text-muted-foreground">{formatDateTime(s.starts_at)} — {formatDateTime(s.ends_at)} · {s.capacity} peserta</p><AdminStatusBadge status={s.status}/></div>)}<form action={saveEventSessionAction} className="space-y-4"><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/><input type="hidden" name="event_id" value={e.id}/><input type="hidden" name="return_to" value={detail('settings')}/><AdminField label="Nama sesi"><input className={adminInputClass} name="name" required defaultValue={e.title}/></AdminField><AssessmentSelector options={selector.options} selectedId={params.exam} total={selector.total} page={selector.page}/><div className="grid gap-4 sm:grid-cols-2">{[['starts_at','Mulai',formatLocalDateTimeInput(e.starts_at),'datetime-local'],['ends_at','Selesai',formatLocalDateTimeInput(e.ends_at),'datetime-local'],['capacity','Kapasitas','100','number']].map(([name,label,value,type]) => <AdminField key={name} label={label}><input className={adminInputClass} name={name} defaultValue={value} type={type} min={1} required/></AdminField>)}</div><input type="hidden" name="status" value="scheduled"/><AdminSubmitButton variant="secondary">Tambah sesi</AdminSubmitButton></form><EventTicketLink eventId={e.id} sessions={sessions} program={program} track={track} returnTo={detail('settings')}/></AdminCard></>}
    </AdminPage>
  }
  return <AdminPage><AdminBreadcrumbs items={[{label:'Distribusi'},{label:'Event'}]}/><AdminPageHeader title="Event" description="Kelola distribusi assessment melalui event." action={<Link className={adminPrimaryButtonClass} href={href({new:'1'})}>Buat Event</Link>}/><AdminFeedbackBanner ok={params.ok} error={params.error}/><AdminTableToolbar pathname={PATH} search={params.q || ''} placeholder="Cari Event..." status={params.status} statusOptions={[{value:'upcoming',label:'Upcoming'},{value:'active',label:'Active'},{value:'ended',label:'Ended'},{value:'draft',label:'Draft'}]} program={program} track={track} resultCount={count || 0}/><AdminCard><AdminDataTable className="w-full min-w-[800px] text-sm"><thead className={adminTableHeadClass}><tr>{['Event','Assessment','Jadwal','Peserta','Status','Aksi'].map(c => <AdminTh key={c}>{c}</AdminTh>)}</tr></thead><tbody className="divide-y">{events.map(e => <tr key={e.id} data-event-id={e.id} className="hover:bg-muted"><td className="px-5 py-4 font-semibold">{e.title}</td><td className="px-4">{(e.event_sessions as unknown as {exams:{title:string}}[]).map(s => s.exams?.title).join(', ') || 'Belum ada sesi'}</td><td className="px-4 text-xs">{formatDateTime(e.starts_at)}<br/>{formatDateTime(e.ends_at)}</td><td className="px-4">{(participantCounts.get(e.id) || 0)}</td><td className="px-4"><AdminStatusBadge status={lifecycle(e)}/></td><td className="px-5"><Link className={adminSecondaryButtonClass} href={href({event:e.id,tab:'overview'})}>Lihat Event</Link></td></tr>)}</tbody></AdminDataTable>{!events.length && <AdminEmptyState title="Belum ada Event" description="Buat event untuk mendistribusikan assessment ke peserta." action={<Link className={adminSecondaryButtonClass} href={href({new:'1'})}>Buat Event</Link>}/>}<AdminPagination pathname={PATH} params={Object.fromEntries(listQuery)} summary={adminPageSummary(page,events.length,count || 0)} noun="event"/></AdminCard></AdminPage>
}
async function EventTicketLink({eventId,sessions,program,track,returnTo}:{returnTo:string;eventId:string;sessions:{id:string;name:string}[];program:string;track:string}) {
  const db = await createAdminClient();const {data,error} = await db.from('products').select('id,name,programs!inner(code),tracks!inner(code)').eq('product_type','EVENT_TICKET').in('status',['DRAFT','ACTIVE']).eq('programs.code',program).eq('tracks.code',track).limit(25)
  if(error || !data?.length || !sessions.length) return null
  return <AdminModal title="Hubungkan tiket" triggerLabel="Hubungkan tiket" triggerVariant="secondary"><form action={linkEventProductAction} className="space-y-4"><input type="hidden" name="return_to" value={returnTo}/><p className="text-sm text-muted-foreground">Hubungkan tiket Draft ke sesi, kemudian aktifkan dari Products setelah readiness terpenuhi.</p><input type="hidden" name="event_id" value={eventId}/><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/><AdminField label="Sesi"><select className={adminInputClass} name="session_id">{sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></AdminField><AdminField label="Produk tiket"><select className={adminInputClass} name="product_id">{data.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></AdminField><AdminSubmitButton>Hubungkan tiket</AdminSubmitButton></form></AdminModal>
}

async function EventParticipants({eventId,params,returnTo}:{eventId:string;params:EventWorkspaceParams;returnTo:string}) {
 const data=await getAdminMonitoring({event:eventId,q:params.participant_search,status:params.participant_status,page:params.participant_page})
 const query={program:params.program || 'CPNS',track:params.track || 'SKD',event:eventId,tab:'participants',q:params.q || '',status:params.status || '',participant_search:params.participant_search || '',participant_status:params.participant_status || '',participant_page:String(data.page)}
 return <><AdminTableToolbar pathname={PATH} searchName="participant_search" statusName="participant_status" search={params.participant_search || ''} placeholder="Cari peserta..." hiddenFields={{...query,participant_page:undefined,participant_search:undefined,participant_status:undefined}} status={params.participant_status} statusOptions={[{value:'not_started',label:'Belum Mulai'},{value:'in_progress',label:'Sedang Mengerjakan'},{value:'completed',label:'Selesai'}]} resultCount={data.total}/><AdminCard><AdminMonitoringTable data={data} params={{event:eventId}} returnTo={returnTo}/>{!data.rows.length && <AdminEmptyState title="Belum ada peserta yang cocok" description="Ubah filter atau bagikan event agar peserta dapat mendaftar." action={<Link className={adminSecondaryButtonClass} href={`/admin/events?event=${eventId}&tab=overview`}>Lihat Event</Link>}/>}<AdminPagination pageKey="participant_page" pathname={PATH} params={query} summary={adminPageSummary(data.page,data.rows.length,data.total)} noun="peserta"/></AdminCard></>
}
