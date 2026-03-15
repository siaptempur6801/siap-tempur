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

    revalidatePath('/cpns/dashboard', 'layout')
    return { success: true }
}

export async function updateProfileInfo(data: {
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    phone_number?: string;
    birth_date?: string;
    gender?: string;
    education_level?: string;
    target_instance?: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const updates: Record<string, string | null | undefined> = {
        updated_at: new Date().toISOString()
    }

    if (data.full_name !== undefined) updates.full_name = data.full_name
    if (data.bio !== undefined) updates.bio = data.bio
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url
    if (data.phone_number !== undefined) updates.phone_number = data.phone_number || null
    if (data.birth_date !== undefined) updates.birth_date = data.birth_date || null
    if (data.gender !== undefined) updates.gender = data.gender || null
    if (data.education_level !== undefined) updates.education_level = data.education_level || null
    if (data.target_instance !== undefined) updates.target_instance = data.target_instance || null

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        console.error('Update profile error', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/cpns/dashboard', 'layout')
    revalidatePath('/cpns/dashboard/profile')
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

export async function deleteAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
        if (deleteError) throw deleteError
        await supabase.auth.signOut()
        return { success: true }
    } catch (error: any) {
        console.error('Delete account error:', error)
        return { success: false, error: error.message }
    }
}


