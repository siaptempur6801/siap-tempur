'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createV2Client, createV2AdminClient } from '@/lib/utils/supabase/server'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { resolvePostLogoutRedirect, sanitizeAuthReturnTo } from '@/lib/auth-redirect'

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
    const supabase = await createV2Client()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

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
    const supabase = await createV2Client()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const returnTo = await resolveAuthReturnTo(formData.get('returnTo') as string | null)

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
    const supabase = await createV2Client()
    const password = formData.get('password') as string
    const oldPassword = formData.get('oldPassword') as string

    if (!password || password.length < 8) return { error: 'Password baru minimal 8 karakter' }
    if (!oldPassword) return { error: 'Password lama harus diisi' }

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
    const supabase = await createV2Client()
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: await callbackUrlForReturnTo(returnTo) },
    })
    if (error) return { error: error.message }
    return { success: true }
}

export async function resetPassword(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }
    const supabase = await createV2Client()
    const password = formData.get('password') as string
    if (!password || password.length < 8) return { error: 'Password baru minimal 8 karakter' }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { success: true }
}

export async function forgotPassword(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }
    const supabase = await createV2Client()
    const email = formData.get('email') as string
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl('/auth/callback?next=/auth/reset-password'),
    })
    if (error) return { error: error.message }
    return { success: true }
}
