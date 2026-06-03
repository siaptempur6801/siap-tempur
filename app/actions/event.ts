'use server'

import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'

type RegisterTryoutEventResult = {
    success: boolean
    message: string
}

type StartTryoutEventResult = {
    session_id: string | null
    resumed: boolean
    message: string
}

export async function registerTryoutEvent(eventId: string, eventCode?: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()

    const { data, error } = await admin
        .rpc('register_tryout_event_participant', {
            p_user_id: user.id,
            p_event_id: eventId,
            p_event_code: eventCode || null,
        })
        .single()

    const result = data as RegisterTryoutEventResult | null

    if (error || !result) {
        return { success: false, message: error?.message || 'Gagal daftar Tryout Akbar' }
    }

    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard')
    return { success: Boolean(result.success), message: result.message }
}

export async function startTryoutEvent(eventId: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()

    const { data, error } = await admin
        .rpc('start_tryout_event_session', {
            p_user_id: user.id,
            p_event_id: eventId,
        })
        .single()

    const result = data as StartTryoutEventResult | null

    if (error || !result?.session_id) {
        return { success: false, message: error?.message || result?.message || 'Gagal membuat session event' }
    }

    revalidatePath('/cpns/dashboard/event')
    return { success: true, sessionId: result.session_id, resumed: Boolean(result.resumed) }
}
