'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { resolvePostLoginRedirect } from '@/lib/auth-redirect'
import { buildConsentRecord } from '@/lib/consent'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { createV2Client } from '@/lib/utils/supabase/server'
import { consentSchema } from '@/lib/validations/auth'

function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function consentPage(next: string, error: string) {
  return `/persetujuan?next=${encodeURIComponent(next)}&error=${error}`
}

/**
 * Menyimpan persetujuan S&K, Kebijakan Privasi, dan keterangan usia untuk akun yang
 * belum punya catatan persetujuan (akun Google baru dan akun lama). Lihat `lib/consent.ts`.
 */
export async function acceptConsent(formData: FormData) {
  const next = resolvePostLoginRedirect(formString(formData, 'next'))

  try {
    await validateCsrf()
  } catch {
    redirect(consentPage(next, 'request'))
  }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent('/persetujuan')}`)

  const parsed = consentSchema.safeParse({
    acceptTerms: formString(formData, 'acceptTerms'),
    ageBasis: formString(formData, 'ageBasis'),
  })
  if (!parsed.success) redirect(consentPage(next, 'invalid'))

  const { error } = await supabase.auth.updateUser({
    data: { consent: buildConsentRecord(parsed.data.ageBasis) },
  })
  if (error) {
    logger.warn('[consent] gagal menyimpan persetujuan', { error: error.message, userId: user.id })
    redirect(consentPage(next, 'save'))
  }

  revalidatePath('/', 'layout')
  redirect(next)
}
