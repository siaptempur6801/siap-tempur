import { NextResponse } from 'next/server'
import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { normalizeCertificateName, type EventCertificateKind } from '@/lib/event-certificates'
import type { CertificateRenderInput } from '@/lib/event-certificate-pdf'
import { authorizationService } from '@/src/services/authorization.service'

type CertificateRow = {
  id: string
  event_id: string
  user_id: string
  certificate_number: string
  certificate_name: string
  certificate_kind: EventCertificateKind
  rank: number | null
  score: number | null
  storage_path: string
  issued_at: string
  name_locked_at: string | null
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

async function getCertificatePassingStatus(
  admin: Awaited<ReturnType<typeof createV2AdminClient>>,
  eventId: string,
  userId: string,
) {
  const { data } = await admin
    .from('exam_attempts')
    .select('passed')
    .eq('user_id', userId)
    .contains('metadata', { eventId })
    .in('status', ['completed', 'COMPLETED'])
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  return Boolean(data?.passed)
}

export async function getAuthorizedCertificateRenderData(certificateNumber: string): Promise<
  | { response: NextResponse }
  | {
      admin: Awaited<ReturnType<typeof createV2AdminClient>>
      row: CertificateRow
      storagePath: string
      input: CertificateRenderInput
    }
> {
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = await createV2AdminClient()
  const { data: certificate, error } = await admin
    .from('certificates')
    .select(
      'id, event_id, user_id, certificate_number, certificate_name, certificate_kind, rank, score, storage_path, issued_at, name_locked_at',
    )
    .eq('certificate_number', certificateNumber)
    .maybeSingle()

  const row = certificate as CertificateRow | null
  if (error || !row) {
    return { response: NextResponse.json({ error: 'Sertifikat tidak ditemukan' }, { status: 404 }) }
  }

  if (row.user_id !== user.id) {
    const authorization = await authorizationService.getAuthorizationForUser(user.id)
    if (!authorization?.permissions.includes('admin.access')) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
  }

  const { data: event } = await admin
    .from('events')
    .select('title')
    .eq('id', row.event_id)
    .maybeSingle()
  const isPassed = await getCertificatePassingStatus(admin, row.event_id, row.user_id)

  return {
    admin,
    row,
    storagePath: row.storage_path,
    input: {
      certificateNumber: row.certificate_number,
      certificateName: row.certificate_name,
      certificateKind: row.certificate_kind,
      eventTitle: typeof event?.title === 'string' ? event.title : 'Tryout Akbar Siap Tempur',
      rank: row.rank,
      score: row.score,
      isPassed,
      issuedAt: row.issued_at,
      verifyUrl: `${getSiteUrl().replace(/\/$/, '')}/verify-certificate/${row.certificate_number}`,
    },
  }
}

export function applyUnlockedCertificateNameOverride(
  input: CertificateRenderInput,
  row: Pick<CertificateRow, 'name_locked_at'>,
  rawName: string | null,
) {
  if (row.name_locked_at || !rawName) return input

  const normalized = normalizeCertificateName(rawName)
  if (!normalized.success) return input

  return {
    ...input,
    certificateName: normalized.name,
  }
}
