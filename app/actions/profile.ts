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

    const updates: any = {
        updated_at: new Date().toISOString(),
        full_name: formData.get('fullName') as string,
        education: formData.get('education') as string,
        target_score: Number(formData.get('targetScore')) || 0,
        study_hours_per_day: Number(formData.get('studyHours')) || 0,
        cpns_year: Number(formData.get('cpnsYear')) || 2024,
        reminder_enabled: formData.get('reminderEnabled') === 'on',
        reminder_time: formData.get('reminderTime') as string,
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

export async function updateProfileInfo(data: { full_name: string; bio: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name,
            bio: data.bio,
            updated_at: new Date().toISOString()
        })
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
