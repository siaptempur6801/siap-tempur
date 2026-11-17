import { describe, expect, it } from 'vitest'
import { resolveMidtransFulfilment, normalizeFraudStatus } from '@/lib/midtrans-status'

/**
 * Regresi: `fraud_status` Midtrans wajib dihormati.
 *
 * Sebelum perbaikan, `fraud_status` hanya dideklarasikan sebagai tipe dan tidak
 * pernah dibaca. Notifikasi `capture` + `fraud_status='deny'` langsung ditandai
 * sukses: order menjadi paid, token/entitlement bertambah, dan karena guard status
 * bersifat monotonik, keputusan itu tidak dapat ditarik kembali.
 *
 * Jalur eksploit yang ditutup: POST ke /api/payments/webhook dengan
 * `transaction_status='capture'`, `fraud_status='deny'`, dan signature yang valid.
 */

describe('normalizeFraudStatus', () => {
  it('mengenali tiga keputusan fraud Midtrans tanpa peduli huruf besar/kecil', () => {
    expect(normalizeFraudStatus('accept')).toBe('accept')
    expect(normalizeFraudStatus('ACCEPT')).toBe('accept')
    expect(normalizeFraudStatus(' Challenge ')).toBe('challenge')
    expect(normalizeFraudStatus('deny')).toBe('deny')
  })

  it('mengembalikan null untuk nilai yang tidak dikenal atau kosong', () => {
    expect(normalizeFraudStatus(undefined)).toBeNull()
    expect(normalizeFraudStatus(null)).toBeNull()
    expect(normalizeFraudStatus('')).toBeNull()
    expect(normalizeFraudStatus('sesuatu')).toBeNull()
  })
})

describe('resolveMidtransFulfilment', () => {
  it('MENOLAK pemenuhan saat capture disertai fraud deny', () => {
    const decision = resolveMidtransFulfilment('capture', 'deny')
    expect(decision.status).toBe('deny')
    expect(decision.blockedReason).toBe('FRAUD_DENIED')
  })

  it('menahan pemenuhan saat capture disertai fraud challenge', () => {
    const decision = resolveMidtransFulfilment('capture', 'challenge')
    expect(decision.status).toBe('pending')
    expect(decision.blockedReason).toBe('FRAUD_CHALLENGED')
  })

  it('meneruskan capture saat fraud accept', () => {
    const decision = resolveMidtransFulfilment('capture', 'accept')
    expect(decision.status).toBe('capture')
    expect(decision.blockedReason).toBeNull()
  })

  it('meneruskan capture tanpa fraud_status (channel tanpa review fraud)', () => {
    const decision = resolveMidtransFulfilment('capture', undefined)
    expect(decision.status).toBe('capture')
    expect(decision.blockedReason).toBeNull()
  })

  it('settlement selalu diteruskan karena sudah final', () => {
    const decision = resolveMidtransFulfilment('settlement', 'deny')
    expect(decision.status).toBe('settlement')
    expect(decision.blockedReason).toBeNull()
  })

  it('tidak mengubah status non-capture', () => {
    for (const status of ['pending', 'expire', 'cancel', 'deny', 'refund']) {
      const decision = resolveMidtransFulfilment(status, 'accept')
      expect(decision.status).toBe(status)
      expect(decision.blockedReason).toBeNull()
    }
  })

  it('normalisasi huruf besar/kecil tetap menolak fraud deny', () => {
    const decision = resolveMidtransFulfilment('CAPTURE', 'DENY')
    expect(decision.status).toBe('deny')
    expect(decision.blockedReason).toBe('FRAUD_DENIED')
  })
})
