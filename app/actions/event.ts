'use server'

import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { eventService, EventDomainError } from '@/src/services/event.service'
import { commerceService } from '@/src/services/commerce.service'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function eventErrorMessage(error: unknown) {
  if (error instanceof EventDomainError) return error.message
  return error instanceof Error ? error.message : 'Terjadi kesalahan pada event'
}

export async function registerTryoutEvent(eventId: string, _eventCode?: string) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, message: 'Invalid request' }
  }
  if (!isUuid(eventId)) return { success: false, message: 'Event tidak valid' }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cpns/dashboard/event')

  try {
    const paidOffer = await commerceService.getEventOffer(eventId)
    if (paidOffer && paidOffer.price > 0) {
      const admin = await createV2AdminClient()
      const { data: registration, error } = await admin
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      if (!registration) {
        return { success: false, message: 'Selesaikan pembayaran tiket event terlebih dahulu' }
      }
    }

    const result = await eventService.register(user.id, eventId)
    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard')
    return {
      success: true,
      message: result.alreadyRegistered
        ? 'Kamu sudah terdaftar di event ini'
        : 'Pendaftaran event berhasil',
    }
  } catch (error) {
    return { success: false, message: eventErrorMessage(error) }
  }
}

export async function startTryoutEvent(eventId: string) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, message: 'Invalid request' }
  }
  if (!isUuid(eventId)) return { success: false, message: 'Event tidak valid' }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cpns/dashboard/event')

  try {
    const result = await eventService.start(user.id, eventId)
    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard')
    return {
      success: true,
      sessionId: result.attemptId,
      sessionPath: result.sessionPath,
      resumed: result.resumed,
      completed: result.completed,
    }
  } catch (error) {
    return { success: false, message: eventErrorMessage(error) }
  }
}
