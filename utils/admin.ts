import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function isAdmin() {
    // 1. Get authenticated user via cookie-based client (respects session)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // 2. Use service role client to bypass RLS when reading role from profiles
    // This prevents unauthorized errors if RLS on profiles table blocks the read
    const adminClient = await createAdminClient()
    const { data } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return data?.role === 'admin'
}
