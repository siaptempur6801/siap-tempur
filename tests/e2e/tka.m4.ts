import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import type { DisposableTkaSession } from './tka.ci'
import { ciHelperUrl } from './ci-helper'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'

type M4Snapshot = {
  entitlements: number
  orders: number
  attempts: number
}

type SeededOrder = {
  orderId: string
  orderItemId: string
  orderNumber: string
  amount: number
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} wajib diatur untuk M4 staging E2E.`)
  return value
}

function stagingUrl() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL')
  const projectRef = new URL(url).hostname.split('.')[0]
  if (projectRef !== EXPECTED_STAGING_REF) {
    throw new Error(
      `M4 E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`,
    )
  }
  return url
}

async function githubOidcToken() {
  const explicit = process.env.E2E_GITHUB_OIDC_TOKEN
  if (explicit) return explicit

  const requestUrl = required('ACTIONS_ID_TOKEN_REQUEST_URL')
  const requestToken = required('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
  const separator = requestUrl.includes('?') ? '&' : '?'
  const response = await fetch(
    `${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`,
    {
      headers: { Authorization: `bearer ${requestToken}` },
    },
  )
  if (!response.ok) throw new Error(`Gagal meminta GitHub OIDC token (${response.status}).`)
  const payload = (await response.json()) as { value?: string }
  if (!payload.value) throw new Error('GitHub OIDC token kosong.')
  return payload.value
}

async function callHelper<T>(
  functionName: 'ci-e2e-m4' | 'ci-e2e-user',
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(ciHelperUrl(stagingUrl(), functionName), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await githubOidcToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error(
      `${functionName} ${String(body.action)} gagal (${response.status}): ${payload.error || 'unknown'}`,
    )
  }
  return payload
}

async function authenticatedClient(session: DisposableTkaSession) {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const supabase = createClient(stagingUrl(), publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: session.password,
  })
  if (error || data.user?.id !== session.userId)
    throw error ?? new Error('M4 disposable auth mismatch.')
  return supabase
}

export async function setTkaSmpMonetizationEnforcement(enabled: boolean) {
  return callHelper<{ enabled: boolean; rolloutPercentage: number }>('ci-e2e-m4', {
    action: 'set_enforcement',
    enabled,
  })
}

export async function grantM4Pass(session: DisposableTkaSession, mode: 'active' | 'expired') {
  return callHelper<{ mode: 'active' | 'expired'; entitlementCount: number; expiresAt: string }>(
    'ci-e2e-m4',
    {
      action: 'grant_pass',
      userId: session.userId,
      mode,
    },
  )
}

export async function clearM4Pass(session: DisposableTkaSession) {
  return callHelper<{ ok: boolean }>('ci-e2e-m4', {
    action: 'clear_pass',
    userId: session.userId,
  })
}

export async function consumeM4MiniQuota(
  session: DisposableTkaSession,
  examSlug: 'tka-smp-mini-bahasa-indonesia' | 'tka-smp-mini-matematika',
) {
  return callHelper<{ attemptId: string; attemptNumber: number }>('ci-e2e-m4', {
    action: 'consume_mini',
    userId: session.userId,
    examSlug,
  })
}

export async function seedM4Order(session: DisposableTkaSession): Promise<SeededOrder> {
  return callHelper<SeededOrder>('ci-e2e-m4', {
    action: 'seed_order',
    userId: session.userId,
  })
}

export async function assignM4Admin(session: DisposableTkaSession) {
  return callHelper<{ ok: boolean }>('ci-e2e-m4', {
    action: 'assign_admin',
    userId: session.userId,
  })
}

export async function clearM4Artifacts(session: DisposableTkaSession) {
  return callHelper<{ ordersDeleted: number }>('ci-e2e-m4', {
    action: 'clear_m4',
    userId: session.userId,
  })
}

export async function readM4Snapshot(session: DisposableTkaSession): Promise<M4Snapshot> {
  return callHelper<M4Snapshot>('ci-e2e-m4', {
    action: 'snapshot',
    userId: session.userId,
  })
}

export async function provisionSecondaryTkaSession(): Promise<DisposableTkaSession> {
  const runId = process.env.GITHUB_RUN_ID || `local-${randomUUID().slice(0, 8)}`
  const suffix = `${runId}-${randomUUID().slice(0, 8)}`
  const email = `ci-tka-${suffix}@example.invalid`
  const password = `TkaE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`
  const result = await callHelper<{ userId: string }>('ci-e2e-user', {
    action: 'provision',
    email,
    password,
    runId,
  })
  if (!result.userId) throw new Error('Secondary CI learner tidak memiliki userId.')
  return { userId: result.userId, email, password }
}

export async function cleanupCiTkaUser(userId: string) {
  return callHelper<{ ok: boolean; alreadyDeleted?: boolean }>('ci-e2e-user', {
    action: 'cleanup',
    userId,
  })
}

export async function readOrderAs(session: DisposableTkaSession, orderId: string) {
  const supabase = await authenticatedClient(session)
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, user_id, status, total_amount')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function readPaymentAs(session: DisposableTkaSession, orderId: string) {
  const supabase = await authenticatedClient(session)
  const { data, error } = await supabase
    .from('payments')
    .select('id, order_id, status, amount, provider')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}
