'use server'

import { createClient } from '@/utils/supabase/server'

export async function deleteAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Step 1: Delete all practice sessions
        const { error: sessionsError } = await supabase
            .from('practice_sessions')
            .delete()
            .eq('user_id', user.id)

        if (sessionsError) {
            console.error('Error deleting sessions:', sessionsError)
            return { success: false, error: 'Gagal menghapus data latihan' }
        }

        // Step 2: Delete all session results
        const { error: resultsError } = await supabase
            .from('session_results')
            .delete()
            .eq('user_id', user.id)

        if (resultsError) {
            console.error('Error deleting results:', resultsError)
            return { success: false, error: 'Gagal menghapus data hasil latihan' }
        }

        // Step 3: Delete user profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id)

        if (profileError) {
            console.error('Error deleting profile:', profileError)
            return { success: false, error: 'Gagal menghapus profil' }
        }

        // Step 4: Delete auth user (this will also sign out the user)
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

        if (authError) {
            console.error('Error deleting auth user:', authError)
            return { success: false, error: 'Gagal menghapus akun autentikasi' }
        }

        return { success: true }
    } catch (error) {
        console.error('Unexpected error during account deletion:', error)
        return { success: false, error: 'Terjadi kesalahan yang tidak terduga' }
    }
}
