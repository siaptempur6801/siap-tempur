import { describe, expect, it } from 'vitest'
import { adminProductTypeLabel, adminQuestionTypeLabel, adminStatusLabel } from '@/lib/admin-format'

/**
 * Audit tampilan: nilai teknis/mentah yang bocor ke layar admin.
 *   - status pembayaran Midtrans (`settlement`, `capture`, …) tampil apa adanya;
 *   - tipe soal tampil `single_choice` di header detail Review;
 *   - jenis produk tampil `PASS`/`TOKEN_PACK` di daftar produk.
 */
describe('label tampilan admin', () => {
    it('status pembayaran Midtrans tidak lagi tampil mentah', () => {
        expect(adminStatusLabel('settlement')).toBe('Selesai')
        expect(adminStatusLabel('capture')).toBe('Tertangkap')
        expect(adminStatusLabel('deny')).toBe('Ditolak bank')
        expect(adminStatusLabel('expire')).toBe('Kedaluwarsa')
        expect(adminStatusLabel('cancel')).toBe('Dibatalkan')
        expect(adminStatusLabel('refund')).toBe('Dana dikembalikan')
        expect(adminStatusLabel('partial_refund')).toBe('Dana dikembalikan sebagian')
        expect(adminStatusLabel('chargeback')).toBe('Sengketa bank')
    })

    it('tipe soal dilabeli; nilai tak dikenal tetap terbaca', () => {
        expect(adminQuestionTypeLabel('single_choice')).toBe('Pilihan tunggal')
        expect(adminQuestionTypeLabel('multiple_choice')).toBe('Pilihan majemuk')
        expect(adminQuestionTypeLabel('category')).toBe('Kategori')
        expect(adminQuestionTypeLabel('ordering')).toBe('ordering')
        expect(adminQuestionTypeLabel(null)).toBe('—')
    })

    it('jenis produk dilabeli; fallback ke huruf kecil yang terbaca', () => {
        expect(adminProductTypeLabel('PASS')).toBe('Langganan (pass)')
        expect(adminProductTypeLabel('TOKEN_PACK')).toBe('Paket token')
        expect(adminProductTypeLabel('EVENT_TICKET')).toBe('Tiket event')
        expect(adminProductTypeLabel('NEW_THING')).toBe('new thing')
        expect(adminProductTypeLabel(undefined)).toBe('—')
    })
})
