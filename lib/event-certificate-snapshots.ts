import { buildCertificateNumber, getCertificateKindForRank, normalizeCertificateName, rankCertificateCandidates } from '@/lib/event-certificates'
import type { createAdminClient } from '@/lib/utils/supabase/server'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

type CertificateSessionRow = {
    user_id: string
    finished_at: string | null
    test_sessions: {
        status: string
        total_score: number | null
        end_time: string | null
    } | Array<{
        status: string
        total_score: number | null
        end_time: string | null
    }> | null
}

type CertificateProfileRow = {
    id: string
    full_name: string | null
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] || null
    return value || null
}

function certificateFallbackName(value: string | null | undefined) {
    const normalized = normalizeCertificateName(value || '')
    return normalized.success ? normalized.name : 'Nama Peserta'
}

export async function getEventCertificateRankings(admin: AdminClient, eventId: string) {
    const { data: sessions, error } = await admin
        .from('tryout_event_sessions')
        .select('user_id, finished_at, test_sessions(status, total_score, end_time)')
        .eq('event_id', eventId)
        .eq('status', 'completed')

    if (error) throw error

    const candidates = ((sessions || []) as CertificateSessionRow[])
        .map((session) => {
            const testSession = firstRelated(session.test_sessions)
            if (testSession?.status !== 'completed') return null

            return {
                user_id: session.user_id,
                total_score: testSession.total_score || 0,
                completed_at: session.finished_at || testSession.end_time,
            }
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))

    return rankCertificateCandidates(candidates)
}

export async function createMissingEventCertificateSnapshots({
    admin,
    eventId,
    eventTitle,
    actorId,
}: {
    admin: AdminClient
    eventId: string
    eventTitle: string
    actorId: string
}) {
    const ranked = await getEventCertificateRankings(admin, eventId)
    if (ranked.length === 0) {
        return { created: 0, total: 0 }
    }

    const userIds = ranked.map((candidate) => candidate.user_id)
    const [{ data: existing }, { data: profiles }] = await Promise.all([
        admin
            .from('event_certificates')
            .select('user_id')
            .eq('event_id', eventId)
            .in('user_id', userIds),
        admin
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds),
    ])

    const existingUserIds = new Set((existing || []).map((row) => row.user_id as string))
    const profileMap = new Map(
        ((profiles || []) as CertificateProfileRow[]).map((profile) => [profile.id, profile.full_name])
    )

    const rows = ranked
        .filter((candidate) => !existingUserIds.has(candidate.user_id))
        .map((candidate) => {
            const kind = getCertificateKindForRank(candidate.rank)
            const rank = kind === 'participant' ? null : candidate.rank
            const certificateNumber = buildCertificateNumber({
                eventCode: eventTitle,
                eventId,
                userId: candidate.user_id,
                kind,
            })

            return {
                event_id: eventId,
                user_id: candidate.user_id,
                certificate_number: certificateNumber,
                certificate_name: certificateFallbackName(profileMap.get(candidate.user_id)),
                certificate_kind: kind,
                rank,
                score: Math.trunc(Number(candidate.total_score || 0)),
                storage_path: `${eventId}/${candidate.user_id}/${certificateNumber}.pdf`,
                generated_at: null,
                name_locked_at: null,
                created_by: actorId,
            }
        })

    if (rows.length === 0) {
        return { created: 0, total: ranked.length }
    }

    const { error } = await admin
        .from('event_certificates')
        .insert(rows)

    if (error) throw error

    return { created: rows.length, total: ranked.length }
}
