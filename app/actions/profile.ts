'use server'

import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import { passwordUpdateSchema, profileInfoSchema } from '@/lib/validations/profile'

export async function updateProfile(formData: FormData) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const parsedProfile = profileInfoSchema.safeParse({
        full_name: String(formData.get('fullName') || ''),
        avatar_url: String(formData.get('avatarUrl') || ''),
    })

    if (!parsedProfile.success) {
        return { error: parsedProfile.error.issues[0]?.message || 'Data profil tidak valid' }
    }

    const updates: Record<string, string | null | undefined> = {
        updated_at: new Date().toISOString(),
    }

    if (parsedProfile.data.full_name !== undefined) updates.full_name = parsedProfile.data.full_name
    if (parsedProfile.data.avatar_url !== undefined) updates.avatar_url = parsedProfile.data.avatar_url

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        logger.error('Profile update failed', error, { userId: user.id })
        return { error: 'Gagal memperbarui profil' }
    }

    revalidatePath('/cpns/dashboard', 'layout')
    revalidatePath('/cpns/dashboard/profile')
    return { success: true }
}

export async function updateProfileInfo(data: {
    full_name?: string
    bio?: string
    avatar_url?: string
    phone_number?: string
    birth_date?: string
    gender?: string
    education_level?: string
    target_instance?: string
}) {
    try { await validateCsrf() } catch { return { success: false, error: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Not authenticated' }

    const parsedProfile = profileInfoSchema.safeParse(data)
    if (!parsedProfile.success) {
        return {
            success: false,
            error: parsedProfile.error.issues[0]?.message || 'Data profil tidak valid',
        }
    }

    const updates: Record<string, string | null | undefined> = {
        updated_at: new Date().toISOString(),
    }

    if (parsedProfile.data.full_name !== undefined) updates.full_name = parsedProfile.data.full_name
    if (parsedProfile.data.bio !== undefined) updates.bio = parsedProfile.data.bio
    if (parsedProfile.data.avatar_url !== undefined) updates.avatar_url = parsedProfile.data.avatar_url
    if (parsedProfile.data.phone_number !== undefined) updates.phone = parsedProfile.data.phone_number
    if (parsedProfile.data.birth_date !== undefined) updates.birth_date = parsedProfile.data.birth_date
    if (parsedProfile.data.gender !== undefined) updates.gender = parsedProfile.data.gender
    if (parsedProfile.data.education_level !== undefined) updates.education_level = parsedProfile.data.education_level
    if (parsedProfile.data.target_instance !== undefined) updates.target_instance = parsedProfile.data.target_instance

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        logger.error('Profile info update failed', error, { userId: user.id })
        return { success: false, error: 'Gagal memperbarui profil' }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/cpns/dashboard', 'layout')
    revalidatePath('/cpns/dashboard/profile')
    return { success: true }
}

export async function updatePassword(data: { newPassword: string }) {
    try { await validateCsrf() } catch { return { success: false, error: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Not authenticated' }

    const parsedPassword = passwordUpdateSchema.safeParse(data)
    if (!parsedPassword.success) {
        return {
            success: false,
            error: parsedPassword.error.issues[0]?.message || 'Password tidak valid',
        }
    }

    const { error } = await supabase.auth.updateUser({ password: parsedPassword.data.newPassword })
    if (error) {
        logger.error('Password update failed', error, { userId: user.id })
        return { success: false, error: 'Gagal memperbarui password' }
    }

    const admin = await createAdminClient()
    await admin.auth.admin.signOut(user.id, 'others').catch(() => {})
    return { success: true }
}

export async function claimVoucherCode(_code: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    return {
        success: false,
        message: 'Voucher sedang dimigrasikan ke Promotions Schema V2 dan sementara belum dapat diklaim.',
    }
}

export async function deleteAccount() {
    try { await validateCsrf() } catch { return { success: false, error: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Not authenticated' }

    try {
        const adminClient = await createAdminClient()
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
        if (deleteError) throw deleteError
        await supabase.auth.signOut()
        return { success: true }
    } catch (error) {
        logger.error('Delete account failed', error, { userId: user.id })
        return { success: false, error: 'Terjadi kesalahan saat menghapus akun' }
    }
}
