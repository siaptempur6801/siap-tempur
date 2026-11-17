import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Audit fase 1, A-05/A-10/A-13 (keputusan pemilik 2026-11-17: tandai + cabut akses).
 * Diverifikasi di Postgres lokal (supabase/postgres 17) dengan produk tiket event yang
 * memberi 5 token CPNS + entitlement: bayar → 3 token terpakai → refund → saldo -3,
 * entitlement `revoked`, pendaftaran `cancelled`, order `refunded`; refund kedua
 * idempoten; notifikasi sukses yang terlambat tidak memberi akses lagi; pembayaran
 * untuk order tanpa pemilik dicatat lunas dengan `fulfillment_skipped`.
 */
const sql = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20261118093000_reverse_paid_orders_all_products.sql',
  ),
  'utf8',
)
  .replace(/--[^\n]*/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

describe('reversal order berbayar untuk semua produk (SQL)', () => {
  it('menarik kredit wallet apa pun dari order ini, sekali saja', () => {
    expect(sql).toContain("wt.source_type = 'order_item'")
    expect(sql).not.toContain("pwg.wallet_type = 'exam_token_tka'")
    expect(sql).toContain("wt.source_type = 'order_item_reversal'")
  })

  it('mencabut entitlement dan membatalkan tiket event', () => {
    expect(sql).toContain("status = 'revoked'")
    expect(sql).toContain("update public.event_registrations set status = 'cancelled'")
  })

  it('order tanpa pemilik dicatat lunas tanpa pemenuhan', () => {
    expect(sql).toContain("'fulfillment_skipped', 'order_owner_deleted'")
  })

  it('alias lama tetap ada dan semua fungsi hanya untuk service_role', () => {
    expect(sql).toContain(
      'public.reverse_paid_order (p_order_id, p_event_id, p_status, p_raw_response)',
    )
    for (const signature of [
      'public.reverse_paid_order (uuid, text, text, jsonb)',
      'public.reverse_tka_token_order (uuid, text, text, jsonb)',
      'public.fulfill_paid_order (uuid, text, text, text, text, numeric, jsonb)',
    ]) {
      expect(sql).toContain(`revoke all on function ${signature} from public, anon, authenticated;`)
      expect(sql).toContain(`grant execute on function ${signature} to service_role;`)
    }
  })
})
