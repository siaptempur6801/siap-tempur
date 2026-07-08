import { PASSING_GRADES } from '@/lib/constants'

type PassingGradeSubject = 'TWK' | 'TIU' | 'TKP'

export type PassingGradeLeaderboardEntry = {
    entry_id: string
    user_id: string
    score_twk: number
    score_tiu: number
    score_tkp: number
    total_score: number
    live_rank: number
    started_at: string
    question_counts?: {
        twk: number
        tiu: number
        tkp: number
    }
}

export type PassingGradeLeaderboardSection<T extends PassingGradeLeaderboardEntry> = {
    key: 'passed' | 'below'
    title: string
    description: string
    entries: T[]
}

const DEFAULT_PASSING_GRADE_SUBJECTS: PassingGradeSubject[] = ['TWK', 'TIU', 'TKP']

function getActivePassingGradeSubjects(entries: PassingGradeLeaderboardEntry[]): PassingGradeSubject[] {
    const questionCounts = entries.find((entry) => entry.question_counts)?.question_counts
    if (!questionCounts) return DEFAULT_PASSING_GRADE_SUBJECTS

    const subjects: PassingGradeSubject[] = []
    if (questionCounts.twk > 0) subjects.push('TWK')
    if (questionCounts.tiu > 0) subjects.push('TIU')
    if (questionCounts.tkp > 0) subjects.push('TKP')

    return subjects.length > 0 ? subjects : DEFAULT_PASSING_GRADE_SUBJECTS
}

function formatSubjectList(subjects: PassingGradeSubject[]) {
    if (subjects.length <= 1) return subjects[0] || 'materi yang diujikan'
    if (subjects.length === 2) return `${subjects[0]} dan ${subjects[1]}`

    return `${subjects.slice(0, -1).join(', ')}, dan ${subjects[subjects.length - 1]}`
}

export function hasPassedSkdPassingGrade(
    entry: Pick<PassingGradeLeaderboardEntry, 'score_twk' | 'score_tiu' | 'score_tkp'>,
    activeSubjects: PassingGradeSubject[] = DEFAULT_PASSING_GRADE_SUBJECTS
) {
    return activeSubjects.every((subject) => {
        if (subject === 'TWK') return entry.score_twk >= PASSING_GRADES.TWK
        if (subject === 'TIU') return entry.score_tiu >= PASSING_GRADES.TIU
        return entry.score_tkp >= PASSING_GRADES.TKP
    })
}

function compareLeaderboardEntries<T extends PassingGradeLeaderboardEntry>(a: T, b: T) {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score

    const startedAtA = new Date(a.started_at).getTime()
    const startedAtB = new Date(b.started_at).getTime()
    if (startedAtA !== startedAtB) return startedAtA - startedAtB

    return a.entry_id.localeCompare(b.entry_id)
}

function rankSection<T extends PassingGradeLeaderboardEntry>(entries: T[], rankOffset = 0) {
    return [...entries]
        .sort(compareLeaderboardEntries)
        .map((entry, index) => ({
            ...entry,
            live_rank: rankOffset + index + 1,
        }))
}

export function buildPassingGradeLeaderboardSections<T extends PassingGradeLeaderboardEntry>(
    entries: T[]
): PassingGradeLeaderboardSection<T>[] {
    const activeSubjects = getActivePassingGradeSubjects(entries)
    const subjectList = formatSubjectList(activeSubjects)
    const passedEntries = entries.filter((entry) => hasPassedSkdPassingGrade(entry, activeSubjects))
    const belowEntries = entries.filter((entry) => !hasPassedSkdPassingGrade(entry, activeSubjects))
    const rankedPassedEntries = rankSection(passedEntries) as T[]
    const rankedBelowEntries = rankSection(belowEntries, rankedPassedEntries.length) as T[]

    return [
        {
            key: 'passed',
            title: 'Passing Grade',
            description: `Peserta yang sudah memenuhi passing grade ${subjectList}.`,
            entries: rankedPassedEntries,
        },
        {
            key: 'below',
            title: 'Di Bawah Passing Grade',
            description: `Peserta yang sudah mulai tetapi belum memenuhi passing grade ${subjectList}.`,
            entries: rankedBelowEntries,
        },
    ]
}
