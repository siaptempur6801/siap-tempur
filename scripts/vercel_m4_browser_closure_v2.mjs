import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chromium, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TAG = '[m4-browser-qa]'
const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const PORT = 3012
const ORIGIN = `http://127.0.0.1:${PORT}`
const USER_PREFIX = 'm4-browser-qa-'
const ORDER_PREFIX = 'M4BROWSER-'
const ENTITLEMENT_SOURCE = 'm4_browser_qa'

function enabled() {
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').includes(TAG)
}
function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_MISSING`)
  return value
}
function assertStaging(url) {
  const ref = new URL(url).hostname.split('.')[0]
  if (ref !== EXPECTED_STAGING_REF) throw new Error(`WRONG_SUPABASE_PROJECT:${ref || 'unknown'}`)
}
function adminClient() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL')
  assertStaging(url)
  const key = required('SUPABASE_SERVICE_ROLE_KEY')
  if (key === 'ci-no-service-role') throw new Error('REAL_STAGING_SERVICE_ROLE_REQUIRED')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
function learnerClient() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL')
  assertStaging(url)
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
async function setEnforcement(admin, value) {
  const { error } = await admin.from('feature_flags').update({
    enabled: value,
    rollout_percentage: value ? 100 : 0,
    config: { program: 'TKA', track: 'SMP', milestone: 4, mode: value ? 'browser_closure' : 'dark_launch' },
  }).eq('key', 'tka.smp.monetization_enforcement')
  if (error) throw error
}
async function getTrackId(admin) {
  const { data: program, error: pe } = await admin.from('programs').select('id').eq('code', 'TKA').maybeSingle()
  if (pe || !program) throw pe ?? new Error('TKA_PROGRAM_NOT_FOUND')
  const { data: track, error: te } = await admin.from('tracks').select('id').eq('program_id', program.id).eq('code', 'SMP').maybeSingle()
  if (te || !track) throw te ?? new Error('SMP_TRACK_NOT_FOUND')
  return track.id
}
async function provision(admin, { learner = true, role = null } = {}) {
  const email = `${USER_PREFIX}${Date.now()}-${randomUUID().slice(0, 8)}@example.invalid`
  const password = `M4Browser!${randomUUID()}-${randomUUID().slice(0, 8)}`
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'M4 Browser QA', m4_browser_qa: true },
  })
  if (error || !data.user) throw error ?? new Error('QA_USER_CREATE_FAILED')
  const userId = data.user.id
  if (learner) {
    const { error: trackError } = await admin.from('user_tracks').insert({ user_id: userId, track_id: await getTrackId(admin), status: 'active' })
    if (trackError) throw trackError
  }
  if (role) {
    const { data: roleRow, error: re } = await admin.from('roles').select('id').eq('code', role).maybeSingle()
    if (re || !roleRow) throw re ?? new Error(`ROLE_NOT_FOUND:${role}`)
    const { error: ur } = await admin.from('user_roles').insert({ user_id: userId, role_id: roleRow.id, scope_type: null, scope_id: null })
    if (ur) throw ur
  }
  return { userId, email, password }
}
async function grantPass(admin, userId, mode) {
  const { data: product, error: pe } = await admin.from('products').select('id').eq('code', 'TKA_SMP_PASS_30').maybeSingle()
  if (pe || !product) throw pe ?? new Error('PASS_PRODUCT_NOT_FOUND')
  const { data: mappings, error: me } = await admin.from('product_features').select('feature_id, limit_value').eq('product_id', product.id)
  if (me) throw me
  if (mappings?.length !== 10) throw new Error(`PASS_FEATURE_COUNT:${mappings?.length ?? 0}`)
  const now = Date.now()
  const startsAt = mode === 'active' ? new Date(now - 60_000) : new Date(now - 31 * 86_400_000)
  const expiresAt = mode === 'active' ? new Date(now + 30 * 86_400_000) : new Date(now - 60_000)
  const { error } = await admin.from('entitlements').insert(mappings.map((mapping) => ({
    user_id: userId, feature_id: mapping.feature_id, source_type: ENTITLEMENT_SOURCE, source_id: null,
    starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString(), usage_limit: mapping.limit_value,
    usage_count: 0, status: 'active',
  })))
  if (error) throw error
}
async function seedMiniAttempt(admin, userId, slug) {
  const { data: exam, error: ee } = await admin.from('exams').select('id').eq('slug', slug).maybeSingle()
  if (ee || !exam) throw ee ?? new Error(`EXAM_NOT_FOUND:${slug}`)
  const now = new Date().toISOString()
  const { error } = await admin.from('exam_attempts').insert({
    exam_id: exam.id, user_id: userId, attempt_number: 1, status: 'completed', started_at: now, submitted_at: now,
    metadata: { m4_browser_qa: true, quota_seed: true },
  })
  if (error) throw error
}
async function seedOrder(admin, userId) {
  const { data: product, error: pe } = await admin.from('products').select('id').eq('code', 'TKA_SMP_PASS_30').maybeSingle()
  if (pe || !product) throw pe ?? new Error('PASS_PRODUCT_NOT_FOUND')
  const now = new Date().toISOString()
  const { data: prices, error: ppe } = await admin.from('product_prices').select('amount,currency,starts_at,ends_at').eq('product_id', product.id).eq('status', 'active').lte('starts_at', now).order('starts_at', { ascending: false }).limit(20)
  if (ppe) throw ppe
  const price = (prices ?? []).find((row) => !row.ends_at || String(row.ends_at) >= now)
  if (!price) throw new Error('PASS_PRICE_NOT_FOUND')
  const subtotal = Number(price.amount)
  const total = subtotal + 500
  const orderNumber = `${ORDER_PREFIX}${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
  const { data: order, error: oe } = await admin.from('orders').insert({
    order_number: orderNumber, user_id: userId, status: 'pending', subtotal, discount_amount: 0,
    total_amount: total, currency: price.currency || 'IDR',
  }).select('id').single()
  if (oe) throw oe
  const { error: ie } = await admin.from('order_items').insert({ order_id: order.id, product_id: product.id, quantity: 1, unit_price: subtotal, discount: 0, total: subtotal })
  if (ie) throw ie
  const { error: paye } = await admin.from('payments').insert({ order_id: order.id, provider: 'midtrans', amount: total, status: 'pending', raw_response: { m4_browser_qa: true } })
  if (paye) throw paye
  return { orderId: order.id, orderNumber }
}
async function authenticatedRead(session, table, orderId) {
  const client = learnerClient()
  const { data: auth, error: ae } = await client.auth.signInWithPassword({ email: session.email, password: session.password })
  if (ae || auth.user?.id !== session.userId) throw ae ?? new Error('AUTH_MISMATCH')
  const query = table === 'orders'
    ? client.from('orders').select('id,order_number,user_id').eq('id', orderId).maybeSingle()
    : client.from('payments').select('id,order_id,status').eq('order_id', orderId).maybeSingle()
  const { data, error } = await query
  if (error) throw error
  return data
}
async function authenticateContext(context, session) {
  const token = required('M4_BROWSER_QA_TOKEN')
  const response = await context.request.post(`${ORIGIN}/api/internal/m4-browser-session`, {
    headers: { 'x-m4-browser-qa-token': token },
    data: { email: session.email, password: session.password },
  })
  if (!response.ok()) throw new Error(`QA_SESSION_FAILED:${response.status()}:${await response.text()}`)
}
async function pageFor(browser, session, path = '/tka/smp') {
  const context = await browser.newContext()
  await authenticateContext(context, session)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${path}`)
  if (new URL(page.url()).pathname.startsWith('/login')) throw new Error(`QA_SESSION_NOT_APPLIED:${path}`)
  return { context, page }
}
function examCard(page, title) {
  return page.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
}
async function waitForServer(child) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`NEXT_START_EXITED:${child.exitCode}`)
    try {
      const response = await fetch(`${ORIGIN}/api/health`, { signal: AbortSignal.timeout(2_000) })
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('NEXT_START_TIMEOUT')
}

async function run() {
  if (!enabled()) { console.log('M4_BROWSER_QA=skipped'); return }
  const admin = adminClient()
  const users = []
  let browser
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let serverStderr = ''
  server.stderr.on('data', (chunk) => { serverStderr += String(chunk) })
  const result = {
    fullDeniedWithoutPass: false, expiredPassDenied: false, activePassUx: false,
    activePassFullUnlocked: false, miniQuotaLocked: false, miniPassBypass: false,
    bolaOwnerRead: false, bolaCrossUserBlocked: false, adminCommerceVisible: false,
  }
  try {
    await waitForServer(server)
    await setEnforcement(admin, true)
    browser = await chromium.launch({ headless: true })

    {
      const session = await provision(admin); users.push(session.userId)
      const { context, page } = await pageFor(browser, session)
      await examCard(page, 'Tryout Lengkap TKA SMP').getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
      await expect(page.getByText('Paket aktif diperlukan untuk membuka tryout ini.', { exact: true })).toBeVisible()
      result.fullDeniedWithoutPass = true; await context.close()
    }
    {
      const session = await provision(admin); users.push(session.userId); await grantPass(admin, session.userId, 'expired')
      const { context, page } = await pageFor(browser, session, '/tka/smp/pass')
      await expect(page.getByTestId('tka-pass-status-inactive')).toContainText('Belum ada Tempur Pass aktif.')
      await page.goto(`${ORIGIN}/tka/smp`)
      await examCard(page, 'Tryout Lengkap TKA SMP').getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
      await expect(page.getByText('Paket aktif diperlukan untuk membuka tryout ini.', { exact: true })).toBeVisible()
      result.expiredPassDenied = true; await context.close()
    }
    {
      const session = await provision(admin); users.push(session.userId); await grantPass(admin, session.userId, 'active')
      const { context, page } = await pageFor(browser, session, '/tka/smp/pass')
      await expect(page.getByTestId('tka-pass-status-active')).toContainText('Tempur Pass aktif')
      await expect(page.getByRole('heading', { name: 'Perpanjang Tempur Pass TKA SMP', exact: true })).toBeVisible()
      result.activePassUx = true
      await page.goto(`${ORIGIN}/tka/smp`)
      await examCard(page, 'Tryout Lengkap TKA SMP').getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
      await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i, { timeout: 20_000 })
      result.activePassFullUnlocked = true; await context.close()
    }
    {
      const session = await provision(admin); users.push(session.userId); await seedMiniAttempt(admin, session.userId, 'tka-smp-mini-bahasa-indonesia')
      const { context, page } = await pageFor(browser, session)
      const locked = examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP').getByRole('button', { name: 'Kuota gratis habis · Butuh Tempur Pass', exact: true })
      await expect(locked).toBeVisible(); await expect(locked).toBeDisabled()
      result.miniQuotaLocked = true; await context.close()
    }
    {
      const session = await provision(admin); users.push(session.userId); await seedMiniAttempt(admin, session.userId, 'tka-smp-mini-matematika'); await grantPass(admin, session.userId, 'active')
      const { context, page } = await pageFor(browser, session)
      const mini = examCard(page, 'Mini Tryout Matematika TKA SMP')
      await expect(mini.getByText('Tempur Pass aktif', { exact: true })).toBeVisible()
      await mini.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
      await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i, { timeout: 20_000 })
      result.miniPassBypass = true; await context.close()
    }
    {
      const owner = await provision(admin), attacker = await provision(admin); users.push(owner.userId, attacker.userId)
      const order = await seedOrder(admin, owner.userId)
      const ownerOrder = await authenticatedRead(owner, 'orders', order.orderId)
      const ownerPayment = await authenticatedRead(owner, 'payments', order.orderId)
      const attackerOrder = await authenticatedRead(attacker, 'orders', order.orderId)
      const attackerPayment = await authenticatedRead(attacker, 'payments', order.orderId)
      if (ownerOrder?.id !== order.orderId || ownerPayment?.order_id !== order.orderId) throw new Error('BOLA_OWNER_READ_FAILED')
      if (attackerOrder !== null || attackerPayment !== null) throw new Error('BOLA_CROSS_USER_LEAK')
      result.bolaOwnerRead = true; result.bolaCrossUserBlocked = true
    }
    {
      const adminSession = await provision(admin, { learner: false, role: 'ADMIN' }); users.push(adminSession.userId)
      const order = await seedOrder(admin, adminSession.userId)
      const { context, page } = await pageFor(browser, adminSession, '/admin?program=TKA&track=SMP&tab=commerce')
      await expect(page.getByRole('heading', { name: 'Admin Workspace', exact: true })).toBeVisible()
      await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible()
      await expect(page.getByText('midtrans', { exact: true }).first()).toBeVisible()
      result.adminCommerceVisible = true; await context.close()
    }
    if (!Object.values(result).every(Boolean)) throw new Error(`M4_BROWSER_ASSERTION_FAILED:${JSON.stringify(result)}`)
    console.log('M4_BROWSER_QA_RESULT=' + JSON.stringify(result))
  } finally {
    try { await setEnforcement(admin, false) } catch {}
    if (browser) await browser.close().catch(() => undefined)
    for (const userId of [...new Set(users)].reverse()) { try { await admin.auth.admin.deleteUser(userId) } catch {} }
    server.kill('SIGTERM')
    await new Promise((resolve) => { if (server.exitCode !== null) return resolve(); server.once('exit', resolve); setTimeout(() => { if (server.exitCode === null) server.kill('SIGKILL'); resolve() }, 3_000).unref() })
    const [{ count: profiles }, { count: orders }, { count: entitlements }, { count: attempts }] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }).ilike('full_name', 'M4 Browser QA%'),
      admin.from('orders').select('id', { count: 'exact', head: true }).like('order_number', `${ORDER_PREFIX}%`),
      admin.from('entitlements').select('id', { count: 'exact', head: true }).eq('source_type', ENTITLEMENT_SOURCE),
      admin.from('exam_attempts').select('id', { count: 'exact', head: true }).contains('metadata', { m4_browser_qa: true }),
    ])
    const cleanup = { profiles: profiles ?? 0, orders: orders ?? 0, entitlements: entitlements ?? 0, attempts: attempts ?? 0 }
    console.log('M4_BROWSER_QA_CLEANUP=' + JSON.stringify(cleanup))
    if (Object.values(cleanup).some((value) => value !== 0)) throw new Error(`M4_BROWSER_CLEANUP_FAILED:${JSON.stringify(cleanup)}`)
    if (serverStderr.trim()) console.log('M4_BROWSER_QA_SERVER_STDERR=' + serverStderr.trim().slice(0, 2000))
  }
}

await run()
