'use server'

import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'

function isWithinStartWindow(event: {
    starts_at: string
    ends_at: string
    start_grace_minutes: number
    status: string
}) {
    const now = Date.now()
    const startsAt = new Date(event.starts_at).getTime()
    const endsAt = new Date(event.ends_at).getTime()
    const latestStartAt = startsAt + event.start_grace_minutes * 60 * 1000

    return event.status === 'live' && now >= startsAt && now <= latestStartAt && now <= endsAt
}

export async function registerTryoutEvent(eventId: string, eventCode?: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()

    const { data: event, error: eventError } = await admin
        .from('tryout_events')
        .select('id, status, max_participants, requires_code')
        .eq('id', eventId)
        .single()

    if (eventError || !event) {
        return { success: false, message: 'Event tidak ditemukan' }
    }

    if (!['scheduled', 'live'].includes(event.status)) {
        return { success: false, message: 'Event belum dibuka untuk pendaftaran' }
    }

    const { data: existingParticipant } = await admin
        .from('tryout_event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingParticipant) {
        return { success: true, message: 'Kamu sudah terdaftar di event ini' }
    }

    if (event.max_participants) {
        const { count } = await admin
            .from('tryout_event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)

        if ((count || 0) >= event.max_participants) {
            return { success: false, message: 'Kuota peserta event sudah penuh' }
        }
    }

    let eventCodeId: string | null = null
    const normalizedCode = String(eventCode || '').trim().toUpperCase()

    if (event.requires_code) {
        if (!normalizedCode) return { success: false, message: 'Kode masuk wajib diisi untuk event ini' }

        const { data: code, error: codeError } = await admin
            .from('tryout_event_codes')
            .select('id, max_uses, used_count, is_active, expires_at')
            .eq('event_id', eventId)
            .eq('code', normalizedCode)
            .maybeSingle()

        if (codeError) return { success: false, message: codeError.message }
        if (!code) return { success: false, message: 'Kode masuk tidak ditemukan' }
        if (!code.is_active) return { success: false, message: 'Kode masuk sudah tidak aktif' }
        if (code.expires_at && new Date(code.expires_at).getTime() <= Date.now()) {
            return { success: false, message: 'Kode masuk sudah kadaluarsa' }
        }
        if (code.used_count >= code.max_uses) {
            return { success: false, message: 'Limit penggunaan kode masuk sudah penuh' }
        }

        const { data: claimedCode, error: claimError } = await admin
            .from('tryout_event_codes')
            .update({
                used_count: code.used_count + 1,
                updated_at: new Date().toISOString(),
            })
            .eq('id', code.id)
            .eq('used_count', code.used_count)
            .select('id')
            .single()

        if (claimError || !claimedCode) {
            return { success: false, message: 'Kode sedang dipakai peserta lain. Coba daftar lagi.' }
        }

        eventCodeId = claimedCode.id
    }

    const { error } = await admin
        .from('tryout_event_participants')
        .insert({
            event_id: eventId,
            event_code_id: eventCodeId,
            user_id: user.id,
            status: 'registered',
        })

    if (error) {
        if (eventCodeId) {
            await admin.rpc('decrement_tryout_event_code_usage', { p_code_id: eventCodeId })
        }
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard')
    return { success: true, message: 'Berhasil daftar Tryout Akbar' }
}

export async function startTryoutEvent(eventId: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()

    const { data: existingEventSession } = await admin
        .from('tryout_event_sessions')
        .select('session_id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingEventSession?.session_id) {
        return { success: true, sessionId: existingEventSession.session_id, resumed: true }
    }

    const { data: event, error: eventError } = await admin
        .from('tryout_events')
        .select('id, status, starts_at, ends_at, start_grace_minutes')
        .eq('id', eventId)
        .single()

    if (eventError || !event) {
        return { success: false, message: 'Event tidak ditemukan' }
    }

    if (!isWithinStartWindow(event)) {
        return { success: false, message: 'Event belum live atau start window sudah ditutup' }
    }

    const { data: participant } = await admin
        .from('tryout_event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (!participant) {
        return { success: false, message: 'Daftar event terlebih dahulu sebelum mulai' }
    }

    const { data: eventQuestions, error: questionsError } = await admin
        .from('tryout_event_questions')
        .select('question_id')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })

    if (questionsError || !eventQuestions || eventQuestions.length === 0) {
        return { success: false, message: 'Paket soal event belum digenerate admin' }
    }

    const { data: session, error: sessionError } = await admin
        .from('test_sessions')
        .insert({
            user_id: user.id,
            mode: 'tryout',
            status: 'in_progress',
            start_time: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single()

    if (sessionError || !session) {
        return { success: false, message: sessionError?.message || 'Gagal membuat session event' }
    }

    const { error: answersError } = await admin
        .from('test_answers')
        .insert(eventQuestions.map((question) => ({
            session_id: session.id,
            question_id: question.question_id,
        })))

    if (answersError) {
        await admin.from('test_sessions').delete().eq('id', session.id)
        return { success: false, message: answersError.message }
    }

    const { error: eventSessionError } = await admin
        .from('tryout_event_sessions')
        .insert({
            event_id: eventId,
            user_id: user.id,
            session_id: session.id,
            status: 'started',
            started_at: new Date().toISOString(),
        })

    if (eventSessionError) {
        await admin.from('test_sessions').delete().eq('id', session.id)
        return { success: false, message: eventSessionError.message }
    }

    await admin
        .from('tryout_event_participants')
        .update({ status: 'started' })
        .eq('event_id', eventId)
        .eq('user_id', user.id)

    revalidatePath('/cpns/dashboard/event')
    return { success: true, sessionId: session.id, resumed: false }
}
