import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Audit fase 1, A-07. Diverifikasi di Postgres lokal (supabase/postgres 17): dari tujuh
 * attempt uji hanya tiga yang terdaftar kedaluwarsa (bersama lewat durasi, TKA Direct
 * lewat 24 jam, TKA Event setelah sesi berakhir); yang aktif, drill tanpa durasi, impor
 * legacy, dan TKA Direct dalam masa tenggang tidak tersentuh. Finalisasi TKA menutup
 * seksi tersisa lalu menjalankan submit bawaan; attempt yang belum kedaluwarsa ditolak.
 */
const sql = readFileSync(
  resolve(__dirname, '../../supabase/migrations/20261118092000_finalize_expired_attempts.sql'),
  'utf8',
)
  // Buang komentar baris supaya hanya kode yang diperiksa.
  .replace(/--[^\n]*/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

describe('finalisasi attempt kedaluwarsa (SQL, A-07)', () => {
  it('attempt impor legacy dan attempt tanpa durasi tidak pernah punya tenggat', () => {
    expect(sql).toContain(
      "v_attempt.metadata ->> 'migration_source' is not distinct from 'production_legacy_rehearsal'",
    )
    expect(sql).toContain('if v_duration <= 0 then return null;')
  })

  it('masa tenggang: event setelah sesi berakhir, lainnya 24 jam', () => {
    expect(sql).toContain("+ interval '10 minutes'")
    expect(sql).toContain("return v_section_deadline + interval '24 hours';")
  })

  it('finalisasi bersesi menolak attempt yang belum kedaluwarsa dan memakai submit bawaan', () => {
    expect(sql).toContain("'reason', 'not_expired'")
    expect(sql).toContain('app_private.complete_exam_section_for_user (v_user_id, p_attempt_id)')
    expect(sql).toContain('app_private.submit_exam_attempt_for_user (v_user_id, p_attempt_id)')
  })

  it('hanya service_role yang dapat mengeksekusi', () => {
    expect(sql).toContain(
      'grant execute on function public.list_expired_in_progress_attempts (integer) to service_role;',
    )
    expect(sql).toContain(
      'grant execute on function public.finalize_expired_sectioned_attempt (uuid) to service_role;',
    )
    expect(sql).toContain(
      'revoke all on function public.finalize_expired_sectioned_attempt (uuid) from public, anon, authenticated;',
    )
  })
})
