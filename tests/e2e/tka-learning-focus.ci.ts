import { createClient } from '@supabase/supabase-js'
import type { DisposableTkaSession } from './tka.ci'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'

type RecordValue = Record<string, unknown>

export type StoredTkaRecommendation = {
    id: string
    knowledge_node_id: string
    priority: number
    score: number
    reason_code: string
    status: string
}

export type TkaLearningFocusItem = {
    id: string
    knowledge_node_id: string
    priority: number
    score: number
    subject_code: string
    topic_name: string
    mastery_score: number
    attempted_questions: number
    accuracy: number
    open_gap_count: number
    next_action: {
        type: 'continue_remedial' | 'repeat_wrong' | 'practice_tka'
        label: string
        href: string
    }
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
        throw new Error(`Learning-focus E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`)
    }
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const supabase = createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.signInWithPassword({ email: session.email, password: session.password })
    if (error || data.user?.id !== session.userId) throw error ?? new Error('Learning-focus learner auth mismatch.')
    return supabase
}

export async function readOwnStoredTkaRecommendations(session: DisposableTkaSession): Promise<StoredTkaRecommendation[]> {
    const supabase = await learnerClient(session)
    const { data, error } = await supabase
        .from('learning_recommendations')
        .select('id, knowledge_node_id, priority, score, reason_code, status')
        .eq('user_id', session.userId)
        .eq('recommendation_type', 'weakest_topic_v1')
        .eq('status', 'active')
        .order('priority', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => ({
        id: String(row.id),
        knowledge_node_id: String(row.knowledge_node_id),
        priority: Number(row.priority),
        score: Number(row.score),
        reason_code: String(row.reason_code),
        status: String(row.status),
    }))
}

export async function readOwnTkaLearningFocus(session: DisposableTkaSession): Promise<TkaLearningFocusItem[]> {
    const supabase = await learnerClient(session)
    const { data, error } = await supabase.rpc('get_tka_smp_learning_focus')
    if (error) throw error
    const payload = asRecord(data)
    const items = Array.isArray(payload?.items) ? payload.items : []

    const parsed = items.flatMap((value) => {
        const row = asRecord(value)
        const action = asRecord(row?.next_action)
        if (!row || !action) return []
        const type = String(action.type ?? '')
        const href = String(action.href ?? '')
        if (!['continue_remedial', 'repeat_wrong', 'practice_tka'].includes(type)) {
            throw new Error(`Unexpected TKA learning-focus action: ${type}`)
        }
        if (!href.startsWith('/tka/smp')) throw new Error(`Unsafe learning-focus href: ${href}`)
        return [{
            id: String(row.id ?? ''),
            knowledge_node_id: String(row.knowledge_node_id ?? ''),
            priority: Number(row.priority ?? 0),
            score: Number(row.score ?? 0),
            subject_code: String(row.subject_code ?? ''),
            topic_name: String(row.topic_name ?? ''),
            mastery_score: Number(row.mastery_score ?? 0),
            attempted_questions: Number(row.attempted_questions ?? 0),
            accuracy: Number(row.accuracy ?? 0),
            open_gap_count: Number(row.open_gap_count ?? 0),
            next_action: {
                type: type as TkaLearningFocusItem['next_action']['type'],
                label: String(action.label ?? ''),
                href,
            },
        }]
    }).filter((item) => item.id && item.knowledge_node_id && item.topic_name && item.subject_code)

    if (parsed.length > 3) throw new Error(`Learning-focus RPC returned ${parsed.length} items; max is 3.`)
    parsed.forEach((item, index) => {
        if (item.priority !== index + 1) throw new Error('Learning-focus priority is not deterministic/sequential.')
        if (item.score < 0 || item.score > 1) throw new Error('Learning-focus weakness score is outside 0..1.')
    })
    return parsed
}
