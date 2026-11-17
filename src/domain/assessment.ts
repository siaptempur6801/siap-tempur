export type AssessmentDomainCode = 'CPNS' | 'TKA'
export type AssessmentKind = 'TRYOUT' | 'MINI_TRYOUT' | 'DRILL'
type AssessmentReference = {
  id: string
  domain: AssessmentDomainCode
  kind: AssessmentKind
  level: string | null
  trackCode: string
}

export type AssessmentCatalogEntry = AssessmentReference & {
  title: string
  slug: string
  status: string
  durationSeconds: number | null
  questionCount: number
}

const DISTRIBUTABLE_KINDS: Record<string, AssessmentKind> = {
  FULL_TRYOUT: 'TRYOUT',
  MINI_TRYOUT: 'MINI_TRYOUT',
  DRILL: 'DRILL',
}

export function assessmentKindForExamType(value: string): AssessmentKind | null {
  return DISTRIBUTABLE_KINDS[value.trim().toUpperCase()] ?? null
}

export function assessmentDomainForProgram(value: string): AssessmentDomainCode | null {
  const code = value.trim().toUpperCase()
  return code === 'CPNS' || code === 'TKA' ? code : null
}

export function assessmentIsReady(status: string, questionCount: number): boolean {
  return (
    ['ACTIVE', 'SCHEDULED', 'PUBLISHED', 'READY'].includes(status.trim().toUpperCase()) &&
    Number.isFinite(questionCount) &&
    questionCount > 0
  )
}
