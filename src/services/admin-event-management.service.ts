import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import { assessmentCatalogService } from '@/src/services/assessment-catalog.service'
import { getAdminCatalog, normalizeEventFlyerUrl, sameId, slugify, validPositive } from '@/src/services/admin-service-utils'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

export class AdminEventManagementService {
    async saveEvent(input: {
        id?: string | null
        code: string
        title: string
        slug?: string | null
        description?: string | null
        flyerImageUrl?: string | null
        registrationStart?: string | null
        registrationEnd?: string | null
        startsAt: string
        endsAt: string
        status: string
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await getAdminCatalog(input.context)
        const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-')
        const slug = slugify(input.slug || input.title)
        if (!code || !input.title.trim() || !slug) throw new Error('EVENT_FIELDS_REQUIRED')
        if (Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EVENT_TIME_INVALID')
        if (input.registrationStart && input.registrationEnd && Date.parse(input.registrationStart) >= Date.parse(input.registrationEnd)) {
            throw new Error('EVENT_REGISTRATION_TIME_INVALID')
        }
        if (input.registrationEnd && Date.parse(input.registrationEnd) > Date.parse(input.endsAt)) {
            throw new Error('EVENT_REGISTRATION_TIME_INVALID')
        }

        const payload = {
            code,
            title: input.title.trim(),
            slug,
            event_type: 'tryout_akbar',
            program_id: catalog.program.id,
            track_id: catalog.track.id,
            description: input.description?.trim() || null,
            flyer_image_url: normalizeEventFlyerUrl(input.flyerImageUrl),
            registration_start: input.registrationStart || null,
            registration_end: input.registrationEnd || null,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            status: input.status,
        }

        if (input.id) {
            const [{ data: current, error: currentError }, { data: sessions, error: sessionsError }] = await Promise.all([
                admin.from('events').select('id, program_id, track_id').eq('id', input.id).maybeSingle(),
                admin.from('event_sessions').select('starts_at, ends_at, status').eq('event_id', input.id),
            ])
            if (currentError) throw currentError
            if (sessionsError) throw sessionsError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('EVENT_CATALOG_MISMATCH')
            }
            const hasSessionOutsideNewSchedule = (sessions || []).some((session) =>
                !['archived', 'cancelled'].includes(String(session.status).toLowerCase())
                && (Date.parse(String(session.starts_at)) < Date.parse(input.startsAt)
                    || Date.parse(String(session.ends_at)) > Date.parse(input.endsAt))
            )
            if (hasSessionOutsideNewSchedule) throw new Error('EVENT_TIME_CONFLICTS_WITH_SESSION')
            const { error } = await admin.from('events').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }

        const { data, error } = await admin.from('events').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async archiveEvent(eventId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin.from('events').update({ status: 'archived' }).eq('id', eventId)
        if (error) throw error
    }

    async saveEventSession(input: {
        id?: string | null
        eventId: string
        examId: string
        name: string
        startsAt: string
        endsAt: string
        capacity?: number | null
        status: string
        context?: ProgramTrackContext
    }) {
        if (!input.name.trim()) throw new Error('EVENT_SESSION_NAME_REQUIRED')
        if (Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EVENT_SESSION_TIME_INVALID')
        if (!validPositive(input.capacity)) throw new Error('EVENT_SESSION_CAPACITY_INVALID')

        const admin = await createV2AdminClient()
        const catalog = await getAdminCatalog(input.context)
        const [{ data: event, error: eventError }, assessment] = await Promise.all([
            admin.from('events').select('id, program_id, track_id, starts_at, ends_at').eq('id', input.eventId).maybeSingle(),
            assessmentCatalogService.getById(input.examId),
        ])
        if (eventError) throw eventError
        if (!event) throw new Error('EVENT_NOT_FOUND')
        if (!assessment) throw new Error('EVENT_ASSESSMENT_NOT_READY')
        if (!sameId(event.program_id, catalog.program.id) || !sameId(event.track_id, catalog.track.id)) throw new Error('EVENT_CATALOG_MISMATCH')
        if (!sameId(assessment.programId, event.program_id) || !sameId(assessment.trackId, event.track_id)) throw new Error('EVENT_EXAM_MISMATCH')
        if (Date.parse(input.startsAt) < Date.parse(String(event.starts_at)) || Date.parse(input.endsAt) > Date.parse(String(event.ends_at))) {
            throw new Error('EVENT_SESSION_OUTSIDE_EVENT')
        }

        const payload = {
            event_id: input.eventId,
            exam_id: input.examId,
            name: input.name.trim(),
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            capacity: input.capacity ?? null,
            status: input.status,
        }
        if (input.id) {
            const { data: currentSession, error: sessionError } = await admin
                .from('event_sessions')
                .select('id, event_id')
                .eq('id', input.id)
                .maybeSingle()
            if (sessionError) throw sessionError
            if (!currentSession || !sameId(currentSession.event_id, input.eventId)) throw new Error('EVENT_SESSION_MISMATCH')
            const { error } = await admin.from('event_sessions').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin.from('event_sessions').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async deleteEventSession(input: { eventId: string; sessionId: string; context?: ProgramTrackContext }) {
        const admin = await createV2AdminClient()
        const untyped = await createAdminClient()
        const catalog = await getAdminCatalog(input.context)
        const [{ data: event, error: eventError }, { data: session, error: sessionError }] = await Promise.all([
            admin.from('events').select('id, program_id, track_id').eq('id', input.eventId).maybeSingle(),
            admin.from('event_sessions').select('id, event_id').eq('id', input.sessionId).maybeSingle(),
        ])
        if (eventError) throw eventError
        if (sessionError) throw sessionError
        if (!event) throw new Error('EVENT_NOT_FOUND')
        if (!sameId(event.program_id, catalog.program.id) || !sameId(event.track_id, catalog.track.id)) throw new Error('EVENT_CATALOG_MISMATCH')
        if (!session || !sameId(session.event_id, input.eventId)) throw new Error('EVENT_SESSION_MISMATCH')

        const [{ count: registrations, error: registrationsError }, { count: tickets, error: ticketsError }] = await Promise.all([
            untyped.from('event_registrations').select('id', { count: 'exact', head: true }).eq('session_id', input.sessionId),
            untyped.from('event_products').select('product_id', { count: 'exact', head: true }).eq('session_id', input.sessionId),
        ])
        if (registrationsError) throw registrationsError
        if (ticketsError) throw ticketsError
        if ((registrations ?? 0) > 0) throw new Error('EVENT_SESSION_HAS_REGISTRATIONS')
        if ((tickets ?? 0) > 0) throw new Error('EVENT_SESSION_HAS_TICKETS')

        const { error } = await admin.from('event_sessions').delete().eq('id', input.sessionId).eq('event_id', input.eventId)
        if (error) throw error
    }

    async linkEventProduct(input: { eventId: string; sessionId: string; productId: string; status?: string }) {
        const admin = await createV2AdminClient()
        const untyped = await createAdminClient()
        const [{ data: session, error: sessionError }, { data: event, error: eventError }, { data: product, error: productError }] = await Promise.all([
            admin.from('event_sessions').select('id, event_id').eq('id', input.sessionId).maybeSingle(),
            admin.from('events').select('id, program_id, track_id').eq('id', input.eventId).maybeSingle(),
            admin.from('products').select('id, program_id, track_id, status').eq('id', input.productId).maybeSingle(),
        ])
        if (sessionError) throw sessionError
        if (eventError) throw eventError
        if (productError) throw productError
        if (!session || !sameId(session.event_id, input.eventId)) throw new Error('EVENT_SESSION_MISMATCH')
        if (!event || !product) throw new Error('EVENT_PRODUCT_MISMATCH')
        if (!sameId(product.program_id, event.program_id) || !sameId(product.track_id, event.track_id)) throw new Error('EVENT_PRODUCT_MISMATCH')
        if (String(product.status).toLowerCase() === 'archived') throw new Error('EVENT_PRODUCT_ARCHIVED')

        const { error } = await untyped
            .from('event_products')
            .upsert({
                product_id: input.productId,
                event_id: input.eventId,
                session_id: input.sessionId,
                status: input.status ?? 'active',
            }, { onConflict: 'product_id' })
        if (error) throw error
    }
}

export const adminEventManagementService = new AdminEventManagementService()
