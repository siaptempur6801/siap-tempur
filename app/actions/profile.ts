'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // Extract Data
    const avatarUrl = formData.get('avatarUrl') as string

    const updates: Record<string, string | undefined> = {
        updated_at: new Date().toISOString(),
        full_name: formData.get('fullName') as string,
    }

    if (avatarUrl) {
        updates.avatar_url = avatarUrl
    }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        console.error('Update profile error', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateProfileInfo(data: { full_name?: string; bio?: string; avatar_url?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const updates: Record<string, string | undefined> = {
        updated_at: new Date().toISOString()
    }

    if (data.full_name !== undefined) updates.full_name = data.full_name
    if (data.bio !== undefined) updates.bio = data.bio
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        console.error('Update profile error', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/profile')
    return { success: true }
}

export async function updatePassword(data: { newPassword: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase.auth.updateUser({
        password: data.newPassword
    })

    if (error) {
        console.error('Update password error', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
