'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { createAdminClient, createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import {
  buildCertificateNumber,
  getCertificateKindForRank,
  normalizeCertificateName,
} from '@/lib/event-certificates'

type ClaimCertificateResult = {
  success: boolean
  message: string
  certificateNumber?: string
}

type EventRow = { id: string; code: string; title: string; status: string; ends_at: string }
type RegistrationRow = { id: string; status: string }
type RankingRow = { rank: number; score: number | null }
type TemplateRow = { id: string }
type ExistingCertificateRow = { certificate_number: string; name_locked_at: string | null }

function eventIsFinished(event: { status: string; ends_at: string }) {
  return String(event.status).toLowerCase() === 'closed' || Date.now() > Date.parse(event.ends_at)
}

export async function claimEventCertificate(
  eventId: string,
  rawCertificateName: string,
): Promise<ClaimCertificateResult> {
  try {
    await validateCsrf()
  } catch {
    return { success: false, message: 'Invalid request' }
  }

  const nameResult = normalizeCertificateName(rawCertificateName)
  if (!nameResult.success) return { success: false, message: nameResult.message }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cpns/dashboard/event')

  const admin = await createV2AdminClient()
  const { data: existingCertificate, error: existingError } = await admin
    .from('certificates')
    .select('certificate_number, name_locked_at')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError) {
    logger.error('Existing certificate fetch failed', existingError, { eventId, userId: user.id })
    return { success: false, message: 'Gagal memeriksa sertifikat.' }
  }
  const existing = existingCertificate as ExistingCertificateRow | null
  if (existing?.name_locked_at) {
    return {
      success: true,
      message: 'Sertifikat sudah tersedia.',
      certificateNumber: existing.certificate_number,
    }
  }

  const [{ data: event, error: eventError }, { data: registration, error: registrationError }] =
    await Promise.all([
      admin
        .from('events')
        .select('id, code, title, status, ends_at')
        .eq('id', eventId)
        .maybeSingle(),
      admin
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

  const eventRow = event as EventRow | null
  const registrationRow = registration as RegistrationRow | null
  if (eventError || !eventRow) return { success: false, message: 'Event tidak ditemukan.' }
  if (!eventIsFinished(eventRow))
    return { success: false, message: 'Sertifikat tersedia setelah event selesai.' }
  if (registrationError || String(registrationRow?.status).toLowerCase() !== 'completed') {
    return {
      success: false,
      message: 'Sertifikat hanya tersedia untuk peserta yang sudah menyelesaikan event.',
    }
  }

  const rpcAdmin = await createAdminClient()
  const { error: rankingSyncError } = await rpcAdmin.rpc('recalculate_event_rankings', {
    p_event_id: eventId,
  })
  if (rankingSyncError) {
    logger.error('Certificate ranking sync failed', rankingSyncError, { eventId, userId: user.id })
    return { success: false, message: 'Gagal memfinalisasi ranking sertifikat.' }
  }

  const [{ data: ranking, error: rankingError }, { data: template, error: templateError }] =
    await Promise.all([
      admin
        .from('event_rankings')
        .select('rank, score')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle(),
      admin
        .from('certificate_templates')
        .select('id')
        .eq('template_url', 'builtin:event-certificate-v1')
        .maybeSingle(),
    ])

  const rankingRow = ranking as RankingRow | null
  const templateRow = template as TemplateRow | null
  if (rankingError || !rankingRow)
    return { success: false, message: 'Data hasil event belum lengkap.' }
  if (templateError || !templateRow)
    return { success: false, message: 'Template sertifikat belum tersedia.' }

  const kind = getCertificateKindForRank(rankingRow.rank)
  const rank = kind === 'participant' ? null : rankingRow.rank
  const certificateNumber = buildCertificateNumber({
    eventCode: eventRow.code || eventRow.title,
    eventId,
    userId: user.id,
    kind,
  })
  const issuedAt = new Date().toISOString()

  const { data: certificate, error: insertError } = await admin
    .from('certificates')
    .insert({
      user_id: user.id,
      event_id: eventId,
      certificate_number: certificateNumber,
      certificate_name: nameResult.name,
      certificate_kind: kind,
      rank,
      score: Number(rankingRow.score ?? 0),
      template_id: templateRow.id,
      storage_path: `${eventId}/${user.id}/${certificateNumber}.pdf`,
      verification_code: certificateNumber,
      issued_at: issuedAt,
      name_locked_at: issuedAt,
      updated_at: issuedAt,
    })
    .select('certificate_number')
    .single()

  const insertedCertificate = certificate as { certificate_number: string } | null
  if (insertError || !insertedCertificate) {
    if (insertError?.code === '23505') {
      const { data: duplicateCertificate } = await admin
        .from('certificates')
        .select('certificate_number')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

      const duplicate = duplicateCertificate as { certificate_number: string } | null
      if (duplicate) {
        return {
          success: true,
          message: 'Sertifikat sudah tersedia.',
          certificateNumber: duplicate.certificate_number,
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
    certificateNumber: insertedCertificate.certificate_number,
  }
}
