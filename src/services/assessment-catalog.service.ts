import { createV2AdminClient } from '@/lib/utils/supabase/server'
import {
    assessmentDomainForProgram,
    assessmentIsReady,
    assessmentKindForExamType,
    type AssessmentCatalogEntry,
} from '@/src/domain/assessment'
import type { ResolvedExam } from '@/src/repositories/exam.repository'

export type CatalogAssessment = AssessmentCatalogEntry & ResolvedExam & {
    programCode: string
    trackCode: string
    status: string
}

type AssessmentCatalogDatabase = Awaited<ReturnType<typeof createV2AdminClient>>

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null
}

function asRows(value: unknown): Row[] {
    return Array.isArray(value) ? value.flatMap((item) => {
        const row = asRecord(item)
        return row ? [row] : []
    }) : []
}

function value(record: Row, key: string): string {
    return record[key] == null ? '' : String(record[key])
}

function nestedCode(record: Row, key: string): string {
    const relation = asRecord(record[key])
    return relation ? value(relation, 'code') : ''
}

export class AssessmentCatalogService {
    /**
     * Read the shared CPNS/TKA assessment catalog for distribution channels.
     * The existing `exams` table remains canonical; this is a read adapter,
     * not another assessment store.
     */
    async listDistributable(database?: AssessmentCatalogDatabase, examIds?: readonly string[], supplied?: ReadonlyMap<string, {bound_count:number;sections:unknown}>): Promise<CatalogAssessment[]> {
        const db = database ?? await createV2AdminClient()
        if (examIds && !examIds.length) return []
        let query = db
            .from('exams')
            .select('id, program_id, track_id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, access_type, required_feature_id, token_cost, starts_at, ends_at, status, programs!inner(code), tracks!inner(code), exam_types!inner(code)')
            .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED', 'published', 'PUBLISHED', 'ready', 'READY'])
            .order('title', { ascending: true })
        if (examIds) query = query.in('id', [...examIds])
        const {data,error} = await query
        if (error) throw error

        const raw = asRows(data)
        if (raw.length === 0) return []
        const ids = raw.map((row) => value(row, 'id')).filter(Boolean)
        const supplyByExam = supplied ?? await (async () => {
            const {data, error} = await db.rpc('admin_assessment_supply', {p_exam_ids: ids})
            if (error) throw error
            return new Map((data || []).map(s => [s.exam_id, s]))
        })()

        return raw.flatMap((row) => {
            const id = value(row, 'id')
            const programCode = nestedCode(row, 'programs')
            const trackCode = nestedCode(row, 'tracks')
            const typeCode = nestedCode(row, 'exam_types').toUpperCase()
            const domain = assessmentDomainForProgram(programCode)
            const kind = assessmentKindForExamType(typeCode)
            const supply = supplyByExam.get(id)
            const examSections = (supply?.sections ?? []) as Array<{subject_id:string|null;question_count:number;published_count:number}>
            const configuredCount = examSections.reduce((total, section) => total + Number(section.question_count || 0), 0)
            const staticCount = Number(supply?.bound_count || 0)
            const sectionBankReady = examSections.length > 0 && examSections.every((section) => (
                Boolean(section.subject_id)
                && section.question_count > 0
                && Number(section.published_count || 0) >= section.question_count
            ))
            const questionCount = staticCount > 0 ? staticCount : configuredCount
            const contentReady = staticCount > 0
                ? configuredCount === 0 || staticCount >= configuredCount
                : sectionBankReady
            const status = value(row, 'status')
            if (!id || !domain || !kind || !contentReady || !assessmentIsReady(status, questionCount)) return []

            return [{
                domain,
                kind,
                level: domain === 'TKA' ? trackCode : null,
                trackCode,
                title: value(row, 'title'),
                slug: value(row, 'slug'),
                status,
                durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
                questionCount,
                programCode,
                id: value(row, 'id'),
                programId: value(row, 'program_id'),
                trackId: value(row, 'track_id'),
                examTypeId: value(row, 'exam_type_id'),
                examTypeCode: typeCode as ResolvedExam['examTypeCode'],
                attemptLimit: row.attempt_limit == null ? null : Number(row.attempt_limit),
                questionOrder: value(row, 'question_order'),
                accessType: value(row, 'access_type'),
                requiredFeatureId: row.required_feature_id == null ? null : String(row.required_feature_id),
                tokenCost: Number(row.token_cost ?? 0),
                startsAt: row.starts_at == null ? null : String(row.starts_at),
                endsAt: row.ends_at == null ? null : String(row.ends_at),
                subjectId: null,
                subjectCode: null,
            }]
        })
    }

    async getById(id: string): Promise<CatalogAssessment | null> {
        return (await this.listDistributable(undefined, [id])).find((assessment) => assessment.id === id) ?? null
    }
}

export const assessmentCatalogService = new AssessmentCatalogService()
