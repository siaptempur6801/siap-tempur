'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { organizationInviteService } from '@/src/services/organization.service'
import { logger } from '@/lib/logger'

/**
 * Aksi peserta: bergabung ke batch lewat tautan undangan (PRD §10.3).
 *
 * Berbeda dari aksi admin lain, aksi ini TIDAK memerlukan permission khusus —
 * pesertanya adalah pengguna biasa. Yang menjaganya:
 *
 *   1. `validateCsrf()`;
 *   2. sesi harus valid (RPC menolak tanpa `auth.uid()`);
 *   3. RPC selalu bertindak atas nama `auth.uid()` — id pengguna tidak pernah
 *      datang dari klien, jadi tidak ada cara mendaftarkan orang lain;
 *   4. token undangan divalidasi di database, termasuk status batch dan instansi.
 */

function text(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'JOIN_FAILED'
  const known: Record<string, string> = {
    'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
    'Invite token is required': 'Tautan undangan tidak lengkap.',
    'Invite link is not valid': 'Tautan undangan tidak dikenali.',
    'This batch is no longer open': 'Batch ini sudah ditutup dan tidak menerima peserta baru.',
    'This organization is inactive': 'Instansi ini sedang nonaktif.',
  }
  return known[message] || message
}

function backTo(token: string, ok?: string, error?: unknown): never {
  const path = `/cpns/join/${encodeURIComponent(token)}`
  revalidatePath(path)
  const params = new URLSearchParams()
  if (ok && !error) params.set('ok', ok)
  if (error) params.set('error', friendlyError(error))
  const query = params.toString()
  redirect(query ? `${path}?${query}` : path)
}

export async function joinBatchAction(form: FormData) {
  const token = text(form, 'token')
  let failure: unknown = null
  let message = ''
  try {
    await validateCsrf()
    if (!token) throw new Error('Invite token is required')

    const result = await organizationInviteService.join(token, {
      fullName: text(form, 'full_name'),
      phone: text(form, 'phone'),
      unit: text(form, 'unit'),
      jabatan: text(form, 'jabatan'),
    })

    message = result.alreadyJoined
      ? `Anda sudah terdaftar di batch ini dengan kode ${result.participantCode}.`
      : result.claimed
        ? `Berhasil bergabung. Data Anda dari instansi ditautkan dengan kode ${result.participantCode}.`
        : `Berhasil bergabung dengan kode peserta ${result.participantCode}.`
  } catch (error) {
    failure = error
    logger.warn('[joinBatchAction] gagal', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  if (failure) backTo(token, undefined, failure)
  backTo(token, message)
}
