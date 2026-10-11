import { createV2AdminClient } from '@/lib/utils/supabase/server'

export type SubjectProgressOverview = {
  subjectCode: 'TWK' | 'TIU' | 'TKP'
  attempts: number
  questionsAnswered: number
  accuracy: number
  masteryScore: number
  updatedAt: string
}

type ProgressRow = {
  subject_id: string
  attempts: number
  questions_answered: number
  accuracy: number
  mastery_score: number
  updated_at: string
}

const CPNS_SUBJECT_CODES = new Set(['TWK', 'TIU', 'TKP'])

function numberOrZero(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

class SubjectProgressReadRepository {
  async listCpnsProgress(userId: string): Promise<SubjectProgressOverview[]> {
    const admin = await createV2AdminClient()
    const { data: progressRows, error: progressError } = await admin
      .from('user_subject_progress')
      .select('subject_id, attempts, questions_answered, accuracy, mastery_score, updated_at')
      .eq('user_id', userId)

    if (progressError) throw progressError

    const rows = (progressRows ?? []) as ProgressRow[]
    if (rows.length === 0) return []

    const subjectIds = Array.from(new Set(rows.map((row) => row.subject_id)))
    const { data: subjectRows, error: subjectError } = await admin
      .from('subjects')
      .select('id, code')
      .in('id', subjectIds)

    if (subjectError) throw subjectError

    const subjectCodeById = new Map(
      ((subjectRows ?? []) as Array<{ id: string; code: string }>).map((row) => [
        row.id,
        row.code.toUpperCase(),
      ]),
    )

    return rows.flatMap((row) => {
      const code = subjectCodeById.get(row.subject_id)
      if (!code || !CPNS_SUBJECT_CODES.has(code)) return []

      return [
        {
          subjectCode: code as SubjectProgressOverview['subjectCode'],
          attempts: numberOrZero(row.attempts),
          questionsAnswered: numberOrZero(row.questions_answered),
          accuracy: numberOrZero(row.accuracy),
          masteryScore: numberOrZero(row.mastery_score),
          updatedAt: row.updated_at,
        },
      ]
    })
  }
}

export const subjectProgressReadRepository = new SubjectProgressReadRepository()
