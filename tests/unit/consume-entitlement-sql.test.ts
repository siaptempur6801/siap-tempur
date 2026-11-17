import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Audit fase 1, A-09/A-16. Diverifikasi di Postgres lokal: entitlement dengan
 * `usage_limit = 2` menanggung dua attempt, pemanggilan ulang untuk attempt yang sama
 * idempoten, attempt ketiga ditolak, dan `usage_count` berakhir di 2.
 */
const sql = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20261118094000_consume_entitlement_for_attempt.sql',
  ),
  'utf8',
)
  .replace(/--[^\n]*/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

describe('consume_entitlement_for_attempt (SQL)', () => {
  it('idempoten per attempt lewat penanda metadata', () => {
    expect(sql).toContain("if coalesce(v_metadata ->> 'entitlementid', '') <> '' then return true;")
    expect(sql).toContain("jsonb_build_object('entitlementid', v_entitlement_id)")
  })

  it('menghormati jendela waktu dan kuota, lalu mengunci baris entitlement', () => {
    expect(sql).toContain('en.usage_limit is null or en.usage_count < en.usage_limit')
    expect(sql).toContain('limit 1 for update;')
    expect(sql).toContain('set usage_count = usage_count + 1')
  })

  it('hanya service_role', () => {
    expect(sql).toContain(
      'revoke all on function public.consume_entitlement_for_attempt (uuid, uuid, uuid) from public, anon, authenticated;',
    )
    expect(sql).toContain(
      'grant execute on function public.consume_entitlement_for_attempt (uuid, uuid, uuid) to service_role;',
    )
  })
})
