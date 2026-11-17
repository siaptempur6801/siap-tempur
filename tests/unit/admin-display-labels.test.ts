import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  adminEntityTypeLabel,
  adminExamTypeLabel,
  adminProductTypeLabel,
  adminQuestionTypeLabel,
  adminStatusLabel,
} from '@/lib/admin-format'

const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

/**
 * Audit tampilan: nilai teknis/mentah yang bocor ke layar admin.
 *   - status pembayaran Midtrans (`settlement`, `capture`, …) tampil apa adanya;
 *   - tipe soal tampil `single_choice` di header detail Review;
 *   - jenis produk tampil `TOKEN_PACK` di daftar produk.
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
    expect(adminProductTypeLabel('PASS')).toBe('pass')
    expect(adminProductTypeLabel('TOKEN_PACK')).toBe('Paket token')
    expect(adminProductTypeLabel('EVENT_TICKET')).toBe('Tiket event')
    expect(adminProductTypeLabel('NEW_THING')).toBe('new thing')
    expect(adminProductTypeLabel(undefined)).toBe('—')
  })

  it('tipe ujian dilabeli tanpa mengekspos kode database', () => {
    expect(adminExamTypeLabel('DRILL')).toBe('Drill')
    expect(adminExamTypeLabel('MINI_TRYOUT')).toBe('Mini Tryout')
    expect(adminExamTypeLabel('FULL_TRYOUT')).toBe('Tryout')
    expect(adminExamTypeLabel('EVENT')).toBe('Ujian event')
    expect(adminExamTypeLabel('NEW_TYPE')).toBe('new type')
    expect(adminExamTypeLabel(null)).toBe('—')
  })

  it('jenis entitas audit dilabeli; nilai filter tetap mentah di value', () => {
    expect(adminEntityTypeLabel('question')).toBe('Soal')
    expect(adminEntityTypeLabel('organization_participant')).toBe('Peserta instansi')
    expect(adminEntityTypeLabel('payment')).toBe('Pembayaran')
    expect(adminEntityTypeLabel('baru_saja')).toBe('baru saja')
    expect(adminEntityTypeLabel('')).toBe('—')
  })

  it('tidak ada select admin yang menampilkan nilai mentah sebagai label', () => {
    for (const file of [
      'components/admin/domain/catalog/CatalogWorkspace.tsx',
      'components/admin/domain/assessment/AssessmentWorkspace.tsx',
      'components/admin/domain/assessment/AssessmentForm.tsx',
    ]) {
      expect(source(file), file).not.toMatch(/<option>[a-z_]+<\/option>/)
      expect(source(file), file).not.toMatch(/<option>[A-Z_]+<\/option>/)
    }
  })

  it('pergantian konteks menghapus mode dan halaman yang sudah tidak valid', () => {
    const shell = source('components/admin/UnifiedAdminShell.tsx')
    expect(shell).toMatch(/'bulk',\s*'page'/)
  })

  it('sumber entitlement memakai label manusiawi', () => {
    const service = source('src/services/admin-platform.service.ts')
    const page = source('components/admin/domain/users/AccessWorkspace.tsx')
    expect(service).toContain("order_item: 'Pembelian produk'")
    expect(page).toContain('transactionSourceLabel(item.source_type)')
    expect(page).not.toContain("{item.source_type || '—'}")
  })

  it('aksi baris daftar memakai istilah Indonesia', () => {
    for (const file of [
      'components/admin/domain/catalog/CatalogWorkspace.tsx',
      'components/admin/domain/assessment/AssessmentWorkspace.tsx',
      'app/admin/content/articles/page.tsx',
    ]) {
      expect(source(file), file).not.toMatch(/>Edit</)
      expect(source(file), file).not.toMatch(/>Archive</)
    }
  })
})
