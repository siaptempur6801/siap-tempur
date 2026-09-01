import { createClient } from '@/lib/utils/supabase/server'

type RecordValue = Record<string, unknown>

export type TkaReadinessSubject = {
    subjectId: string
    subjectCode: string
    subjectName: string
    readinessScore: number
    confidenceScore: number
    assessableNodes: number
    evidencedNodes: number
}

export type TkaReadinessView = {
    available: boolean
    readinessScore: number
    readinessPercent: number
    readinessLevel: 'building_foundation' | 'developing' | 'almost_ready' | 'ready'
    confidenceScore: number
    confidencePercent: number
    confidenceLevel: 'low' | 'moderate' | 'high'
    calculationVersion: string
    calculatedAt: string | null
    formula: string
    subjects: TkaReadinessSubject[]
}

function asRecord(value: unknown): RecordValue | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as RecordValue
}

function readString(record: RecordValue | null, key: string) {
    const value = record?.[key]
    return typeof value === 'string' ? value : null
}

function readNumber(record: RecordValue | null, key: string) {
    const value = record?.[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function parseSubject(value: unknown): TkaReadinessSubject | null {
    const row = asRecord(value)
    const subjectId = readString(row, 'subject_id')
    const subjectCode = readString(row, 'subject_code')
    const subjectName = readString(row, 'subject_name')
    if (!subjectId || !subjectCode || !subjectName) return null

    return {
        subjectId,
        subjectCode,
        subjectName,
        readinessScore: readNumber(row, 'readiness_score') ?? 0,
        confidenceScore: readNumber(row, 'confidence_score') ?? 0,
        assessableNodes: readNumber(row, 'assessable_nodes') ?? 0,
        evidencedNodes: readNumber(row, 'evidenced_nodes') ?? 0,
    }
}

export class TkaReadinessService {
    async getReadiness(): Promise<TkaReadinessView | null> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_tka_smp_readiness')
        if (error) throw error

        const payload = asRecord(data)
        if (payload?.available !== true) return null

        const readinessLevel = readString(payload, 'readiness_level')
        const confidenceLevel = readString(payload, 'confidence_level')
        if (!readinessLevel || !['building_foundation', 'developing', 'almost_ready', 'ready'].includes(readinessLevel)) return null
        if (!confidenceLevel || !['low', 'moderate', 'high'].includes(confidenceLevel)) return null

        const subjects = (Array.isArray(payload.subjects) ? payload.subjects : [])
            .flatMap((value) => {
                const subject = parseSubject(value)
                return subject ? [subject] : []
            })
            .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode))

        return {
            available: true,
            readinessScore: readNumber(payload, 'readiness_score') ?? 0,
            readinessPercent: readNumber(payload, 'readiness_percent') ?? 0,
            readinessLevel: readinessLevel as TkaReadinessView['readinessLevel'],
            confidenceScore: readNumber(payload, 'confidence_score') ?? 0,
            confidencePercent: readNumber(payload, 'confidence_percent') ?? 0,
            confidenceLevel: confidenceLevel as TkaReadinessView['confidenceLevel'],
            calculationVersion: readString(payload, 'calculation_version') ?? 'tka_smp_readiness_v1',
            calculatedAt: readString(payload, 'calculated_at'),
            formula: readString(payload, 'formula') ?? '0.75_mean_subject_readiness_plus_0.25_weakest_subject_v1',
            subjects,
        }
    }
}

export const tkaReadinessService = new TkaReadinessService()
