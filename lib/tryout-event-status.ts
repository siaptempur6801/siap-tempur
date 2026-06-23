import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export async function autoCloseExpiredTryoutEvents(admin?: AdminClient) {
    const supabase = admin || await createAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('tryout_events')
        .update({ status: 'closed', updated_at: now })
        .in('status', ['scheduled', 'live'])
        .lt('ends_at', now)
        .select('id')

    if (error) {
        logger.warn('[auto-close-expired-events]', { error })
        return 0
    }

    return data?.length || 0
}
