import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/202606170002_start_session_idempotency.sql'),
    'utf8'
)

describe('start session idempotency migration', () => {
    it('serializes full tryout starts per user before checking quota', () => {
        expect(migrationSql).toContain("pg_advisory_xact_lock(hashtextextended('start_tryout_session:'")
        expect(migrationSql).toContain("where user_id = p_user_id")
        expect(migrationSql).toContain("and mode = 'tryout'")
        expect(migrationSql).toContain("and status = 'in_progress'")
        expect(migrationSql).toContain('return query select v_existing_session_id, null::json')

        const activeCheckIndex = migrationSql.indexOf("and mode = 'tryout'")
        const quotaUpdateIndex = migrationSql.indexOf('set tryout_quota = tryout_quota - 1')
        expect(activeCheckIndex).toBeGreaterThan(-1)
        expect(quotaUpdateIndex).toBeGreaterThan(activeCheckIndex)
    })

    it('serializes mini tryout starts per user and type before checking quota', () => {
        expect(migrationSql).toContain("pg_advisory_xact_lock(hashtextextended('start_mini_tryout_session:'")
        expect(migrationSql).toContain('q.type = p_type')
        expect(migrationSql).toContain("and ts.mode = 'practice'")
        expect(migrationSql).toContain("and ts.status = 'in_progress'")
        expect(migrationSql).toContain('return query select v_existing_session_id, null::json')
    })
})
