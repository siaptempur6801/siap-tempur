import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql } from './helpers/sql-contract'
const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('assessment attempt context boundary', () => {
  it('keys TKA resume to the exact direct, event, or organization context', () => {
    const migration = read('supabase/migrations/20261006102334_attempt_distribution_context_v1.sql')
    const start = migration
      .toLowerCase()
      .indexOf('create or replace function app_private.start_exam_attempt_for_context')
    const end = migration.indexOf('$function$;', start)
    const rpc = migration.slice(start, end)

    expectSql(rpc).toContain("when 'DIRECT' then ea.source = 'b2c' and ea.assignment_id is null")
    expectSql(rpc).toContain("ea.metadata->>'eventId'=v_event_id::text")
    expectSql(rpc).toContain(
      "when 'ORGANIZATION' then ea.source='organization' and ea.assignment_id=v_assignment_id",
    )
    expectSql(rpc).toContain("p_exam_id::text || ':' || p_user_id::text || ':' || v_context_type")
  })

  it('delegates TKA resume to the contextual RPC instead of user-plus-exam lookup', () => {
    const service = read('src/services/tka-full-exam-rpc.service.ts')
    const start = service.indexOf('async startSmpExam(')
    const end = service.indexOf('\n    async ', start + 1)
    const method = service.slice(start, end)

    expect(method).toContain("this.rpc<StartRpcPayload>('start_exam_attempt_in_context'")
    expect(method).toContain('event_id: context.eventId')
    expect(method).toContain('assignment_id: context.assignmentId')
    expect(method).not.toContain(".from('exam_attempts')")
  })

  it('keeps generic Direct resume and attempt limits out of distributed sessions', () => {
    const repository = read('src/repositories/attempt.repository.ts')
    expect(repository).toContain(".filter('source', 'eq', 'b2c')")
    expect(repository).toContain(".is('assignment_id', null)")
    expect(repository).toContain(".is('metadata->>eventId', null)")
  })
})
