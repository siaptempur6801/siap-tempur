import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { newRowId } from '@/components/admin/QuestionOptionsEditor'

/**
 * Regresi: React key baris opsi tidak boleh berasal dari field yang dapat diedit.
 *
 * Sebelum perbaikan, key-nya `${row.key}-${index}` sementara `row.key` terikat ke
 * sebuah <input> ("Kode" opsi A/B/C). Setiap ketikan mengubah key → React
 * me-remount baris → input kehilangan fokus. Gejalanya di produksi: admin hanya
 * bisa mengetik SATU KARAKTER PER KLIK saat mengedit kode opsi di
 * `/admin/content/review`.
 *
 * Catatan: menguji ini lewat render + simulasi ketikan tidak dapat dilakukan di
 * harness ini — Vitest mentransformasi JSX komponen secara server-side sehingga
 * `react/jsx-runtime` tidak bisa di-mock. Karena itu kontraknya dikunci dengan dua
 * cara: (1) identitas baris harus nilai acak yang tidak diturunkan dari data yang
 * dapat diedit, dan (2) ekspresi JSX `key` itu sendiri diperiksa di sumber.
 */

const SOURCE = readFileSync(
  resolve(__dirname, '../../components/admin/QuestionOptionsEditor.tsx'),
  'utf8',
)

describe('QuestionOptionsEditor — identitas baris opsi', () => {
  it('newRowId menghasilkan nilai unik yang tidak dapat diprediksi', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newRowId()))
    expect(ids.size).toBe(500)
  })

  it('identitas baris tidak diturunkan dari kode opsi', () => {
    // Nilai ini tidak boleh mengandung pola "KODE-indeks" yang dipakai versi lama.
    for (let index = 0; index < 20; index += 1) {
      expect(newRowId()).not.toMatch(/^[A-Z]-\d+$/)
    }
  })

  it('JSX tidak memakai row.key sebagai React key', () => {
    const keyExpressions = [...SOURCE.matchAll(/\bkey=\{([^}]+)\}/g)].map((match) =>
      match[1].trim(),
    )

    expect(keyExpressions.length).toBeGreaterThan(0)
    for (const expression of keyExpressions) {
      expect(expression).not.toContain('row.key')
      expect(expression).not.toContain('index')
    }
  })

  it('baris opsi memakai identitas stabil sebagai key', () => {
    expect(SOURCE).toContain('key={row.id}')
  })
})
