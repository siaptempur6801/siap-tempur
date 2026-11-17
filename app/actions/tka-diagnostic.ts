'use server'

import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { EXAM_ACTION_RATE_LIMITED_MESSAGE, isExamActionRateLimited } from '@/lib/server-rate-limit'
import { createClient } from '@/lib/utils/supabase/server'

const DIAGNOSTIC_SLUG = 'tka-smp-diagnostic-awal'

type StartPayload = {
  attempt_id?: string
  resumed?: boolean
}

function diagnosticError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Attempt limit reached'))
    return 'Tes diagnostik hanya dapat dikerjakan satu kali.'
  if (message.includes('Active user track required'))
    return 'Aktifkan jalur TKA SMP terlebih dahulu.'
  if (message.includes('Exam is not active')) return 'Tes diagnostik belum dibuka.'
  if (
    message.includes('item count') ||
    message.includes('question count') ||
    message.includes('question version')
  ) {
    return 'Tes diagnostik belum siap. Silakan coba lagi nanti.'
  }
  return 'Tes diagnostik belum dapat dimulai.'
}

export async function startTkaSmpDiagnostic() {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Halaman perlu dimuat ulang. Setelah itu, coba lagi.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Silakan masuk kembali untuk memulai tes diagnostik.' }
  if (await isExamActionRateLimited(user.id, 'attempt_start')) {
    return { error: EXAM_ACTION_RATE_LIMITED_MESSAGE }
  }

  try {
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('code', 'TKA')
      .maybeSingle()
    if (programError) throw programError
    if (!program?.id) return { error: 'Program TKA belum tersedia.' }

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('program_id', program.id)
      .eq('code', 'SMP')
      .maybeSingle()
    if (trackError) throw trackError
    if (!track?.id) return { error: 'Jalur TKA SMP belum tersedia.' }

    const { data: userTrack, error: userTrackError } = await supabase
      .from('user_tracks')
      .select('status')
      .eq('user_id', user.id)
      .eq('track_id', track.id)
      .maybeSingle()
    if (userTrackError) throw userTrackError
    if (String(userTrack?.status ?? '').toLowerCase() !== 'active') {
      return { error: 'Aktifkan jalur TKA SMP terlebih dahulu.' }
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, status')
      .eq('track_id', track.id)
      .eq('slug', DIAGNOSTIC_SLUG)
      .maybeSingle()
    if (examError) throw examError
    if (!exam?.id || String(exam.status).toLowerCase() !== 'active') {
      return { error: 'Tes diagnostik belum dibuka.' }
    }

    const { data: attempts, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .order('attempt_number', { ascending: false })
      .limit(2)
    if (attemptError) throw attemptError

    const inProgress = (attempts ?? []).find(
      (attempt) => String(attempt.status).toLowerCase() === 'in_progress',
    )
    if (inProgress?.id) {
      return { success: true as const, sessionId: String(inProgress.id), resumed: true }
    }

    const completed = (attempts ?? []).find((attempt) =>
      ['completed', 'submitted'].includes(String(attempt.status).toLowerCase()),
    )
    if (completed?.id) {
      return { success: true as const, completedId: String(completed.id), resumed: false }
    }

    const { data, error } = await supabase.rpc('start_exam_attempt', { p_exam_id: exam.id })
    if (error) throw new Error(error.message)
    const payload = (data ?? {}) as StartPayload
    if (!payload.attempt_id) return { error: 'Tes diagnostik belum dapat dibuat.' }

    revalidatePath('/tka')
    revalidatePath('/tka/smp')
    revalidatePath('/tka/smp/diagnostic')
    return {
      success: true as const,
      sessionId: payload.attempt_id,
      resumed: payload.resumed === true,
    }
  } catch (error) {
    logger.warn('[tka-diagnostic] Failed to start diagnostic', {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return { error: diagnosticError(error) }
  }
}
