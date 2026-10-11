import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type ReviewGroup = {
  subject: 'TWK' | 'TIU' | 'TKP'
  status: 'reviewed' | 'needs_revision' | 'blocked'
  primary: string | null
  secondary: string | null
  questionCodes: string[]
}

type ReviewArtifact = {
  expectedQuestionCount: number
  groups: ReviewGroup[]
  needsRevisionNotes: Record<string, string>
}

const artifact = JSON.parse(
  readFileSync(new URL('../../data/cpns_legacy_mapping_review_v1.json', import.meta.url), 'utf8'),
) as ReviewArtifact

const expanded = artifact.groups.flatMap((group) =>
  group.questionCodes.map((questionCode) => ({ ...group, questionCode })),
)

describe('CPNS legacy mapping review artifact', () => {
  it('contains exactly 439 unique explicit question-code decisions', () => {
    expect(artifact.expectedQuestionCount).toBe(439)
    expect(expanded).toHaveLength(439)
    expect(new Set(expanded.map((row) => row.questionCode)).size).toBe(439)
  })

  it('covers the expected CPNS subject inventory', () => {
    const counts = expanded.reduce<Record<string, number>>((acc, row) => {
      acc[row.subject] = (acc[row.subject] ?? 0) + 1
      return acc
    }, {})

    expect(counts).toEqual({ TIU: 116, TKP: 113, TWK: 210 })
  })

  it('has 433 reviewed and six intentionally unresolved decisions', () => {
    expect(expanded.filter((row) => row.status === 'reviewed')).toHaveLength(433)
    expect(expanded.filter((row) => row.status === 'needs_revision')).toHaveLength(6)
    expect(expanded.filter((row) => row.status === 'blocked')).toHaveLength(0)

    expect(
      expanded
        .filter((row) => row.status === 'needs_revision')
        .map((row) => row.questionCode)
        .sort(),
    ).toEqual(['TIU-000033', 'TIU-000064', 'TIU-000065', 'TWK-000385', 'TWK-000448', 'TWK-000461'])
  })

  it('never stores a guessed node on an unresolved question', () => {
    for (const row of expanded) {
      if (row.status === 'reviewed') {
        expect(row.primary, row.questionCode).toBeTruthy()
        expect(row.secondary, row.questionCode).not.toBe(row.primary)
      } else {
        expect(row.primary, row.questionCode).toBeNull()
        expect(row.secondary, row.questionCode).toBeNull()
        expect(artifact.needsRevisionNotes[row.questionCode], row.questionCode).toBeTruthy()
      }
    }
  })
})
