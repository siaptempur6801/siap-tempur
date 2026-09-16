'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createV2Client, createV2AdminClient } from '@/lib/utils/supabase/server'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { resolvePostLogoutRedirect, sanitizeAuthReturnTo } from '@/lib/auth-redirect'
import { loginSchema, registerSchema } from '@/lib/validations/auth'
import { isAuthActionRateLimited } from '@/lib/server-rate-limit'
import * as z from 'zod'

const AUTH_RATE_LIMIT_MESSAGE = 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'

const emailOnlySchema = z.object({
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
})

const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Password lama harus diisi'),
    password: z.string().min(8, 'Password baru minimal 8 karakter'),
})

const newPasswordSchema = z.object({
    password: z.string().min(8, 'Password baru minimal 8 karakter'),
})

/** Ambil field FormData sebagai string — hindari cast `as string` yang bisa bernilai null. */
function formString(formData: FormData, key: string) {
    const value = formData.get(key)
    return typeof value === 'string' ? value : ''
}

/** Pesan error pertama dari Zod; form di client menampilkannya apa adanya. */
function validationMessage(error: z.ZodError) {
    return error.issues[0]?.message ?? 'Data tidak valid'
}

function callbackUrl(path = '/auth/callback') {
    return `${env.siteUrl()}${path}`
}

async function resolveAuthReturnTo(explicitReturnTo?: string | null) {
    if (explicitReturnTo) return sanitizeAuthReturnTo(explicitReturnTo)

    try {
        const requestHeaders = await headers()
        const referer = requestHeaders.get('referer')
        if (referer) {
            const url = new URL(referer)
            return sanitizeAuthReturnTo(url.searchParams.get('returnTo'))
        }
    } catch {
        // Fall back to the generic public entry below.
    }

    return sanitizeAuthReturnTo(null)
}

async function callbackUrlForReturnTo(returnTo?: string | null) {
    const url = new URL(callbackUrl())
    url.searchParams.set('next', await resolveAuthReturnTo(returnTo))
    return url.toString()
}

export async function login(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    // Validasi server-side: form di client tidak boleh jadi satu-satunya penjaga.
    const parsed = loginSchema.safeParse({
        email: formString(formData, 'email'),
        password: formString(formData, 'password'),
    })
    if (!parsed.success) return { error: validationMessage(parsed.error) }

    // Rate limit dipasang setelah validasi: hanya permintaan yang benar-benar akan
    // menyentuh Supabase Auth yang memakai kuota.
    if (await isAuthActionRateLimited('login')) {
        return { error: AUTH_RATE_LIMIT_MESSAGE }
    }

    const supabase = await createV2Client()
    const { email, password } = parsed.data

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        logger.warn('Login failed', { error: error.message })
        if (error.message.includes('Email not confirmed')) return { error: 'unverified' }
        return { error: 'Email atau password salah' }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signup(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const parsed = registerSchema.safeParse({
        email: formString(formData, 'email'),
        password: formString(formData, 'password'),
        fullName: formString(formData, 'fullName'),
    })
    if (!parsed.success) return { error: validationMessage(parsed.error) }

    if (await isAuthActionRateLimited('signup')) {
        return { error: AUTH_RATE_LIMIT_MESSAGE }
    }

    const supabase = await createV2Client()
    const { email, password, fullName } = parsed.data
    const returnTo = await resolveAuthReturnTo(formString(formData, 'returnTo') || null)

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: await callbackUrlForReturnTo(returnTo),
        },
    })

    if (error) {
        logger.warn('Signup failed', { error: error.message })
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signout(redirectTo = '/') {
    try { await validateCsrf() } catch { return { success: false, error: 'Invalid request' } }
    const supabase = await createV2Client()
    const { error } = await supabase.auth.signOut()
    if (error) return { success: false, error: 'Belum bisa keluar' }
    redirect(resolvePostLogoutRedirect(redirectTo))
}

export async function updatePassword(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const parsed = changePasswordSchema.safeParse({
        oldPassword: formString(formData, 'oldPassword'),
        password: formString(formData, 'password'),
    })
    if (!parsed.success) return { error: validationMessage(parsed.error) }

    const supabase = await createV2Client()
    const { password, oldPassword } = parsed.data

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || !user.email) return { error: 'User tidak ditemukan' }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: oldPassword })
    if (signInError) return { error: 'Password lama salah' }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }

    const admin = await createV2AdminClient()
    await admin.auth.admin.signOut(user.id, 'others').catch(() => undefined)
    revalidatePath('/cpns/dashboard/profile')
    return { success: true }
}

export async function loginWithGoogle(returnTo?: string | null) {
    try {
        await validateCsrf()
    } catch (error) {
        logger.warn('Google login CSRF validation failed', {
            error: error instanceof Error ? error.message : String(error),
        })
        return { error: 'Invalid request' }
    }

    const supabase = await createV2Client()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: await callbackUrlForReturnTo(returnTo),
            queryParams: { access_type: 'offline', prompt: 'consent' },
        },
    })

    if (error) return { error: error.message }
    if (data.url) return { url: data.url }
    return { error: 'No URL returned' }
}

export async function resendVerificationEmail(email: string, returnTo?: string | null) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const parsed = emailOnlySchema.safeParse({ email: typeof email === 'string' ? email : '' })
    if (!parsed.success) return { error: validationMessage(parsed.error) }

    if (await isAuthActionRateLimited('resendVerification', parsed.data.email)) {
        return { error: AUTH_RATE_LIMIT_MESSAGE }
    }

    const supabase = await createV2Client()
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: parsed.data.email,
        options: { emailRedirectTo: await callbackUrlForReturnTo(returnTo) },
    })
    if (error) return { error: error.message }
    return { success: true }
}

export async function resetPassword(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const parsed = newPasswordSchema.safeParse({ password: formString(formData, 'password') })
    if (!parsed.success) return { error: validationMessage(parsed.error) }

    const supabase = await createV2Client()
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) return { error: error.message }
    return { success: true }
}

export async function forgotPassword(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const parsed = emailOnlySchema.safeParse({ email: formString(formData, 'email') })
    if (!parsed.success) return { error: validationMessage(parsed.error) }

    // Dibatasi per IP dan per email: action ini memicu pengiriman email.
    if (await isAuthActionRateLimited('forgotPassword', parsed.data.email)) {
        return { error: AUTH_RATE_LIMIT_MESSAGE }
    }

    const supabase = await createV2Client()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: callbackUrl('/auth/callback?next=/auth/reset-password'),
    })
    if (error) return { error: error.message }
    return { success: true }
}
