'use server'

import { revalidatePath } from 'next/cache'
import { createV2Client, createV2AdminClient } from '@/lib/utils/supabase/server'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'

function callbackUrl(path = '/auth/callback') {
    return `${env.siteUrl()}${path}`
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

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: callbackUrl(),
        },
    })

    if (error) {
        logger.warn('Signup failed', { error: error.message })
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signout() {
    try { await validateCsrf() } catch { return { success: false, error: 'Invalid request' } }
    const supabase = await createV2Client()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    revalidatePath('/cpns')
    return { success: true }
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

export async function loginWithGoogle() {
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
            redirectTo: callbackUrl(),
            queryParams: { access_type: 'offline', prompt: 'consent' },
        },
    })

    if (error) return { error: error.message }
    if (data.url) return { url: data.url }
    return { error: 'No URL returned' }
}

export async function resendVerificationEmail(email: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }
    const supabase = await createV2Client()
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: callbackUrl() },
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
