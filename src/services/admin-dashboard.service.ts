import 'server-only'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { authorizationService } from './authorization.service'
import { catalogContextService } from './catalog-context.service'
import { contentReviewService } from './content-review.service'
import { PERMISSIONS } from '@/src/auth/permissions'

export type DashboardReviewQueueData = Promise<{
  data: Awaited<ReturnType<typeof contentReviewService.getReviewQueue>> | null
}>

/** Counts and five operational rows; no full questions/options or commerce payload. */
export async function getAdminDashboard(context: { programCode: string; trackCode: string }) {
  const actor = await authorizationService.requirePermission(PERMISSIONS.ADMIN_ACCESS)
  const permissions = new Set(actor.permissions)
  const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE),
    canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE),
    canContent = [
      PERMISSIONS.CONTENT_READ,
      PERMISSIONS.CONTENT_CREATE,
      PERMISSIONS.CONTENT_UPDATE,
      PERMISSIONS.CONTENT_REVIEW,
      PERMISSIONS.CONTENT_PUBLISH,
      PERMISSIONS.QUESTION_MANAGE,
    ].some((p) => permissions.has(p))
  const catalog = await catalogContextService.resolve(context),
    db = await createAdminClient(),
    now = new Date().toISOString()
  // Jakarta midnight, including requests close to UTC date boundaries.
  const jakartaDate = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
  const dayStart = new Date(`${jakartaDate}T00:00:00+07:00`).toISOString()
  const none = Promise.resolve({ data: [], count: 0, error: null })
  const scoped = (table: string, select: string, head = false) =>
    db
      .from(table)
      .select(select, head ? { count: 'exact', head: true } : undefined)
      .eq('program_id', catalog.program.id)
      .eq('track_id', catalog.track.id)
  // Start independent panel work before awaiting KPI reads. Handle rejection now
  // so a failed/slow queue cannot block metrics or create an unhandled promise.
  const reviewQueue: DashboardReviewQueueData = canContent
    ? contentReviewService.getReviewQueue(context, catalog).then(
        (data) => ({ data }),
        () => ({ data: null }),
      )
    : Promise.resolve({ data: null })
  const [active, draft, events, activeEvents, attempts, review] = await Promise.all([
    canExams ? scoped('exams', 'id', true).eq('status', 'active') : none,
    canExams ? scoped('exams', 'id', true).eq('status', 'draft') : none,
    canEvents
      ? scoped('events', 'id,title,status,starts_at,ends_at,event_sessions(id,name)')
          .not('status', 'in', '(archived,closed,draft)')
          .gte('ends_at', now)
          .order('starts_at')
          .limit(5)
      : none,
    canEvents
      ? scoped('events', 'id', true)
          .not('status', 'in', '(archived,closed,draft)')
          .lte('starts_at', now)
          .gte('ends_at', now)
      : none,
    canExams
      ? db
          .from('exam_attempts')
          .select('id,exams!inner(program_id,track_id)', { count: 'exact', head: true })
          .eq('exams.program_id', catalog.program.id)
          .eq('exams.track_id', catalog.track.id)
          .gte('started_at', dayStart)
      : none,
    canContent ? contentReviewService.getReviewCounts(context, catalog) : null,
  ])
  for (const r of [active, draft, events, activeEvents, attempts]) if (r.error) throw r.error
  return {
    nowMs: Date.parse(now),
    permissions: actor.permissions,
    program: catalog.program.code,
    track: catalog.track.code,
    canExams,
    canEvents,
    canContent,
    activeAssessments: active.count || 0,
    draftAssessments: draft.count || 0,
    activeEvents: activeEvents.count || 0,
    attemptsToday: attempts.count || 0,
    events: (events.data || []) as unknown as {
      id: string
      title: string
      status: string
      starts_at: string
      ends_at: string
      event_sessions: { id: string; name: string }[]
    }[],
    review,
    reviewQueue,
  }
}
