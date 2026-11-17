'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

function text(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function activateTkaTrackAction(form: FormData) {
  await validateCsrf()

  const level = parseTkaLevel(text(form, 'level'))
  if (!level) redirect('/tka?error=Jenjang+TKA+tidak+valid')

  const path = tkaLevelPath(level)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`)

  const targetYearRaw = text(form, 'target_year')
  const targetYear = targetYearRaw ? Number(targetYearRaw) : null
  if (
    targetYear !== null &&
    (!Number.isInteger(targetYear) || targetYear < 2025 || targetYear > 2100)
  ) {
    redirect(`${path}?error=${encodeURIComponent('Tahun target tidak valid.')}`)
  }

  const schoolName = text(form, 'school_name') || null
  const schoolGrade = text(form, 'school_grade') || null

  const { error } = await supabase.rpc('activate_user_track', {
    p_program_code: 'TKA',
    p_track_code: level,
    p_target_year: targetYear,
    p_school_name: schoolName,
    p_school_grade: schoolGrade,
  })
  if (error) {
    redirect(`${path}?error=${encodeURIComponent('Gagal mengaktifkan jalur TKA. Coba lagi.')}`)
  }

  revalidatePath('/tka')
  revalidatePath(path)
  redirect(`${path}?activated=1`)
}
