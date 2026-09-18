import { describe, expect, it } from 'vitest'
import { constantTimeEqual, isBearerTokenValid } from '@/lib/timing-safe'

/**
 * Regresi: `CRON_SECRET` dibandingkan dengan waktu konstan.
 *
 * Sebelumnya route cron memakai `request.headers.get('authorization') ===
 * \`Bearer ${cronSecret}\``. Perbandingan `===` berhenti pada karakter pertama
 * yang berbeda, sehingga panjang awalan yang cocok dapat disimpulkan dari waktu
 * respons — cukup untuk memulihkan rahasia karakter demi karakter.
 */

describe('constantTimeEqual', () => {
    it('menganggap string identik sama', () => {
        expect(constantTimeEqual('rahasia-panjang', 'rahasia-panjang')).toBe(true)
        expect(constantTimeEqual('', '')).toBe(true)
    })

    it('menolak string berbeda walaupun hanya satu karakter', () => {
        expect(constantTimeEqual('rahasia-panjang', 'rahasia-panjann')).toBe(false)
        expect(constantTimeEqual('a', 'b')).toBe(false)
    })

    it('menolak panjang yang berbeda tanpa membandingkan isi', () => {
        expect(constantTimeEqual('pendek', 'pendek-sekali')).toBe(false)
    })
})

describe('isBearerTokenValid', () => {
    const SECRET = 'cron-secret-yang-panjang-dan-acak'

    it('menerima header Bearer yang benar', () => {
        expect(isBearerTokenValid(`Bearer ${SECRET}`, SECRET)).toBe(true)
    })

    it('menolak rahasia yang salah', () => {
        expect(isBearerTokenValid('Bearer cron-secret-yang-panjang-dan-acaX', SECRET)).toBe(false)
        expect(isBearerTokenValid('Bearer ', SECRET)).toBe(false)
    })

    it('menolak header yang hilang atau tidak memakai skema Bearer', () => {
        expect(isBearerTokenValid(null, SECRET)).toBe(false)
        expect(isBearerTokenValid('', SECRET)).toBe(false)
        expect(isBearerTokenValid(SECRET, SECRET)).toBe(false)
        expect(isBearerTokenValid(`Basic ${SECRET}`, SECRET)).toBe(false)
    })

    it('FAIL-CLOSED: rahasia yang belum dikonfigurasi tidak pernah dianggap cocok', () => {
        // Ini yang mencegah cron menjadi endpoint terbuka ketika CRON_SECRET lupa
        // diisi — perilaku lama juga fail-closed dan itu harus dipertahankan.
        expect(isBearerTokenValid('Bearer ', undefined)).toBe(false)
        expect(isBearerTokenValid('Bearer ', '')).toBe(false)
        expect(isBearerTokenValid('Bearer undefined', undefined)).toBe(false)
        expect(isBearerTokenValid(null, undefined)).toBe(false)
    })
})
