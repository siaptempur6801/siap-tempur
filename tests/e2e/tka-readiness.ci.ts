import { createClient } from '@supabase/supabase-js'
import type { DisposableTkaSession } from './tka.ci'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'

type RecordValue = Record<string, unknown>

export type StoredTkaReadiness = {
    readiness_score: number
    confidence_score: number
    calculation_version: string
    calculated_at: string
}

export type TkaReadinessRpc = {
    readiness_score: number
    readiness_percent: number
    readiness_level: 'building_foundation' | 'developing' | 'almost_ready' | 'ready'
    confidence_score: number
    confidence_percent: number
    confidence_level: 'low' | 'moderate' | 'high'
    calculation_version: string
    subjects: Array<{
        subject_code: string
        readiness_score: number
        confidence_score: number
        assessable_nodes: number
        evidenced_nodes: number
    }>
}

function required(name: string) {
    const value = process.env[name]
    if (!value) throw new Error(`${name} wajib diatur untuk TKA staging E2E.`)
    return value
}

function asRecord(value: unknown): RecordValue | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as RecordValue
}

async function learnerClient(session: DisposableTkaSession) {
    const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`Readiness E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`)
    }
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const supabase = createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.signInWithPassword({ email: session.email, password: session.password })
    if (error || data.user?.id !== session.userId) throw error ?? new Error('Readiness learner auth mismatch.')
    return supabase
}

export async function readOwnStoredTkaReadiness(session: DisposableTkaSession): Promise<StoredTkaReadiness> {
    const supabase = await learnerClient(session)
    const { data, error } = await supabase
        .from('user_readiness')
        .select('readiness_score, confidence_score, calculation_version, calculated_at')
        .eq('user_id', session.userId)
        .eq('calculation_version', 'tka_smp_readiness_v1')
        .single()
    if (error) throw error

    return {
        readiness_score: Number(data.readiness_score),
        confidence_score: Number(data.confidence_score),
        calculation_version: String(data.calculation_version),
        calculated_at: String(data.calculated_at),
    }
}

export async function readOwnTkaReadiness(session: DisposableTkaSession): Promise<TkaReadinessRpc> {
    const supabase = await learnerClient(session)
    const { data, error } = await supabase.rpc('get_tka_smp_readiness')
    if (error) throw error
    const payload = asRecord(data)
    if (payload?.available !== true) throw new Error('TKA readiness is not available for authenticated learner.')

    const readinessLevel = String(payload.readiness_level ?? '')
    const confidenceLevel = String(payload.confidence_level ?? '')
    if (!['building_foundation', 'developing', 'almost_ready', 'ready'].includes(readinessLevel)) {
        throw new Error(`Unexpected readiness level: ${readinessLevel}`)
    }
    if (!['low', 'moderate', 'high'].includes(confidenceLevel)) {
        throw new Error(`Unexpected readiness confidence level: ${confidenceLevel}`)
    }

    const subjects = (Array.isArray(payload.subjects) ? payload.subjects : []).flatMap((value) => {
        const row = asRecord(value)
        if (!row) return []
        return [{
            subject_code: String(row.subject_code ?? ''),
            readiness_score: Number(row.readiness_score ?? 0),
            confidence_score: Number(row.confidence_score ?? 0),
            assessable_nodes: Number(row.assessable_nodes ?? 0),
            evidenced_nodes: Number(row.evidenced_nodes ?? 0),
        }]
    }).filter((subject) => subject.subject_code)

    const result: TkaReadinessRpc = {
        readiness_score: Number(payload.readiness_score ?? 0),
        readiness_percent: Number(payload.readiness_percent ?? 0),
        readiness_level: readinessLevel as TkaReadinessRpc['readiness_level'],
        confidence_score: Number(payload.confidence_score ?? 0),
        confidence_percent: Number(payload.confidence_percent ?? 0),
        confidence_level: confidenceLevel as TkaReadinessRpc['confidence_level'],
        calculation_version: String(payload.calculation_version ?? ''),
        subjects,
    }

    if (result.readiness_score < 0 || result.readiness_score > 1) throw new Error('Readiness score outside 0..1.')
    if (result.confidence_score < 0 || result.confidence_score > 1) throw new Error('Readiness confidence outside 0..1.')
    if (result.calculation_version !== 'tka_smp_readiness_v1') throw new Error('Unexpected readiness calculation version.')
    if (subjects.length !== 2 || subjects.map((row) => row.subject_code).sort().join(',') !== 'BIN,MAT') {
        throw new Error(`Unexpected readiness subject set: ${subjects.map((row) => row.subject_code).join(',')}`)
    }
    subjects.forEach((subject) => {
        if (subject.readiness_score < 0 || subject.readiness_score > 1) throw new Error('Subject readiness outside 0..1.')
        if (subject.confidence_score < 0 || subject.confidence_score > 1) throw new Error('Subject confidence outside 0..1.')
        if (subject.evidenced_nodes > subject.assessable_nodes) throw new Error('Readiness evidenced nodes exceed assessable nodes.')
    })

    return result
}
