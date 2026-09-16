import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const requestState = vi.hoisted(() => ({ ip: '10.0.0.1' }))

vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-real-ip': requestState.ip }),
}))

import { AUTH_RATE_LIMITS, hashRateLimitSubject, isAuthActionRateLimited } from '@/lib/server-rate-limit'

const repoRoot = resolve(__dirname, '../..')

/** Pastikan jalur Redis tidak aktif supaya test memakai fallback in-memory. */
beforeAll(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
})

/** IP unik per test supaya cache in-memory tidak bocor antar-test. */
let ipCounter = 0
function freshIp() {
    ipCounter += 1
    return `10.9.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`
}

describe('hashRateLimitSubject', () => {
    it('deterministik, menormalkan huruf besar/kecil & spasi', () => {
        const a = hashRateLimitSubject('  Peserta@Example.com ')
        expect(a).toBe(hashRateLimitSubject('peserta@example.com'))
        expect(a).toMatch(/^[0-9a-f]{32}$/)
    })

    it('berbeda untuk email berbeda', () => {
        expect(hashRateLimitSubject('a@example.com')).not.toBe(hashRateLimitSubject('b@example.com'))
    })
})

describe('isAuthActionRateLimited — batas per IP', () => {
    it('mengizinkan sampai batas, lalu menolak (login 10 / 5 menit)', async () => {
        const ip = freshIp()
        requestState.ip = ip

        for (let attempt = 1; attempt <= AUTH_RATE_LIMITS.login.ip.limit; attempt += 1) {
            await expect(isAuthActionRateLimited('login'), `percobaan ke-${attempt}`).resolves.toBe(false)
        }
        await expect(isAuthActionRateLimited('login')).resolves.toBe(true)
    })

    it('membatasi signup lebih ketat daripada login', async () => {
        requestState.ip = freshIp()
        expect(AUTH_RATE_LIMITS.signup.ip.limit).toBeLessThan(AUTH_RATE_LIMITS.login.ip.limit)

        for (let attempt = 1; attempt <= AUTH_RATE_LIMITS.signup.ip.limit; attempt += 1) {
            await expect(isAuthActionRateLimited('signup')).resolves.toBe(false)
        }
        await expect(isAuthActionRateLimited('signup')).resolves.toBe(true)
    })

    it('IP berbeda punya kuota sendiri', async () => {
        requestState.ip = freshIp()
        await isAuthActionRateLimited('login')

        requestState.ip = freshIp()
        await expect(isAuthActionRateLimited('login')).resolves.toBe(false)
    })
})

describe('isAuthActionRateLimited — batas per email', () => {
    it('menolak pengiriman email berulang untuk alamat yang sama (forgotPassword 3 / 15 menit)', async () => {
        requestState.ip = freshIp()
        const email = 'lupa-password@example.com'

        for (let attempt = 1; attempt <= 3; attempt += 1) {
            await expect(
                isAuthActionRateLimited('forgotPassword', email),
                `percobaan ke-${attempt}`,
            ).resolves.toBe(false)
        }
        await expect(isAuthActionRateLimited('forgotPassword', email)).resolves.toBe(true)
    })

    it('email lain tidak terkena blokir email yang sama', async () => {
        requestState.ip = freshIp()
        await isAuthActionRateLimited('forgotPassword', 'kena-blokir@example.com')
        await isAuthActionRateLimited('forgotPassword', 'kena-blokir@example.com')
        await isAuthActionRateLimited('forgotPassword', 'kena-blokir@example.com')
        await isAuthActionRateLimited('forgotPassword', 'kena-blokir@example.com')

        await expect(isAuthActionRateLimited('forgotPassword', 'alamat-lain@example.com')).resolves.toBe(false)
    })

    it('login tidak dibatasi per email (mencegah lockout akun orang lain)', () => {
        expect(AUTH_RATE_LIMITS.login.email).toBeUndefined()
        expect(AUTH_RATE_LIMITS.signup.email).toBeUndefined()
        expect(AUTH_RATE_LIMITS.forgotPassword.email).toBeDefined()
        expect(AUTH_RATE_LIMITS.resendVerification.email).toBeDefined()
    })
})

describe('kontrak: auth action memakai limiter', () => {
    const source = readFileSync(resolve(repoRoot, 'app/auth/actions.ts'), 'utf8')

    function actionBody(name: string) {
        const start = source.indexOf(`export async function ${name}`)
        if (start === -1) return ''
        const next = source.indexOf('export async function', start + 1)
        return source.slice(start, next === -1 ? undefined : next)
    }

    it('login dan signup dibatasi', () => {
        expect(actionBody('login')).toContain("isAuthActionRateLimited('login')")
        expect(actionBody('signup')).toContain("isAuthActionRateLimited('signup')")
    })

    it('pengiriman email dibatasi per email', () => {
        expect(actionBody('forgotPassword')).toContain("isAuthActionRateLimited('forgotPassword'")
        expect(actionBody('resendVerificationEmail')).toContain("isAuthActionRateLimited('resendVerification'")
    })

    it('limiter dipasang sebelum memanggil Supabase', () => {
        for (const name of ['login', 'signup', 'forgotPassword', 'resendVerificationEmail']) {
            const body = actionBody(name)
            const limiterAt = body.indexOf('isAuthActionRateLimited')
            const clientAt = body.indexOf('createV2Client()')
            expect(limiterAt, `${name}: limiter tidak ditemukan`).toBeGreaterThan(-1)
            expect(clientAt, `${name}: createV2Client tidak ditemukan`).toBeGreaterThan(-1)
            expect(limiterAt, `${name}: limiter harus dipasang sebelum Supabase`).toBeLessThan(clientAt)
        }
    })
})
