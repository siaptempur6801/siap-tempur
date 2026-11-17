/** Read-only staging parity checks against the pre-optimization admin projections.
 * No attempts, accounts, questions or permissions are mutated. Full scans here are
 * intentional test oracles, not application queries. Run with .env.local staging.
 */
import assert from 'node:assert/strict'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
nextEnv.loadEnvConfig(process.cwd())
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (new URL(url).hostname.split('.')[0] !== 'lpgrivowdcepcxradavu') throw new Error('Staging only')
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const data = async (query) => {
  const r = await query
  if (r.error) throw r.error
  return r.data
}
const all = async (query) => {
  const out = []
  for (let offset = 0; ; offset += 500) {
    const rows = await data(query().range(offset, offset + 499))
    out.push(...rows)
    if (rows.length < 500) break
  }
  return out
}
let assertions = 0
const same = (actual, expected) => {
  assert.deepEqual(actual, expected)
  assertions++
}
const rpc = async (name, args) => data(db.rpc(name, args))
const questions = await all(() =>
  db
    .from('questions')
    .select(
      'id,program_id,track_id,subject_id,version,status,question_code,stem,updated_at,reviewer_id',
    )
    .order('id'),
)
const reviews = await all(() =>
  db
    .from('content_reviews')
    .select('id,entity_id,question_version,review_stage,status,notes,completed_at,created_at')
    .eq('entity_type', 'question')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }),
)
const exams = await all(() => db.from('exams').select('id').order('id'))
const bindings = await all(() =>
  db.from('exam_question_items').select('exam_id,question_id,question_version').order('id'),
)
const supplies = await rpc('admin_assessment_supply', { p_exam_ids: exams.map((e) => e.id) })
for (const supply of supplies) {
  const items = bindings.filter((b) => b.exam_id === supply.exam_id)
  same(supply.bound_count, items.length)
  same(
    supply.approved_bound_count,
    items.filter((i) => {
      const q = questions.find((q) => q.id === i.question_id)
      return (
        q &&
        ['approved', 'published', 'active'].includes(q.status.toLowerCase()) &&
        q.version === i.question_version
      )
    }).length,
  )
  same(
    supply.reviewed_bound_count,
    items.filter((i) =>
      ['academic', 'editorial', 'technical_qa'].every((stage) => {
        const r = reviews.find(
          (r) =>
            r.entity_id === i.question_id &&
            r.question_version === i.question_version &&
            r.review_stage === stage,
        )
        return r?.status === 'approved' && r.completed_at
      }),
    ).length,
  )
  for (const s of supply.sections)
    same(
      s.published_count,
      questions.filter(
        (q) =>
          q.subject_id === s.subject_id &&
          ['published', 'PUBLISHED', 'active', 'ACTIVE'].includes(q.status),
      ).length,
    )
}
const nodes = await all(() =>
  db
    .from('knowledge_nodes')
    .select('id,subject_id,subjects(track_id,tracks(program_id))')
    .order('id'),
)
const paths = await all(() =>
  db
    .from('knowledge_node_paths')
    .select('ancestor_id,descendant_id')
    .order('ancestor_id')
    .order('descendant_id'),
)
const mappings = await all(() =>
  db
    .from('question_knowledge_nodes')
    .select('question_id,knowledge_node_id')
    .eq('relation_type', 'primary')
    .order('question_id')
    .order('knowledge_node_id'),
)
const versions = await all(() =>
  db.from('question_versions').select('question_id,version').order('question_id').order('version'),
)
const contexts = [
  ...new Map(
    questions.map((q) => [q.program_id + q.track_id, { program: q.program_id, track: q.track_id }]),
  ).values(),
]
function reviewState(q) {
  const stages = new Map()
  for (const r of reviews)
    if (r.entity_id === q.id && r.question_version === q.version && !stages.has(r.review_stage))
      stages.set(r.review_stage, r)
  const list = [...stages.values()]
  return list.some(
    (r) =>
      /blocked[_ ]asset|aset.*belum|asset.*missing/i.test(r.notes || '') && r.status !== 'approved',
  )
    ? 'blocked_asset'
    : list.some((r) => /blocked[_ ]content/i.test(r.notes || '') && r.status !== 'approved')
      ? 'blocked_content'
      : list.some((r) => r.status === 'rejected')
        ? 'rejected'
        : ['academic', 'editorial', 'technical_qa'].every(
              (stage) =>
                stages.get(stage)?.status === 'approved' && stages.get(stage)?.completed_at,
            )
          ? 'approved'
          : 'needs_review'
}
for (const ctx of contexts) {
  const scoped = questions.filter((q) => q.program_id === ctx.program && q.track_id === ctx.track)
  const args = { p_program_id: ctx.program, p_track_id: ctx.track }
  const counts = await rpc('admin_question_status_counts', args)
  same(counts.total, scoped.length)
  for (const [output, statuses] of Object.entries({
    draft: ['draft'],
    published: ['published'],
    approved: ['approved'],
    revisionRequired: ['revision_required'],
    editorial: ['submitted', 'editorial_review'],
    academic: ['academic_review'],
    technical: ['technical_qa'],
  }))
    same(counts[output], scoped.filter((q) => statuses.includes(q.status)).length)
  const scopedNodes = nodes.filter((n) => n.subjects?.track_id === ctx.track)
  const drill = await rpc('admin_drill_supply', {
    ...args,
    p_node_ids: scopedNodes.map((n) => n.id),
  })
  for (const n of drill) {
    const subject = nodes.find((x) => x.id === n.node_id).subject_id
    const descendants = new Set(
      paths.filter((p) => p.ancestor_id === n.node_id).map((p) => p.descendant_id),
    )
    const ids = new Set(
      mappings.filter((m) => descendants.has(m.knowledge_node_id)).map((m) => m.question_id),
    )
    same(
      n.available_count,
      scoped.filter(
        (q) =>
          ids.has(q.id) &&
          q.subject_id === subject &&
          ['approved', 'published'].includes(q.status) &&
          versions.some((v) => v.question_id === q.id && v.version === q.version),
      ).length,
    )
  }
  for (const review of [
    '',
    'needs_review',
    'blocked',
    'blocked_asset',
    'blocked_content',
    'approved',
    'rejected',
  ])
    for (const page of [1, 2, 999]) {
      const expected = scoped
        .filter(
          (q) =>
            !review ||
            reviewState(q) === review ||
            (review === 'blocked' && ['blocked_asset', 'blocked_content'].includes(reviewState(q))),
        )
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
      const result = await rpc('admin_question_page', { ...args, p_review: review, p_page: page })
      same(result.total, expected.length)
      same(
        result.rows.map((q) => q.id),
        expected.slice((page - 1) * 25, page * 25).map((q) => q.id),
      )
      same(
        result.clampTo,
        page > Math.max(1, Math.ceil(expected.length / 25))
          ? Math.max(1, Math.ceil(expected.length / 25))
          : null,
      )
      for (const q of result.rows) {
        same('options' in q, false)
        same('answer_key' in q, false)
      }
    }
  for (const n of scopedNodes.slice(0, 3)) {
    const descendants = new Set([
      n.id,
      ...paths.filter((p) => p.ancestor_id === n.id).map((p) => p.descendant_id),
    ])
    const ids = new Set(
      mappings.filter((m) => descendants.has(m.knowledge_node_id)).map((m) => m.question_id),
    )
    const expected = scoped
      .filter((q) => ids.has(q.id))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
    const result = await rpc('admin_question_page', { ...args, p_node_id: n.id })
    same(result.total, expected.length)
    same(
      result.rows.map((q) => q.id),
      expected.slice(0, 25).map((q) => q.id),
    )
  }
}
const attempts = await all(() =>
  db
    .from('exam_attempts')
    .select(
      'id,user_id,participant_id,source,organization_id,batch_id,assignment_id,exam_id,metadata,status,started_at,total_score,percentage',
    )
    .order('started_at', { ascending: false })
    .order('id', { ascending: false }),
)
const eventRoster = await all(() =>
  db
    .from('event_registrations')
    .select('id,event_id,user_id,profiles(full_name,display_name)')
    .order('id'),
)
const orgRoster = await all(() =>
  db
    .from('organization_participants')
    .select('id,organization_id,batch_id,full_name_snapshot,email_snapshot')
    .order('id'),
)
const scopeList = [...new Set(eventRoster.map((r) => r.event_id))]
  .map((event) => ({ event }))
  .concat([
    ...new Map(
      orgRoster.map((r) => [r.batch_id, { org: r.organization_id, batch: r.batch_id }]),
    ).values(),
  ])
const progressQuestions = await all(() =>
  db.from('attempt_questions').select('id,attempt_id,attempt_answers(answered_at)').order('id'),
)
for (const scope of scopeList) {
  const roster = scope.event
    ? eventRoster.filter((r) => r.event_id === scope.event)
    : orgRoster.filter((r) => r.organization_id === scope.org && r.batch_id === scope.batch)
  const scoped = attempts.filter((a) =>
    scope.event
      ? a.source === 'b2c' && a.metadata?.eventId === scope.event
      : a.source === 'organization' &&
        a.organization_id === scope.org &&
        a.batch_id === scope.batch,
  )
  const latest = new Map()
  for (const a of scoped) {
    const key = scope.event ? a.user_id : a.participant_id
    if (key && !latest.has(key)) latest.set(key, a)
  }
  const key = (r) => (scope.event ? r.user_id : r.id)
  const rosterKeys = new Set(roster.map(key))
  for (const id of latest.keys()) if (!rosterKeys.has(id)) latest.delete(id)
  const completed = [...latest.values()].filter((a) => a.status === 'completed')
  const bands = Array(5).fill(0)
  for (const a of completed)
    bands[
      a.percentage === null || !Number.isFinite(a.percentage)
        ? 4
        : Math.max(0, Math.min(3, Math.floor(a.percentage / 25)))
    ]++
  for (const status of ['', 'not_started', 'completed', 'in_progress'])
    for (const page of [1, 2, 999]) {
      const args = {
        p_event_id: scope.event || null,
        p_organization_id: scope.org || null,
        p_batch_id: scope.batch || null,
        p_status: status,
        p_page: page,
      }
      const result = await rpc('admin_monitoring_page', args)
      const matched = roster.filter(
        (r) =>
          !status ||
          (status === 'not_started' ? !latest.has(key(r)) : latest.get(key(r))?.status === status),
      )
      const clamped = Math.min(page, Math.max(1, Math.ceil(matched.length / 25)))
      same(result.summary, {
        total: roster.length,
        notStarted: Math.max(0, roster.length - latest.size),
        inProgress: [...latest.values()].filter((a) => a.status === 'in_progress').length,
        completed: completed.length,
      })
      same(result.total, matched.length)
      same(result.page, clamped)
      same(
        result.rows.map((r) => r.id),
        matched.slice((clamped - 1) * 25, clamped * 25).map((r) => r.id),
      )
      same(
        result.report.bands.map((b) => b.count),
        bands,
      )
      same(result.report.scored, completed.filter((a) => a.total_score !== null).length)
      same(
        result.report.completionRate,
        roster.length ? Math.round((completed.length / roster.length) * 100) : null,
      )
      for (const r of result.rows) {
        same(r.attempt?.id || null, latest.get(key(roster.find((x) => x.id === r.id)))?.id || null)
        if (r.attempt) {
          const qs = progressQuestions.filter((q) => q.attempt_id === r.attempt.id)
          same(r.progress, {
            total: qs.length,
            answered: qs.filter(
              (q) =>
                q.attempt_answers &&
                (Array.isArray(q.attempt_answers)
                  ? q.attempt_answers.some((a) => a.answered_at !== null)
                  : q.attempt_answers.answered_at !== null),
            ).length,
          })
          same('metadata' in r.attempt, false)
        }
      }
    }
}
for (const [name, args] of [
  ['admin_assessment_supply', { p_exam_ids: [] }],
  [
    'admin_drill_supply',
    { p_program_id: contexts[0].program, p_track_id: contexts[0].track, p_node_ids: [] },
  ],
  ['admin_resource_counts', { p_kind: 'user_entitlements', p_ids: [] }],
  ['admin_monitoring_page', {}],
  ['admin_question_page', { p_program_id: contexts[0].program, p_track_id: contexts[0].track }],
  [
    'admin_question_status_counts',
    { p_program_id: contexts[0].program, p_track_id: contexts[0].track },
  ],
]) {
  const r = await anon.rpc(name, args)
  same(r.error?.code, '42501')
}
// Verify the generic entitlement feature join against the previous two-read implementation.
const entitlementCodes = [
  'cpns.drill.unlimited',
  'tka.sd.mini_tryout.unlimited',
  'tka.smp.drill.unlimited',
  'tka.smp.mini_tryout.unlimited',
]
const features = await data(db.from('features').select('id,code').in('code', entitlementCodes))
const grants = await all(() =>
  db
    .from('entitlements')
    .select('id,user_id,feature_id,starts_at,expires_at,usage_limit,usage_count,status')
    .order('id'),
)
const joined = await all(() =>
  db
    .from('entitlements')
    .select('id,user_id,starts_at,expires_at,usage_limit,usage_count,status,features!inner(code)')
    .in('features.code', entitlementCodes)
    .in('status', ['active', 'ACTIVE'])
    .order('id'),
)
const instant = Date.now(),
  usable = (g) => {
    const start = Date.parse(g.starts_at)
    const end = g.expires_at ? Date.parse(g.expires_at) : null
    return (
      Number.isFinite(start) &&
      start <= instant &&
      (end === null || (Number.isFinite(end) && end > instant)) &&
      (g.usage_limit === null || g.usage_count < g.usage_limit)
    )
  }
for (const userId of new Set(grants.map((g) => g.user_id))) {
  const previous = [
    ...new Set(
      grants
        .filter((g) => g.user_id === userId && ['active', 'ACTIVE'].includes(g.status) && usable(g))
        .map((g) => features.find((f) => f.id === g.feature_id)?.code)
        .filter(Boolean),
    ),
  ].sort()
  const current = [
    ...new Set(joined.filter((g) => g.user_id === userId && usable(g)).map((g) => g.features.code)),
  ].sort()
  same(current, previous)
}
console.log(
  JSON.stringify({
    status: 'PASS',
    assertions,
    assessments: exams.length,
    questions: questions.length,
    contexts: contexts.length,
    monitoringScopes: scopeList.length,
    readOnly: true,
  }),
)
