import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '@/lib/validations/auth'
import { loginResolver, registerResolver } from '@/lib/validations/auth-form'

/**
 * Paritas validasi: skema `zod` (server) vs resolver ringan (klien).
 *
 * `zodResolver` menyeret runtime `zod` ke bundle browser — satu chunk 444 KB di
 * `/login` dan `/register`. Resolver di `lib/validations/auth-form.ts`
 * menggantikannya untuk klien, TANPA mengubah aturan maupun pesan.
 *
 * Test ini menjalankan korpus kasus yang sama melalui keduanya dan menuntut
 * hasil yang identik: field mana yang error, dan pesan pertamanya. Dengan
 * begitu keduanya tidak dapat menyimpang diam-diam.
 *
 * Catatan: yang dibandingkan adalah pesan PERTAMA per field, karena
 * `react-hook-form` hanya menampilkan satu pesan per field. Schema zod dapat
 * menghasilkan dua error untuk satu field (mis. email kosong), dan yang
 * terlihat pengguna selalu yang pertama.
 */

type Errors = Record<string, string | undefined>

function zodFirstErrors(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }): Errors {
    if (result.success) return {}
    const out: Errors = {}
    for (const issue of result.error?.issues ?? []) {
        const key = String(issue.path[0] ?? '')
        if (key && out[key] === undefined) out[key] = issue.message
    }
    return out
}

async function resolverErrors(
    resolver: (values: Record<string, unknown>) => Promise<{
        errors: Record<string, { message: string } | undefined>
    }>,
    values: Record<string, unknown>,
): Promise<Errors> {
    const result = await resolver(values)
    const out: Errors = {}
    for (const [key, value] of Object.entries(result.errors ?? {})) {
        if (value) out[key] = value.message
    }
    return out
}

const EMAIL_CORPUS = [
    '', '   ', 'a', 'a@b', 'a@b.c', 'user@example.com', 'USER@EXAMPLE.COM',
    'user+tag@sub.domain.co.id', 'user @example.com', 'user@example com',
    'üser@example.com', 'user@exämple.com', '  user@example.com  ',
    'user@@example.com', 'user@.com', 'user@example..com', '@example.com',
    'user@-example.com', 'user@example-.com', 'user@example.c',
    'user@example.123', 'user@123.456', 'user@example.museum',
    '.user@example.com', "o'brien@example.com", 'user_name@example.com',
    'user-name@example.com', 'user.name@example.com', 'user..name@example.com',
    'a@b.co', 'a@b.cd', 'x@y.zz',
]

const PASSWORD_CORPUS = ['', ' ', '        ', 'short', '1234567', '12345678', 'password123', 'a'.repeat(200)]
const NAME_CORPUS = ['', 'a', 'ab', 'abc', 'Nama Lengkap', 'x'.repeat(100), 'x'.repeat(101)]

describe('paritas login — zod vs resolver klien', () => {
    it('identik untuk seluruh kombinasi email × password', async () => {
        const mismatches: string[] = []

        for (const email of EMAIL_CORPUS) {
            for (const password of PASSWORD_CORPUS) {
                const expected = zodFirstErrors(loginSchema.safeParse({ email, password }))
                const actual = await resolverErrors(loginResolver, { email, password })

                if (JSON.stringify(expected) !== JSON.stringify(actual)) {
                    mismatches.push(
                        `email=${JSON.stringify(email)} password=${JSON.stringify(password)}` +
                        ` → zod=${JSON.stringify(expected)} resolver=${JSON.stringify(actual)}`,
                    )
                }
            }
        }

        expect(mismatches).toEqual([])
    })

    it('menerima kredensial yang sah', async () => {
        const actual = await resolverErrors(loginResolver, { email: 'user@example.com', password: 'password123' })
        expect(actual).toEqual({})
    })
})

describe('paritas register — zod vs resolver klien', () => {
    it('identik untuk seluruh kombinasi email × password × nama', async () => {
        const mismatches: string[] = []

        for (const email of EMAIL_CORPUS) {
            for (const password of PASSWORD_CORPUS) {
                for (const fullName of NAME_CORPUS) {
                    const expected = zodFirstErrors(registerSchema.safeParse({ email, password, fullName }))
                    const actual = await resolverErrors(registerResolver, { email, password, fullName })

                    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
                        mismatches.push(
                            `email=${JSON.stringify(email)} password=${JSON.stringify(password)}` +
                            ` fullName=${JSON.stringify(fullName.slice(0, 12))}(${fullName.length})` +
                            ` → zod=${JSON.stringify(expected)} resolver=${JSON.stringify(actual)}`,
                        )
                    }
                }
            }
        }

        expect(mismatches).toEqual([])
    })

    it('menerima pendaftaran yang sah', async () => {
        const actual = await resolverErrors(registerResolver, {
            email: 'user@example.com', password: 'password123', fullName: 'Nama Lengkap',
        })
        expect(actual).toEqual({})
    })
})

describe('bentuk hasil resolver', () => {
    it('mengembalikan values saat valid (dipakai react-hook-form)', async () => {
        const result = await loginResolver({ email: 'user@example.com', password: 'password123' })
        expect(result).toEqual({
            values: { email: 'user@example.com', password: 'password123' },
            errors: {},
        })
    })

    it('mengembalikan errors dan values kosong saat tidak valid', async () => {
        const result = await loginResolver({ email: '', password: '' })
        expect(result.values).toEqual({})
        expect(result.errors).toMatchObject({
            email: { message: 'Email wajib diisi' },
            password: { message: 'Password wajib diisi' },
        })
    })

    it('pesan error yang tampil sama persis dengan schema zod', async () => {
        const cases: Array<[Record<string, unknown>, Errors]> = [
            [{ email: '', password: '' }, { email: 'Email wajib diisi', password: 'Password wajib diisi' }],
            [{ email: 'bukan-email', password: 'x' }, { email: 'Format email tidak valid' }],
        ]
        for (const [input, expected] of cases) {
            expect(await resolverErrors(loginResolver, input)).toEqual(expected)
        }
    })
})
