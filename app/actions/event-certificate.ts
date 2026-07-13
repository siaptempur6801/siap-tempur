'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import {
    buildCertificateNumber,
    getCertificateKindForRank,
    normalizeCertificateName,
} from '@/lib/event-certificates'
import { getEventCertificateRankings } from '@/lib/event-certificate-snapshots'

type CertificateEventRow = {
    id: string
    title: string
    status: string
    certificate_enabled: boolean | null
    certificate_released_at: string | null
}

async function getCertificateRank(admin: Awaited<ReturnType<typeof createAdminClient>>, eventId: string, userId: string) {
    try {
        const ranked = await getEventCertificateRankings(admin, eventId)
        return ranked.find((candidate) => candidate.user_id === userId) || null
    } catch (error) {
        logger.error('Certificate rank fetch failed', error, { eventId, userId })
        throw new Error('Gagal memeriksa ranking sertifikat')
    }
}

export async function claimEventCertificate(eventId: string, rawCertificateName: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const nameResult = normalizeCertificateName(rawCertificateName)
    if (!nameResult.success) {
        return { success: false, message: nameResult.message }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()

    const { data: existingCertificate, error: existingError } = await admin
        .from('event_certificates')
        .select('id, certificate_number, certificate_name, storage_path, name_locked_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingError) {
        logger.error('Existing certificate fetch failed', existingError, { eventId, userId: user.id })
        return { success: false, message: 'Gagal memeriksa sertifikat.' }
    }

    if (existingCertificate?.name_locked_at) {
        return {
            success: true,
            message: 'Sertifikat sudah tersedia.',
            certificateNumber: existingCertificate.certificate_number as string,
        }
    }

    const { data: event, error: eventError } = await admin
        .from('tryout_events')
        .select('id, title, status, certificate_enabled, certificate_released_at')
        .eq('id', eventId)
        .maybeSingle()

    const certificateEvent = event as CertificateEventRow | null
    if (eventError || !certificateEvent) {
        return { success: false, message: 'Event tidak ditemukan.' }
    }

    if (certificateEvent.status !== 'closed' || !certificateEvent.certificate_enabled || !certificateEvent.certificate_released_at) {
        return { success: false, message: 'Sertifikat event belum dirilis.' }
    }

    const { data: participant, error: participantError } = await admin
        .from('tryout_event_participants')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (participantError || participant?.status !== 'completed') {
        return { success: false, message: 'Sertifikat hanya tersedia untuk peserta yang sudah menyelesaikan event.' }
    }

    if (existingCertificate) {
        const now = new Date().toISOString()
        const storagePath = existingCertificate.storage_path
            ? String(existingCertificate.storage_path)
            : `${eventId}/${user.id}/${existingCertificate.certificate_number}.pdf`

        if (existingCertificate.storage_path) {
            const { error: removeError } = await admin.storage
                .from('event-certificates')
                .remove([String(existingCertificate.storage_path)])

            if (removeError) {
                logger.warn('Old unlocked certificate PDF removal failed', {
                    error: removeError.message,
                    eventId,
                    userId: user.id,
                    storagePath,
                })
            }
        }

        const { data: lockedCertificate, error: updateError } = await admin
            .from('event_certificates')
            .update({
                certificate_name: nameResult.name,
                storage_path: storagePath,
                generated_at: now,
                name_locked_at: now,
                updated_at: now,
                updated_by: user.id,
            })
            .eq('id', existingCertificate.id)
            .is('name_locked_at', null)
            .select('certificate_number')
            .maybeSingle()

        if (updateError) {
            logger.error('Certificate name lock failed', updateError, { eventId, userId: user.id })
            return { success: false, message: 'Gagal menyimpan nama sertifikat.' }
        }

        if (lockedCertificate) {
            revalidatePath('/cpns/dashboard/event')
            return {
                success: true,
                message: 'Nama sertifikat tersimpan. Sertifikat siap diunduh.',
                certificateNumber: lockedCertificate.certificate_number as string,
            }
        }

        const { data: lockedAfterRace } = await admin
            .from('event_certificates')
            .select('certificate_number')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (lockedAfterRace) {
            return {
                success: true,
                message: 'Sertifikat sudah tersedia.',
                certificateNumber: lockedAfterRace.certificate_number as string,
            }
        }
    }

    const rankedEntry = await getCertificateRank(admin, eventId, user.id)
    if (!rankedEntry) {
        return { success: false, message: 'Data hasil event belum lengkap.' }
    }

    const kind = getCertificateKindForRank(rankedEntry.rank)
    const rank = kind === 'participant' ? null : rankedEntry.rank
    const certificateNumber = buildCertificateNumber({
        eventCode: certificateEvent.title,
        eventId,
        userId: user.id,
        kind,
    })
    const storagePath = `${eventId}/${user.id}/${certificateNumber}.pdf`

    const { data: certificate, error: insertError } = await admin
        .from('event_certificates')
        .insert({
            event_id: eventId,
            user_id: user.id,
            certificate_number: certificateNumber,
            certificate_name: nameResult.name,
            certificate_kind: kind,
            rank,
            score: Math.trunc(Number(rankedEntry.total_score || 0)),
            storage_path: storagePath,
            generated_at: new Date().toISOString(),
            name_locked_at: new Date().toISOString(),
            created_by: user.id,
        })
        .select('certificate_number')
        .single()

    if (insertError || !certificate) {
        if (insertError?.code === '23505') {
            const { data: duplicateCertificate } = await admin
                .from('event_certificates')
                .select('certificate_number')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (duplicateCertificate) {
                return {
                    success: true,
                    message: 'Sertifikat sudah tersedia.',
                    certificateNumber: duplicateCertificate.certificate_number as string,
                }
            }
        }

        logger.error('Certificate insert failed', insertError, { eventId, userId: user.id })
        return { success: false, message: 'Gagal membuat sertifikat.' }
    }

    revalidatePath('/cpns/dashboard/event')
    return {
        success: true,
        message: 'Nama sertifikat tersimpan. Sertifikat siap diunduh.',
        certificateNumber: certificate.certificate_number as string,
    }
}
