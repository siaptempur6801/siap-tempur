import { createClient } from 'npm:@supabase/supabase-js@2.103.2'

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com'
const EXPECTED_AUDIENCE = 'siap-tempur-staging-e2e'
const EXPECTED_REPOSITORY = '8shagrid/siap-tempur'
const EXPECTED_WORKFLOW_PREFIX = '8shagrid/siap-tempur/.github/workflows/tka-staging-e2e.yml@'
const GITHUB_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CI_TKA_EMAIL = /^ci-tka-[a-zA-Z0-9-]{1,96}@example\.invalid$/
const M4_ORDER_PREFIX = 'M4SEC-'

type Claims = Record<string, unknown> & {
  iss?: string
  aud?: string | string[]
  sub?: string
  exp?: number
  nbf?: number
  repository?: string
  event_name?: string
  workflow_ref?: string
}

type Body = {
  action?: 'set_enforcement' | 'grant_pass' | 'clear_pass' | 'consume_mini' | 'seed_order' | 'assign_admin' | 'clear_m4' | 'snapshot'
  userId?: string
  enabled?: boolean
  mode?: 'active' | 'expired'
  examSlug?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function base64UrlBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const decoded = atob(padded)
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0))
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T
}

async function verifyGithubOidc(token: string): Promise<Claims> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('OIDC_FORMAT_INVALID')
  const header = decodeJson<Record<string, unknown>>(parts[0])
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('OIDC_HEADER_INVALID')

  const jwksResponse = await fetch(GITHUB_JWKS_URL, { cache: 'no-store' })
  if (!jwksResponse.ok) throw new Error('OIDC_JWKS_UNAVAILABLE')
  const jwks = await jwksResponse.json() as { keys?: Array<JsonWebKey & { kid?: string }> }
  const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid)
  if (!jwk) throw new Error('OIDC_SIGNING_KEY_NOT_FOUND')

  const publicKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  )
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', publicKey, base64UrlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  if (!validSignature) throw new Error('OIDC_SIGNATURE_INVALID')

  const claims = decodeJson<Claims>(parts[1])
  const now = Math.floor(Date.now() / 1000)
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (claims.iss !== EXPECTED_ISSUER) throw new Error('OIDC_ISSUER_INVALID')
  if (!audience.includes(EXPECTED_AUDIENCE)) throw new Error('OIDC_AUDIENCE_INVALID')
  if (typeof claims.exp !== 'number' || claims.exp < now - 30) throw new Error('OIDC_EXPIRED')
  if (typeof claims.nbf === 'number' && claims.nbf > now + 30) throw new Error('OIDC_NOT_YET_VALID')
  if (claims.repository !== EXPECTED_REPOSITORY) throw new Error('OIDC_REPOSITORY_INVALID')
  if (!claims.sub?.startsWith(`repo:${EXPECTED_REPOSITORY}:`)) throw new Error('OIDC_SUBJECT_INVALID')
  if (!['pull_request', 'workflow_dispatch'].includes(String(claims.event_name ?? ''))) throw new Error('OIDC_EVENT_INVALID')
  if (!claims.workflow_ref?.startsWith(EXPECTED_WORKFLOW_PREFIX)) throw new Error('OIDC_WORKFLOW_INVALID')
  return claims
}

function adminApiKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {}
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  throw new Error('SUPABASE_ADMIN_KEY_MISSING')
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('SUPABASE_URL_MISSING')
  return createClient(url, adminApiKey(), { auth: { persistSession: false, autoRefreshToken: false } })
}

async function assertCiTkaUser(admin: ReturnType<typeof adminClient>, userId: string) {
  if (!UUID.test(userId)) throw new Error('CI_USER_ID_INVALID')
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) throw error ?? new Error('CI_USER_NOT_FOUND')
  const user = data.user
  if (user.user_metadata?.ci_e2e !== true || user.user_metadata?.ci_kind !== 'tka' || !CI_TKA_EMAIL.test(user.email ?? '')) {
    throw new Error('CI_USER_TARGET_FORBIDDEN')
  }
  return user
}

async function setEnforcement(admin: ReturnType<typeof adminClient>, enabled: boolean) {
  const { error } = await admin.from('feature_flags').update({
    enabled,
    rollout_percentage: enabled ? 100 : 0,
    config: { program: 'TKA', track: 'SMP', milestone: 4, mode: enabled ? 'security_closure' : 'dark_launch' },
  }).eq('key', 'tka.smp.monetization_enforcement')
  if (error) throw error
  return { enabled, rolloutPercentage: enabled ? 100 : 0 }
}

async function clearPass(admin: ReturnType<typeof adminClient>, userId: string) {
  await assertCiTkaUser(admin, userId)
  const { error } = await admin.from('entitlements').delete().eq('user_id', userId).eq('source_type', 'ci_e2e_m4')
  if (error) throw error
  return { ok: true }
}

async function grantPass(admin: ReturnType<typeof adminClient>, userId: string, mode: 'active' | 'expired') {
  await assertCiTkaUser(admin, userId)
  await clearPass(admin, userId)

  const { data: product, error: productError } = await admin.from('products').select('id').eq('code', 'TKA_SMP_PASS_30').maybeSingle()
  if (productError || !product) throw productError ?? new Error('PASS_PRODUCT_NOT_FOUND')
  const { data: mappings, error: mappingError } = await admin.from('product_features').select('feature_id, limit_value').eq('product_id', product.id)
  if (mappingError) throw mappingError
  if (!mappings?.length) throw new Error('PASS_FEATURES_EMPTY')

  const now = Date.now()
  const startsAt = mode === 'active' ? new Date(now - 60_000) : new Date(now - 31 * 86_400_000)
  const expiresAt = mode === 'active' ? new Date(now + 30 * 86_400_000) : new Date(now - 60_000)
  const rows = mappings.map((mapping) => ({
    user_id: userId,
    feature_id: mapping.feature_id,
    source_type: 'ci_e2e_m4',
    source_id: null,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    usage_limit: mapping.limit_value,
    usage_count: 0,
    status: 'active',
  }))
  const { error: insertError } = await admin.from('entitlements').insert(rows)
  if (insertError) throw insertError
  return { mode, entitlementCount: rows.length, expiresAt: expiresAt.toISOString() }
}

async function consumeMini(admin: ReturnType<typeof adminClient>, userId: string, examSlug: string) {
  await assertCiTkaUser(admin, userId)
  if (!/^tka-smp-mini-(bahasa-indonesia|matematika)$/.test(examSlug)) throw new Error('MINI_SLUG_INVALID')
  const { data: exam, error: examError } = await admin.from('exams').select('id').eq('slug', examSlug).maybeSingle()
  if (examError || !exam) throw examError ?? new Error('MINI_EXAM_NOT_FOUND')
  const { data: attempts, error: attemptError } = await admin.from('exam_attempts').select('attempt_number').eq('exam_id', exam.id).eq('user_id', userId).order('attempt_number', { ascending: false }).limit(1)
  if (attemptError) throw attemptError
  const next = Number(attempts?.[0]?.attempt_number ?? 0) + 1
  const now = new Date().toISOString()
  const { data: inserted, error: insertError } = await admin.from('exam_attempts').insert({
    exam_id: exam.id,
    user_id: userId,
    attempt_number: next,
    status: 'completed',
    started_at: now,
    submitted_at: now,
    metadata: { ci_e2e_m4: true, quota_seed: true },
  }).select('id').single()
  if (insertError) throw insertError
  return { attemptId: inserted.id, attemptNumber: next }
}

async function seedOrder(admin: ReturnType<typeof adminClient>, userId: string) {
  await assertCiTkaUser(admin, userId)
  const { data: product, error: productError } = await admin.from('products').select('id, code').eq('code', 'TKA_SMP_PASS_30').maybeSingle()
  if (productError || !product) throw productError ?? new Error('PASS_PRODUCT_NOT_FOUND')
  const now = new Date().toISOString()
  const { data: price, error: priceError } = await admin.from('product_prices').select('amount, currency').eq('product_id', product.id).ilike('status', 'active').lte('starts_at', now).or(`ends_at.is.null,ends_at.gte.${now}`).order('starts_at', { ascending: false }).limit(1).maybeSingle()
  if (priceError || !price) throw priceError ?? new Error('PASS_PRICE_NOT_FOUND')
  const subtotal = Number(price.amount)
  const total = subtotal + 500
  const orderNumber = `${M4_ORDER_PREFIX}${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const { data: order, error: orderError } = await admin.from('orders').insert({
    order_number: orderNumber,
    user_id: userId,
    status: 'pending',
    subtotal,
    discount_amount: 0,
    total_amount: total,
    currency: price.currency || 'IDR',
  }).select('id').single()
  if (orderError) throw orderError
  const { data: item, error: itemError } = await admin.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    quantity: 1,
    unit_price: subtotal,
    discount: 0,
    total: subtotal,
  }).select('id').single()
  if (itemError) throw itemError
  const { error: paymentError } = await admin.from('payments').insert({
    order_id: order.id,
    provider: 'midtrans',
    amount: total,
    status: 'pending',
    raw_response: { ci_e2e_m4: true },
  })
  if (paymentError) throw paymentError
  return { orderId: order.id, orderItemId: item.id, orderNumber, amount: total }
}

async function assignAdmin(admin: ReturnType<typeof adminClient>, userId: string) {
  await assertCiTkaUser(admin, userId)
  const { data: role, error: roleError } = await admin.from('roles').select('id').eq('code', 'ADMIN').maybeSingle()
  if (roleError || !role) throw roleError ?? new Error('ADMIN_ROLE_NOT_FOUND')

  const { data: existing, error: existingError } = await admin
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', role.id)
    .is('scope_type', null)
    .is('scope_id', null)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return { ok: true, alreadyAssigned: true }

  const { error } = await admin.from('user_roles').insert({
    user_id: userId,
    role_id: role.id,
    scope_type: null,
    scope_id: null,
  })
  if (error) throw error
  return { ok: true, alreadyAssigned: false }
}

async function clearM4(admin: ReturnType<typeof adminClient>, userId: string) {
  await assertCiTkaUser(admin, userId)
  const { data: orders, error: orderReadError } = await admin.from('orders').select('id, order_number').eq('user_id', userId).like('order_number', `${M4_ORDER_PREFIX}%`)
  if (orderReadError) throw orderReadError
  const orderIds = (orders ?? []).map((row) => row.id)
  if (orderIds.length > 0) {
    const { data: payments, error: paymentReadError } = await admin.from('payments').select('provider_transaction_id').in('order_id', orderIds)
    if (paymentReadError) throw paymentReadError
    const eventPrefixes = (payments ?? []).map((row) => row.provider_transaction_id).filter(Boolean)
    for (const prefix of eventPrefixes) {
      const { error } = await admin.from('payment_webhook_events').delete().like('event_id', `${prefix}:%`)
      if (error) throw error
    }
    const { error: orderDeleteError } = await admin.from('orders').delete().in('id', orderIds)
    if (orderDeleteError) throw orderDeleteError
  }
  const { error: entitlementError } = await admin.from('entitlements').delete().eq('user_id', userId).eq('source_type', 'ci_e2e_m4')
  if (entitlementError) throw entitlementError
  const { error: attemptError } = await admin.from('exam_attempts').delete().eq('user_id', userId).contains('metadata', { ci_e2e_m4: true })
  if (attemptError) throw attemptError
  const { data: adminRole } = await admin.from('roles').select('id').eq('code', 'ADMIN').maybeSingle()
  if (adminRole?.id) {
    const { error: roleDeleteError } = await admin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', adminRole.id)
      .is('scope_type', null)
      .is('scope_id', null)
    if (roleDeleteError) throw roleDeleteError
  }
  return { ordersDeleted: orderIds.length }
}

async function snapshot(admin: ReturnType<typeof adminClient>, userId: string) {
  await assertCiTkaUser(admin, userId)
  const [{ count: entitlements }, { count: orders }, { count: attempts }] = await Promise.all([
    admin.from('entitlements').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('source_type', 'ci_e2e_m4'),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).like('order_number', `${M4_ORDER_PREFIX}%`),
    admin.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId).contains('metadata', { ci_e2e_m4: true }),
  ])
  return { entitlements: entitlements ?? 0, orders: orders ?? 0, attempts: attempts ?? 0 }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'OIDC_REQUIRED' }, 401)
    await verifyGithubOidc(authHeader.slice('Bearer '.length).trim())
    const body = await req.json() as Body
    const admin = adminClient()

    if (body.action === 'set_enforcement') return json(await setEnforcement(admin, body.enabled === true))
    if (!body.userId) return json({ error: 'CI_USER_ID_REQUIRED' }, 400)
    if (body.action === 'grant_pass') return json(await grantPass(admin, body.userId, body.mode === 'expired' ? 'expired' : 'active'))
    if (body.action === 'clear_pass') return json(await clearPass(admin, body.userId))
    if (body.action === 'consume_mini') return json(await consumeMini(admin, body.userId, body.examSlug ?? ''))
    if (body.action === 'seed_order') return json(await seedOrder(admin, body.userId))
    if (body.action === 'assign_admin') return json(await assignAdmin(admin, body.userId))
    if (body.action === 'clear_m4') return json(await clearM4(admin, body.userId))
    if (body.action === 'snapshot') return json(await snapshot(admin, body.userId))
    return json({ error: 'ACTION_INVALID' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const unauthorized = message.startsWith('OIDC_')
    console.error('[ci-e2e-m4]', message)
    return json({ error: unauthorized ? 'OIDC_INVALID' : message }, unauthorized ? 401 : 500)
  }
})
