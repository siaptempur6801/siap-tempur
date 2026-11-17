import { createAdminClient } from '@/lib/utils/supabase/server'
import { authorizationService } from './authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { organizationService } from './organization.service'
import { organizationExamService } from './organization-exam.service'
import { eventRepository } from '@/src/repositories/event.repository'
import { parseAdminPage } from '@/lib/admin-pagination'
import { escapeLikePattern } from '@/lib/admin-query-pattern'
export type MonitoringContext = {event?:string;org?:string;batch?:string;assignment?:string;exam?:string}
export type MonitoringParams = MonitoringContext & {q?:string;status?:string;page?:string;returnTo?:string}
export type MonitorAttempt = {id:string;user_id:string;participant_id:string|null;exam_id:string;status:string;started_at:string;submitted_at:string|null;duration_used_seconds:number|null;total_score:number|null;percentage:number|null;last_question_position:number|null;assignment_id:string|null;organization_id:string|null;batch_id:string|null;metadata:Record<string,unknown>;source:string}
const ATTEMPT_FIELDS='id, user_id, participant_id, exam_id, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, last_question_position, assignment_id, organization_id, batch_id, metadata, source'
export async function resolveMonitoringContext(context:MonitoringContext) {
 if(context.event) {
  await authorizationService.requirePermission(PERMISSIONS.EVENT_MANAGE)
  const event=await eventRepository.getEvent(context.event);if(!event) throw new Error('Event tidak ditemukan.')
  const sessions=await eventRepository.listSessionsForEvent(event.id)
  if(context.exam && !sessions.some(s=>s.exam_id===context.exam)) throw new Error('Assessment tidak berada pada event ini.')
  return {title:event.title,event,sessions,organization:null,batch:null,assignment:null}
 }
 if(context.org && context.batch) {
  await authorizationService.requirePermission(PERMISSIONS.ORGANIZATION_MANAGE)
  // Existing authenticated RPC enforces the same organization boundary as the workspace.
  const organization=await organizationService.getOrganization(context.org)
  const batch=organization?.batches.find(b=>b.id===context.batch);if(!organization || !batch) throw new Error('Batch tidak ditemukan pada instansi ini.')
  const assignments=await organizationExamService.listAssignments(batch.id)
  const assignment=context.assignment ? assignments.find(a=>a.id===context.assignment) : null
  if(context.assignment && !assignment) throw new Error('Penugasan tidak berada pada batch ini.')
  if(context.exam && assignment && assignment.exam_id!==context.exam) throw new Error('Assessment tidak berada pada penugasan ini.')
  return {title:organization.organization.name,event:null,sessions:[],organization:organization.organization,batch,assignment}
 }
 throw new Error('Pilih Event atau batch instansi untuk monitoring.')
}
type MonitoringProjection = {
 rows: Array<{id:string;name:string;email:string|null;attempt:Omit<MonitorAttempt,'metadata'>|null;progress:{total:number;answered:number}|null}>
 total:number;page:number;summary:{total:number;notStarted:number;inProgress:number;completed:number}
 report:{bands:Array<{label:string;count:number}>;scored:number;completionRate:number|null}
}
export type MonitoringSummaryProjection = {
 total:number
 summary:{total:number;notStarted:number;inProgress:number;completed:number}
 report:{bands:Array<{label:string;count:number}>;scored:number;completionRate:number|null}|null
}
export async function getAdminMonitoring(params:MonitoringParams) {
 const context=await resolveMonitoringContext(params)
 const db=await createAdminClient()
 const {data,error}=await db.rpc('admin_monitoring_page',{
  p_event_id:context.event?.id || null,p_organization_id:context.organization?.id || null,p_batch_id:context.batch?.id || null,
  p_assignment_id:context.assignment?.id || null,p_exam_id:params.exam || null,
  p_search:escapeLikePattern(params.q || ''),p_status:params.status || '',p_page:parseAdminPage(params.page)
 })
 if(error)throw error
 if(!data)throw new Error('Monitoring tidak tersedia.')
 return {context,...data as MonitoringProjection}
}
export async function getAdminMonitoringSummary(params:MonitoringParams,includeReport=true) {
 const context=await resolveMonitoringContext(params)
 if(includeReport) await authorizationService.requirePermission(PERMISSIONS.REPORT_READ)
 const db=await createAdminClient()
 const scope={
  p_event_id:context.event?.id || null,p_organization_id:context.organization?.id || null,p_batch_id:context.batch?.id || null,
  p_assignment_id:context.assignment?.id || null,p_exam_id:params.exam || null
 }
 const {data,error}=await db.rpc('admin_monitoring_summary',{...scope,p_include_report:includeReport})
 if(!error) {
  if(!data)throw new Error('Ringkasan monitoring tidak tersedia.')
  return {context,...data as MonitoringSummaryProjection}
 }

 // Older deployments do not have the aggregate RPC yet. Keep the workspace usable
 // during rollout, but expose only summary fields and honor REPORT_READ locally.
 if(error.code!=='PGRST202') throw error
 const {data:legacy,error:legacyError}=await db.rpc('admin_monitoring_page',{
  ...scope,p_search:'',p_status:'',p_page:1
 })
 if(legacyError) throw legacyError
 if(!legacy) throw new Error('Ringkasan monitoring tidak tersedia.')
 const projection=legacy as MonitoringSummaryProjection
 return {
  context,
  total:projection.total,
  summary:projection.summary,
  report:includeReport ? projection.report : null,
 }
}
export async function getAdminResult(attemptId:string,contextParams:MonitoringContext) {
 const context=await resolveMonitoringContext(contextParams);const db=await createAdminClient()
 let query=db.from('exam_attempts').select(ATTEMPT_FIELDS).eq('id',attemptId)
 if(context.event) query=query.eq('source','b2c').contains('metadata',{eventId:context.event.id})
 else query=query.eq('source','organization').eq('organization_id',context.organization!.id).eq('batch_id',context.batch!.id)
 if(context.assignment) query=query.eq('assignment_id',context.assignment.id)
 if(contextParams.exam) query=query.eq('exam_id',contextParams.exam)
 const {data,error}=await query.maybeSingle();if(error) throw error;if(!data) throw new Error('Hasil tidak ditemukan dalam konteks ini.')
 const attempt=data as MonitorAttempt
 const [{data:scores,error:scoreError},{data:exam},{data:participant},{data:profile}]=await Promise.all([
  db.from('attempt_scores').select('raw_score,normalized_score,percentage,passed,correct_count,wrong_count,unanswered_count,subjects(code,name)').eq('attempt_id',attempt.id),
  db.from('exams').select('title').eq('id',attempt.exam_id).maybeSingle(),
  attempt.participant_id?db.from('organization_participants').select('full_name_snapshot').eq('id',attempt.participant_id).eq('organization_id',context.organization!.id).maybeSingle():Promise.resolve({data:null}),
  db.from('profiles').select('full_name,display_name').eq('id',attempt.user_id).maybeSingle(),
 ])
 if(scoreError) throw scoreError
 return {context,attempt,scores:scores || [],examTitle:String(exam?.title || 'Assessment'),participant:String(participant?.full_name_snapshot || profile?.full_name || profile?.display_name || 'Peserta')}
}
