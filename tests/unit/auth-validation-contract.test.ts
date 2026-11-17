import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '../../lib/validations/auth'

const repoRoot = resolve(__dirname, '../..')
const authActions = readFileSync(resolve(repoRoot, 'app/auth/actions.ts'), 'utf8')

/** Isi satu server action, dari deklarasinya sampai action berikutnya. */
function actionBody(source: string, name: string) {
    const start = source.indexOf(`export async function ${name}`)
    if (start === -1) return ''
    const next = source.indexOf('export async function', start + 1)
    return source.slice(start, next === -1 ? undefined : next)
}

describe('auth server action validation contract', () => {
    it('login memvalidasi input dengan zod di server', () => {
        const body = actionBody(authActions, 'login')
        expect(body).not.toBe('')
        expect(body).toContain('loginSchema.safeParse')
        expect(body).toContain('validationMessage(parsed.error)')
    })

    it('signup memvalidasi input dengan zod di server', () => {
        const body = actionBody(authActions, 'signup')
        expect(body).not.toBe('')
        expect(body).toContain('registerSchema.safeParse')
        expect(body).toContain('validationMessage(parsed.error)')
    })

    it('forgotPassword, resetPassword, dan resendVerificationEmail ikut divalidasi', () => {
        expect(actionBody(authActions, 'forgotPassword')).toContain('emailOnlySchema.safeParse')
        expect(actionBody(authActions, 'resetPassword')).toContain('newPasswordSchema.safeParse')
        expect(actionBody(authActions, 'resendVerificationEmail')).toContain('emailOnlySchema.safeParse')
        expect(actionBody(authActions, 'updatePassword')).toContain('changePasswordSchema.safeParse')
    })

    it('tidak ada lagi cast FormData yang bisa menghasilkan null', () => {
        expect(authActions).not.toMatch(/formData\.get\([^)]*\)\s*as\s+string/)
    })

    it('schema bersama menolak input tidak valid', () => {
        expect(loginSchema.safeParse({ email: 'bukan-email', password: 'x' }).success).toBe(false)
        expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
        expect(registerSchema.safeParse({ email: 'a@b.com', password: 'pendek', fullName: 'Nama' }).success).toBe(false)
        expect(registerSchema.safeParse({ email: 'a@b.com', password: 'password123', fullName: 'Nama Panjang' }).success).toBe(true)
    })
})
