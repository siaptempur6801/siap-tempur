'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { isExamActionRateLimited } from '@/lib/server-rate-limit'
import { createV2Client } from '@/lib/utils/supabase/server'
import { organizationParticipantAssignmentService } from '@/src/services/organization-participant-assignment.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function startOrganizationAssignment(form: FormData) {
  await validateCsrf()
  const assignmentId = String(form.get('assignment_id') ?? '').trim()
  if (!UUID.test(assignmentId)) redirect('/cpns/dashboard/assignments?error=invalid')

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent('/cpns/dashboard/assignments')}`)
  if (await isExamActionRateLimited(user.id, 'attempt_start')) {
    redirect('/cpns/dashboard/assignments?error=rate-limited')
  }

  try {
    const started = await organizationParticipantAssignmentService.start(user.id, assignmentId)
    revalidatePath('/cpns/dashboard/assignments')
    const base =
      started.assignment.programCode === 'TKA'
        ? `/tka/${started.assignment.trackCode.toLowerCase()}/tryout`
        : '/cpns/dashboard/tryout'
    redirect(`${base}/${started.attemptId}`)
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error
    const message = error instanceof Error ? error.message : 'failed'
    const key =
      message === 'ASSIGNMENT_NOT_FOUND'
        ? 'not-found'
        : message === 'ASSESSMENT_UNAVAILABLE'
          ? 'unavailable'
          : message.startsWith('ASSIGNMENT_UPCOMING')
            ? 'upcoming'
            : message.startsWith('ASSIGNMENT_CLOSED')
              ? 'closed'
              : 'failed'
    redirect(`/cpns/dashboard/assignments?error=${key}`)
  }
}
