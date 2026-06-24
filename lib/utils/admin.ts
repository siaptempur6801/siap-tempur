import { createClient, createAdminClient } from '@/lib/utils/supabase/server'
export { canAccessArticleAdmin, canPublishArticle, isAdminRole, isArticleWriterRole } from '@/lib/utils/roles'
import { isAdminRole } from '@/lib/utils/roles'

export async function getCurrentUserRole(): Promise<{ userId: string; role: string } | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const adminClient = await createAdminClient()
    const { data } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return { userId: user.id, role: data?.role || 'user' }
}

export async function isAdmin() {
    const actor = await getCurrentUserRole()
    return isAdminRole(actor?.role)
}
