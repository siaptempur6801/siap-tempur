import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'
const authFile = path.join(__dirname, '../../playwright/.auth/tka-user.json')
const metadataFile = path.join(__dirname, '../../playwright/.auth/tka-user-meta.json')

export type DisposableTkaSession = {
    userId: string
    email: string
    password: string
}

export type TkaLearningProjection = {
    knowledge: Array<{
        knowledge_node_id: string
        attempted_questions: number
        correct_questions: number
        accuracy: number
        average_score: number
        mastery_score: number
        mastery_level: string
    }>
    subjects: Array<{
        subject_id: string
        attempts: number
        questions_answered: number
        accuracy: number
        mastery_score: number
    }>
}

export type TkaWrongQuestionStateRow = {
    id: string
    question_id: string
    status: 'open'
    latest_outcome: 'wrong' | 'unanswered' | 'correct'
    failure_count: number
    wrong_count: number
    unanswered_count: number
}

export type TkaRemedialState = {
    session: {
        id: string
        status: 'active' | 'completed'
        total_items: number
        completed_items: number
        pending_items: number
    } | null
    items: Array<{
        id: string
        position: number
        status: 'pending' | 'completed'
        subject_id: string
        question_id: string
        response_type: string
    }>
}

function required(name: string) {
    const value = process.env[name]
    if (!value) throw new Error(`${name} wajib diatur untuk TKA staging E2E.`)
    return value
}

function assertStagingUrl(url: string) {
    const projectRef = new URL(url).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`TKA E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`)
    }
}

async function githubOidcToken() {
    const explicit = process.env.E2E_GITHUB_OIDC_TOKEN
    if (explicit) return explicit

    const requestUrl = required('ACTIONS_ID_TOKEN_REQUEST_URL')
    const requestToken = required('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
    const separator = requestUrl.includes('?') ? '&' : '?'
    const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`, {
        headers: { Authorization: `bearer ${requestToken}` },
    })
    if (!response.ok) throw new Error(`Gagal meminta GitHub OIDC token (${response.status}).`)
    const payload = await response.json() as { value?: string }
    if (!payload.value) throw new Error('GitHub OIDC token kosong.')
    return payload.value
}

async function callCiUserHelper(supabaseUrl: string, body: Record<string, unknown>) {
    const oidcToken = await githubOidcToken()
    const response = await fetch(`${supabaseUrl}/functions/v1/ci-e2e-user`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oidcToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({})) as { userId?: string; error?: string }
    if (!response.ok) {
        throw new Error(`ci-e2e-user ${String(body.action)} gagal (${response.status}): ${payload.error || 'unknown'}`)
    }
    return payload
}

async function currentDisposableUserId() {
    try {
        const raw = await readFile(metadataFile, 'utf8')
        const parsed = JSON.parse(raw) as { userId?: string }
        return parsed.userId || null
    } catch {
        return null
    }
}

async function authenticatedEphemeralClient(session: DisposableTkaSession) {
    const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
    assertStagingUrl(supabaseUrl)
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const supabase = createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: session.email,
        password: session.password,
    })
    if (authError || authData.user?.id !== session.userId) {
        throw authError ?? new Error('Disposable TKA learner auth mismatch.')
    }
    return supabase
}

export async function readOwnTkaLearningProjection(session: DisposableTkaSession): Promise<TkaLearningProjection> {
    const supabase = await authenticatedEphemeralClient(session)
    const [knowledgeResult, subjectResult] = await Promise.all([
        supabase
            .from('user_knowledge_progress')
            .select('knowledge_node_id, attempted_questions, correct_questions, accuracy, average_score, mastery_score, mastery_level')
            .eq('user_id', session.userId),
        supabase
            .from('user_subject_progress')
            .select('subject_id, attempts, questions_answered, accuracy, mastery_score')
            .eq('user_id', session.userId),
    ])

    if (knowledgeResult.error) throw knowledgeResult.error
    if (subjectResult.error) throw subjectResult.error

    return {
        knowledge: (knowledgeResult.data ?? []) as TkaLearningProjection['knowledge'],
        subjects: (subjectResult.data ?? []) as TkaLearningProjection['subjects'],
    }
}

export async function readOwnTkaWrongQuestionState(session: DisposableTkaSession): Promise<TkaWrongQuestionStateRow[]> {
    const supabase = await authenticatedEphemeralClient(session)
    const { data, error } = await supabase.rpc('get_tka_smp_wrong_questions', { p_limit: 200 })
    if (error) throw error

    const payload = (data && typeof data === 'object' && !Array.isArray(data))
        ? data as Record<string, unknown>
        : {}
    const items = Array.isArray(payload.items) ? payload.items : []

    return items.flatMap((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return []
        const row = value as Record<string, unknown>
        const snapshot = row.question_snapshot && typeof row.question_snapshot === 'object' && !Array.isArray(row.question_snapshot)
            ? row.question_snapshot as Record<string, unknown>
            : {}
        const options = Array.isArray(snapshot.options) ? snapshot.options : []
        for (const optionValue of options) {
            if (!optionValue || typeof optionValue !== 'object' || Array.isArray(optionValue)) continue
            const option = optionValue as Record<string, unknown>
            if ('is_correct' in option || 'score' in option) {
                throw new Error('Sanitized wrong-question RPC leaked answer-key fields.')
            }
        }
        if (Array.isArray(snapshot.explanations) && snapshot.explanations.length > 0) {
            throw new Error('Sanitized wrong-question RPC leaked explanation before review.')
        }

        return [{
            id: String(row.id ?? ''),
            question_id: String(row.question_id ?? ''),
            status: 'open' as const,
            latest_outcome: String(row.latest_outcome ?? 'unanswered') as TkaWrongQuestionStateRow['latest_outcome'],
            failure_count: Number(row.failure_count ?? 0),
            wrong_count: Number(row.wrong_count ?? 0),
            unanswered_count: Number(row.unanswered_count ?? 0),
        }]
    }).filter((row) => row.id && row.question_id)
}

export async function readOwnTkaRemedial(
    session: DisposableTkaSession,
    sourceAttemptId: string,
): Promise<TkaRemedialState> {
    const supabase = await authenticatedEphemeralClient(session)
    const { data, error } = await supabase.rpc('get_tka_smp_remedial_for_attempt', {
        p_source_attempt_id: sourceAttemptId,
    })
    if (error) throw error

    const payload = (data && typeof data === 'object' && !Array.isArray(data))
        ? data as Record<string, unknown>
        : {}
    const rawSession = payload.session && typeof payload.session === 'object' && !Array.isArray(payload.session)
        ? payload.session as Record<string, unknown>
        : null
    const rawItems = Array.isArray(payload.items) ? payload.items : []

    const parsedSession = rawSession ? {
        id: String(rawSession.id ?? ''),
        status: String(rawSession.status ?? 'active') as 'active' | 'completed',
        total_items: Number(rawSession.total_items ?? 0),
        completed_items: Number(rawSession.completed_items ?? 0),
        pending_items: Number(rawSession.pending_items ?? 0),
    } : null

    const items = rawItems.flatMap((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return []
        const row = value as Record<string, unknown>
        const snapshot = row.question_snapshot && typeof row.question_snapshot === 'object' && !Array.isArray(row.question_snapshot)
            ? row.question_snapshot as Record<string, unknown>
            : {}
        const question = snapshot.question && typeof snapshot.question === 'object' && !Array.isArray(snapshot.question)
            ? snapshot.question as Record<string, unknown>
            : {}
        const options = Array.isArray(snapshot.options) ? snapshot.options : []
        for (const optionValue of options) {
            if (!optionValue || typeof optionValue !== 'object' || Array.isArray(optionValue)) continue
            const option = optionValue as Record<string, unknown>
            if ('is_correct' in option || 'score' in option) {
                throw new Error('Sanitized remedial RPC leaked answer-key fields.')
            }
        }
        if (Array.isArray(snapshot.explanations) && snapshot.explanations.length > 0) {
            throw new Error('Sanitized remedial RPC leaked explanation before review.')
        }

        return [{
            id: String(row.id ?? ''),
            position: Number(row.position ?? 0),
            status: String(row.status ?? 'pending') as 'pending' | 'completed',
            subject_id: String(row.subject_id ?? ''),
            question_id: String(row.question_id ?? ''),
            response_type: String(question.question_type ?? 'single_choice'),
        }]
    }).filter((row) => row.id && row.question_id && row.subject_id && row.position > 0)

    return { session: parsedSession?.id ? parsedSession : null, items }
}

export async function freshDisposableTkaSession(page: Page): Promise<DisposableTkaSession> {
    const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
    assertStagingUrl(supabaseUrl)

    const currentUserId = await currentDisposableUserId()
    if (currentUserId) {
        await callCiUserHelper(supabaseUrl, { action: 'cleanup', userId: currentUserId })
    }

    const runId = process.env.GITHUB_RUN_ID || `local-${randomUUID().slice(0, 8)}`
    const suffix = `${runId}-${randomUUID().slice(0, 8)}`
    const email = `ci-tka-${suffix}@example.invalid`
    const password = `TkaE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`

    const provisioned = await callCiUserHelper(supabaseUrl, {
        action: 'provision',
        email,
        password,
        runId,
    })
    if (!provisioned.userId) throw new Error('ci-e2e-user tidak mengembalikan userId.')
    const userId = provisioned.userId

    await mkdir(path.dirname(authFile), { recursive: true })
    await writeFile(metadataFile, JSON.stringify({ userId, email }, null, 2), 'utf8')

    try {
        await page.context().clearCookies()
        await page.goto('/login?returnTo=%2Ftka%2Fsmp')
        await page.evaluate(() => {
            localStorage.clear()
            sessionStorage.clear()
        })
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[type="password"]').fill(password)
        await page.getByRole('button', { name: /Masuk|Login/i }).click()
        await page.waitForURL(/\/tka\/smp(?:\?.*)?$/)
        await expect(page.getByText('Track aktif')).toBeVisible()
        await page.context().storageState({ path: authFile })
        return { userId, email, password }
    } catch (error) {
        await callCiUserHelper(supabaseUrl, { action: 'cleanup', userId }).catch(() => undefined)
        throw error
    }
}
