import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Regresi: identitas user diverifikasi TANPA round trip jaringan.
 *
 * `getUser()` memanggil `GET /auth/v1/user` setiap kali ada sesi — satu round
 * trip. Halaman publik (landing `/`, `/tka`, `/cpns`) hanya perlu tahu "sudah
 * login atau belum", jadi round trip itu tidak sepadan.
 *
 * `getClaims()` memverifikasi tanda tangan JWT secara LOKAL memakai WebCrypto
 * dengan kunci publik dari JWKS. Proyek ini memakai penandatanganan asimetris
 * (ES256 — terverifikasi lewat endpoint JWKS proyek), sehingga verifikasinya
 * benar-benar lokal dan bukan sekadar membaca payload.
 *
 * Yang dikunci test ini:
 *   1. `sub` dari klaim yang sudah diverifikasi dipakai sebagai identitas.
 *   2. Tanpa sesi / klaim tidak sah → `null` (bukan throw, bukan string kosong).
 *   3. `sub` yang bukan string atau kosong → `null`.
 *   4. `getUser()` TIDAK dipanggil — inti optimasinya.
 */

const getClaims = vi.fn()
const getUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({ auth: { getClaims, getUser } }),
}))

vi.mock('next/headers', () => ({
    cookies: async () => ({
        getAll: () => [{ name: 'sb-lpgrivowdcepcxradavu-auth-token', value: 'jwt' }],
        set: () => undefined,
    }),
}))

vi.mock('@/lib/env', () => ({
    env: {
        supabaseUrl: () => 'https://staging.example.supabase.co',
        supabaseAnonKey: () => 'anon-key',
    },
}))

beforeEach(() => {
    getClaims.mockReset()
    getUser.mockReset()
})

async function load() {
    const mod = await import('@/lib/utils/supabase/server')
    return mod.getAuthUserIdVerified
}

describe('getAuthUserIdVerified', () => {
    it('mengembalikan sub dari klaim yang terverifikasi', async () => {
        getClaims.mockResolvedValue({
            data: { claims: { sub: 'user-123', role: 'authenticated' }, header: {}, signature: new Uint8Array() },
            error: null,
        })

        const getAuthUserIdVerified = await load()
        await expect(getAuthUserIdVerified()).resolves.toBe('user-123')
    })

    it('TIDAK memanggil getUser — inti optimasinya', async () => {
        getClaims.mockResolvedValue({
            data: { claims: { sub: 'user-123' }, header: {}, signature: new Uint8Array() },
            error: null,
        })

        const getAuthUserIdVerified = await load()
        await getAuthUserIdVerified()

        expect(getClaims).toHaveBeenCalled()
        expect(getUser).not.toHaveBeenCalled()
    })

    it('mengembalikan null saat tidak ada sesi', async () => {
        getClaims.mockResolvedValue({ data: null, error: null })

        const getAuthUserIdVerified = await load()
        await expect(getAuthUserIdVerified()).resolves.toBeNull()
    })

    it('mengembalikan null saat klaim tidak sah (tanda tangan/exp gagal)', async () => {
        getClaims.mockResolvedValue({ data: null, error: { name: 'AuthInvalidJwtError', message: 'Invalid JWT signature' } })

        const getAuthUserIdVerified = await load()
        await expect(getAuthUserIdVerified()).resolves.toBeNull()
    })

    it('mengembalikan null bila sub hilang atau bukan string', async () => {
        const getAuthUserIdVerified = await load()

        for (const claims of [{}, { sub: 123 }, { sub: '' }, { sub: null }]) {
            getClaims.mockResolvedValue({ data: { claims, header: {}, signature: new Uint8Array() }, error: null })
            await expect(getAuthUserIdVerified()).resolves.toBeNull()
        }
    })
})
