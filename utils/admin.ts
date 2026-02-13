import { createClient } from '@/utils/supabase/server'

export async function isAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // optimization: if we have the role in metadata, use it (need to sync first)
    // but for now, safe check against DB
    const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return data?.role === 'admin'
}
