import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { PASSING_GRADES } from '@/lib/constants'
import { normalizeCertificateName, type EventCertificateKind } from '@/lib/event-certificates'
import type { CertificateRenderInput } from '@/lib/event-certificate-pdf'

type CertificateRow = {
    id: string
    event_id: string
    user_id: string
    certificate_number: string
    certificate_name: string
    certificate_kind: EventCertificateKind
    rank: number | null
    score: number | null
    storage_path: string | null
    generated_at: string | null
    name_locked_at: string | null
    tryout_events: { title: string } | Array<{ title: string }> | null
}

type CertificateScoreSessionRow = {
    test_sessions: {
        is_passed: boolean | null
        score_twk: number | null
        score_tiu: number | null
        score_tkp: number | null
    } | Array<{
        is_passed: boolean | null
        score_twk: number | null
        score_tiu: number | null
        score_tkp: number | null
    }> | null
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] || null
    return value || null
}

function getSiteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

async function getCertificatePassingStatus(
    admin: Awaited<ReturnType<typeof createAdminClient>>,
    eventId: string,
    userId: string
) {
    const { data } = await admin
        .from('tryout_event_sessions')
        .select('test_sessions(is_passed, score_twk, score_tiu, score_tkp)')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .maybeSingle()

    const row = data as CertificateScoreSessionRow | null
    const testSession = firstRelated(row?.test_sessions)
    if (!testSession) return false

    return Boolean(testSession.is_passed) || (
        Number(testSession.score_twk || 0) >= PASSING_GRADES.TWK &&
        Number(testSession.score_tiu || 0) >= PASSING_GRADES.TIU &&
        Number(testSession.score_tkp || 0) >= PASSING_GRADES.TKP
    )
}

export async function getAuthorizedCertificateRenderData(certificateNumber: string): Promise<
    | { response: NextResponse }
    | {
        admin: Awaited<ReturnType<typeof createAdminClient>>
        row: CertificateRow
        storagePath: string
        input: CertificateRenderInput
    }
> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const admin = await createAdminClient()
    const { data: certificate, error } = await admin
        .from('event_certificates')
        .select('id, event_id, user_id, certificate_number, certificate_name, certificate_kind, rank, score, storage_path, generated_at, name_locked_at, tryout_events(title)')
        .eq('certificate_number', certificateNumber)
        .maybeSingle()

    const row = certificate as CertificateRow | null
    if (error || !row) {
        return { response: NextResponse.json({ error: 'Sertifikat tidak ditemukan' }, { status: 404 }) }
    }

    if (row.user_id !== user.id) {
        const { data: profile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile || !['admin', 'superadmin'].includes(String(profile.role))) {
            return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
        }
    }

    const event = firstRelated(row.tryout_events)
    const isPassed = await getCertificatePassingStatus(admin, row.event_id, row.user_id)
    const storagePath = row.storage_path || `${row.event_id}/${row.user_id}/${row.certificate_number}.pdf`

    return {
        admin,
        row,
        storagePath,
        input: {
            certificateNumber: row.certificate_number,
            certificateName: row.certificate_name,
            certificateKind: row.certificate_kind,
            eventTitle: event?.title || 'Tryout Akbar Siap Tempur',
            rank: row.rank,
            score: row.score,
            isPassed,
            issuedAt: row.generated_at || new Date().toISOString(),
            verifyUrl: `${getSiteUrl().replace(/\/$/, '')}/verify-certificate/${row.certificate_number}`,
        },
    }
}

export function applyUnlockedCertificateNameOverride(
    input: CertificateRenderInput,
    row: Pick<CertificateRow, 'name_locked_at'>,
    rawName: string | null
) {
    if (row.name_locked_at || !rawName) return input

    const normalized = normalizeCertificateName(rawName)
    if (!normalized.success) return input

    return {
        ...input,
        certificateName: normalized.name,
    }
}
