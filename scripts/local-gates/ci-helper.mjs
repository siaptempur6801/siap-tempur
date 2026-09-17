#!/usr/bin/env node
/**
 * Emulator lokal untuk Edge Function CI E2E SiapTempur.
 *
 * Latar belakang: gate staging di GitHub Actions memakai Supabase Edge Function
 * (`ci-e2e-user`, `ci-e2e-cpns`, `ci-e2e-admin`, `ci-e2e-m4`) yang diverifikasi lewat GitHub OIDC.
 * Untuk bisa menjalankan gate yang sama **lokal / di Docker tanpa GitHub Actions**, script ini
 * meniru keempat endpoint itu memakai service-role key dari `.env.local` (staging).
 *
 * Pemakaian:
 *   node scripts/local-gates/ci-helper.mjs            # listen di 127.0.0.1:54399
 *   CI_HELPER_PORT=54399 node scripts/local-gates/ci-helper.mjs
 *
 * Port default 54399 (bukan 54321) supaya tidak bentrok dengan Supabase lokal (`supabase start`).
 *
 * Lalu jalankan spec dengan:
 *   CI_E2E_HELPER_BASE_URL=http://127.0.0.1:54399/functions/v1
 *   E2E_GITHUB_OIDC_TOKEN=local-docker
 *
 * KEAMANAN: hanya untuk staging, hanya untuk lokal. Tidak memverifikasi OIDC dan memakai
 * service-role key, jadi jangan pernah diekspos ke jaringan publik / produksi.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(resolve(process.cwd(), 'package.json'))
const { createClient } = require('@supabase/supabase-js')

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const M4_ORDER_PREFIX = 'TKA-M4-'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CI_TKA_EMAIL = /^ci-(?:tka|content-editor|content-reviewer)-[a-zA-Z0-9-]{1,96}@example\.invalid$/
const CI_CPNS_EMAIL = /^ci-cpns-[a-zA-Z0-9-]{1,96}@example\.invalid$/
const CI_ADMIN_EMAIL = /^ci-admin-[a-zA-Z0-9-]{1,96}@example\.invalid$/

function loadEnvFile(path = '.env.local') {
    try {
        return Object.fromEntries(
            readFileSync(resolve(process.cwd(), path), 'utf8')
                .split('\n')
                .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
                .map((line) => {
                    const index = line.indexOf('=')
                    return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
                }),
        )
    } catch {
        return {}
    }
}

const fileEnv = loadEnvFile()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib ada')
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
if (projectRef !== EXPECTED_STAGING_REF) throw new Error(`Helper lokal hanya untuk staging (${EXPECTED_STAGING_REF}); dapat ${projectRef}`)

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

const json = (status, body) => ({ status, body })

async function findProgramTrack(programCode, trackCode) {
    const { data: program, error: programError } = await admin.from('programs').select('id').eq('code', programCode).maybeSingle()
    if (programError || !program) throw programError ?? new Error(`${programCode}_PROGRAM_NOT_FOUND`)
    const { data: track, error: trackError } = await admin.from('tracks').select('id').eq('program_id', program.id).eq('code', trackCode).maybeSingle()
    if (trackError || !track) throw trackError ?? new Error(`${programCode}_${trackCode}_TRACK_NOT_FOUND`)
    return { programId: program.id, trackId: track.id }
}

async function createUser({ email, password, metadata }) {
    const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
    })
    if (error || !data.user) throw error ?? new Error('CI_USER_CREATE_FAILED')
    return data.user.id
}

async function assignRole(userId, roleCode) {
    const { data: role, error } = await admin.from('roles').select('id').eq('code', roleCode).maybeSingle()
    if (error || !role) throw error ?? new Error(`${roleCode}_ROLE_NOT_FOUND`)
    const { data: existing } = await admin
        .from('user_roles').select('id')
        .eq('user_id', userId).eq('role_id', role.id)
        .is('scope_type', null).is('scope_id', null).maybeSingle()
    if (existing) return
    const { error: insertError } = await admin.from('user_roles').insert({ user_id: userId, role_id: role.id, scope_type: null, scope_id: null })
    if (insertError) throw insertError
}

async function activateTrack(userId, programCode, trackCode) {
    const { trackId } = await findProgramTrack(programCode, trackCode)
    const now = new Date().toISOString()
    const { error } = await admin.from('user_tracks').upsert(
        { user_id: userId, track_id: trackId, status: 'active', target_year: 2026, started_at: now, updated_at: now },
        { onConflict: 'user_id,track_id' },
    )
    if (error) throw error
}

/** Hapus seluruh baris milik user sebelum menghapus auth user (menghindari FK error). */
async function purgeUserData(userId) {
    const { data: attempts } = await admin.from('exam_attempts').select('id').eq('user_id', userId)
    const attemptIds = (attempts ?? []).map((row) => row.id)
    if (attemptIds.length > 0) {
        const { data: questions } = await admin.from('attempt_questions').select('id').in('attempt_id', attemptIds)
        const questionIds = (questions ?? []).map((row) => row.id)
        if (questionIds.length > 0) {
            await admin.from('attempt_answers').delete().in('attempt_question_id', questionIds)
            await admin.from('attempt_questions').delete().in('id', questionIds)
        }
        await admin.from('exam_attempts').delete().in('id', attemptIds)
    }

    const { data: orders } = await admin.from('orders').select('id').eq('user_id', userId)
    const orderIds = (orders ?? []).map((row) => row.id)
    if (orderIds.length > 0) {
        await admin.from('payments').delete().in('order_id', orderIds)
        await admin.from('order_items').delete().in('order_id', orderIds)
        await admin.from('orders').delete().in('id', orderIds)
    }

    const tables = [
        'audit_logs:actor_user_id',
        'user_roles:user_id',
        'entitlements:user_id',
        'user_tracks:user_id',
        'wallet_transactions:user_id',
        'wallets:user_id',
        'user_knowledge_progress:user_id',
        'user_subject_progress:user_id',
        'user_wrong_questions:user_id',
        'learning_recommendations:user_id',
    ]
    for (const entry of tables) {
        const [table, column] = entry.split(':')
        await admin.from(table).delete().eq(column, userId)
    }
    await admin.from('profiles').delete().eq('id', userId)
}

async function deleteUserFully(userId) {
    await purgeUserData(userId)
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error && !String(error.message).toLowerCase().includes('not found')) throw error
}

async function getUserOrNull(userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) {
        if (String(error.message).toLowerCase().includes('not found')) return null
        throw error
    }
    return data.user ?? null
}

// ---------------------------------------------------------------- ci-e2e-user

async function ciUser(body) {
    if (body.action === 'provision') {
        const kind = body.kind ?? 'tka'
        if (!['tka', 'content_editor', 'content_reviewer'].includes(kind)) return json(400, { error: 'CI_USER_KIND_INVALID' })
        const email = String(body.email ?? '').trim().toLowerCase()
        const password = String(body.password ?? '')
        if (!CI_TKA_EMAIL.test(email) || !email.startsWith(`ci-${kind.replace('_', '-')}-`)) return json(400, { error: 'CI_EMAIL_INVALID' })
        if (password.length < 20 || password.length > 160) return json(400, { error: 'CI_PASSWORD_INVALID' })

        const fullName = kind === 'content_editor' ? 'CI Content Editor' : kind === 'content_reviewer' ? 'CI Content Reviewer' : 'CI TKA SMP'
        const userId = await createUser({
            email,
            password,
            metadata: { full_name: fullName, ci_e2e: true, ci_kind: kind, github_run_id: String(body.runId ?? '') },
        })
        try {
            if (kind === 'tka') await activateTrack(userId, 'TKA', 'SMP')
            else await assignRole(userId, kind === 'content_editor' ? 'CONTENT_EDITOR' : 'CONTENT_REVIEWER')
            return json(200, { userId, kind })
        } catch (error) {
            await deleteUserFully(userId).catch(() => undefined)
            throw error
        }
    }

    if (body.action === 'cleanup') {
        const userId = String(body.userId ?? '')
        if (!UUID.test(userId)) return json(400, { error: 'CI_USER_ID_INVALID' })
        const user = await getUserOrNull(userId)
        if (!user) return json(200, { ok: true, alreadyDeleted: true })
        if (user.user_metadata?.ci_e2e !== true || !CI_TKA_EMAIL.test(user.email ?? '')) return json(403, { error: 'CI_USER_DELETE_FORBIDDEN' })
        await deleteUserFully(userId)
        return json(200, { ok: true })
    }

    return json(400, { error: 'ACTION_INVALID' })
}

// --------------------------------------------------------------- ci-e2e-cpns

async function ciCpns(body) {
    if (body.action === 'provision') {
        const email = String(body.email ?? '').trim().toLowerCase()
        const password = String(body.password ?? '')
        if (!CI_CPNS_EMAIL.test(email)) return json(400, { error: 'CI_EMAIL_INVALID' })
        if (password.length < 20 || password.length > 160) return json(400, { error: 'CI_PASSWORD_INVALID' })

        const userId = await createUser({
            email,
            password,
            metadata: { full_name: 'CI CPNS SKD', ci_e2e: true, ci_kind: 'cpns', github_run_id: String(body.runId ?? '') },
        })
        try {
            await activateTrack(userId, 'CPNS', 'SKD')
            const now = new Date().toISOString()
            const { error } = await admin.from('wallets').upsert(
                // Saldo token dipisah per program: gate CPNS memakai wallet CPNS.
                { user_id: userId, wallet_type: 'exam_token_cpns', balance: 3, updated_at: now },
                { onConflict: 'user_id,wallet_type' },
            )
            if (error) throw error
            return json(200, { userId, walletBalance: 3 })
        } catch (error) {
            await deleteUserFully(userId).catch(() => undefined)
            throw error
        }
    }

    if (body.action === 'cleanup') {
        const userId = String(body.userId ?? '')
        if (!UUID.test(userId)) return json(400, { error: 'CI_USER_ID_INVALID' })
        const user = await getUserOrNull(userId)
        if (!user) return json(200, { ok: true, alreadyDeleted: true })
        if (user.user_metadata?.ci_e2e !== true || user.user_metadata?.ci_kind !== 'cpns' || !CI_CPNS_EMAIL.test(user.email ?? '')) {
            return json(403, { error: 'CI_USER_DELETE_FORBIDDEN' })
        }
        await deleteUserFully(userId)
        return json(200, { ok: true })
    }

    return json(400, { error: 'ACTION_INVALID' })
}

// -------------------------------------------------------------- ci-e2e-admin

async function ciAdmin(body) {
    if (body.action === 'provision') {
        const email = String(body.email ?? '').trim().toLowerCase()
        const password = String(body.password ?? '')
        if (!CI_ADMIN_EMAIL.test(email)) return json(400, { error: 'CI_ADMIN_EMAIL_INVALID' })
        if (password.length < 20 || password.length > 160) return json(400, { error: 'CI_ADMIN_PASSWORD_INVALID' })

        const userId = await createUser({
            email,
            password,
            metadata: { full_name: 'CI Admin Workspace', ci_e2e: true, ci_kind: 'admin', github_run_id: String(body.runId ?? '') },
        })
        try {
            await assignRole(userId, 'ADMIN')
            return json(200, { userId })
        } catch (error) {
            await deleteUserFully(userId).catch(() => undefined)
            throw error
        }
    }

    if (body.action === 'cleanup') {
        const userId = String(body.userId ?? '')
        if (!UUID.test(userId)) return json(400, { error: 'CI_USER_ID_INVALID' })
        const user = await getUserOrNull(userId)
        if (!user) return json(200, { ok: true, alreadyDeleted: true })
        if (user.user_metadata?.ci_e2e !== true || user.user_metadata?.ci_kind !== 'admin' || !CI_ADMIN_EMAIL.test(user.email ?? '')) {
            return json(403, { error: 'CI_USER_DELETE_FORBIDDEN' })
        }
        await deleteUserFully(userId)
        return json(200, { ok: true })
    }

    return json(400, { error: 'ACTION_INVALID' })
}

// ----------------------------------------------------------------- ci-e2e-m4

async function assertCiTkaUser(userId) {
    if (!UUID.test(userId)) throw new Error('CI_USER_ID_INVALID')
    const user = await getUserOrNull(userId)
    // Samakan dengan pesan Supabase Auth ("User not found") supaya jalur
    // `allowMissingUser` di spec cleanup ikut bekerja seperti di CI.
    if (!user) throw new Error('User not found')
    if (user.user_metadata?.ci_e2e !== true || user.user_metadata?.ci_kind !== 'tka' || !CI_TKA_EMAIL.test(user.email ?? '')) {
        throw new Error('CI_USER_TARGET_FORBIDDEN')
    }
    return user
}

async function m4SetEnforcement(enabled) {
    const { error } = await admin.from('feature_flags').update({
        enabled,
        rollout_percentage: enabled ? 100 : 0,
        config: { program: 'TKA', track: 'SMP', milestone: 4, mode: enabled ? 'security_closure' : 'dark_launch' },
    }).eq('key', 'tka.smp.monetization_enforcement')
    if (error) throw error
    return { enabled, rolloutPercentage: enabled ? 100 : 0 }
}

async function m4ClearPass(userId) {
    await assertCiTkaUser(userId)
    const { error } = await admin.from('entitlements').delete().eq('user_id', userId).eq('source_type', 'ci_e2e_m4')
    if (error) throw error
    return { ok: true }
}

async function m4GrantPass(userId, mode) {
    await assertCiTkaUser(userId)
    await m4ClearPass(userId)
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
    const { error } = await admin.from('entitlements').insert(rows)
    if (error) throw error
    return { mode, entitlementCount: rows.length, expiresAt: expiresAt.toISOString() }
}

async function m4ConsumeMini(userId, examSlug) {
    await assertCiTkaUser(userId)
    if (!/^tka-smp-mini-(bahasa-indonesia|matematika)$/.test(examSlug)) throw new Error('MINI_SLUG_INVALID')
    const { data: exam, error: examError } = await admin.from('exams').select('id').eq('slug', examSlug).maybeSingle()
    if (examError || !exam) throw examError ?? new Error('MINI_EXAM_NOT_FOUND')
    const { data: attempts, error: attemptError } = await admin
        .from('exam_attempts').select('attempt_number')
        .eq('exam_id', exam.id).eq('user_id', userId)
        .order('attempt_number', { ascending: false }).limit(1)
    if (attemptError) throw attemptError
    const next = Number(attempts?.[0]?.attempt_number ?? 0) + 1
    const now = new Date().toISOString()
    const { data: inserted, error } = await admin.from('exam_attempts').insert({
        exam_id: exam.id,
        user_id: userId,
        attempt_number: next,
        status: 'completed',
        started_at: now,
        submitted_at: now,
        metadata: { ci_e2e_m4: true, quota_seed: true },
    }).select('id').single()
    if (error) throw error
    return { attemptId: inserted.id, attemptNumber: next }
}

async function m4SeedOrder(userId) {
    await assertCiTkaUser(userId)
    const { data: product, error: productError } = await admin.from('products').select('id, code').eq('code', 'TKA_SMP_PASS_30').maybeSingle()
    if (productError || !product) throw productError ?? new Error('PASS_PRODUCT_NOT_FOUND')
    const now = new Date().toISOString()
    const { data: price, error: priceError } = await admin.from('product_prices')
        .select('amount, currency').eq('product_id', product.id)
        .ilike('status', 'active').lte('starts_at', now).or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('starts_at', { ascending: false }).limit(1).maybeSingle()
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

async function m4ClearM4(userId) {
    await assertCiTkaUser(userId)
    const { data: orders, error: orderReadError } = await admin
        .from('orders').select('id, order_number')
        .eq('user_id', userId).like('order_number', `${M4_ORDER_PREFIX}%`)
    if (orderReadError) throw orderReadError
    const orderIds = (orders ?? []).map((row) => row.id)
    if (orderIds.length > 0) {
        const { data: payments, error: paymentReadError } = await admin
            .from('payments').select('provider_transaction_id').in('order_id', orderIds)
        if (paymentReadError) throw paymentReadError
        for (const prefix of (payments ?? []).map((row) => row.provider_transaction_id).filter(Boolean)) {
            await admin.from('payment_webhook_events').delete().like('event_id', `${prefix}:%`)
        }
        await admin.from('order_items').delete().in('order_id', orderIds)
        await admin.from('payments').delete().in('order_id', orderIds)
        await admin.from('orders').delete().in('id', orderIds)
    }
    await admin.from('entitlements').delete().eq('user_id', userId).eq('source_type', 'ci_e2e_m4')
    await admin.from('exam_attempts').delete().eq('user_id', userId).contains('metadata', { ci_e2e_m4: true })
    const { data: adminRole } = await admin.from('roles').select('id').eq('code', 'ADMIN').maybeSingle()
    if (adminRole?.id) {
        await admin.from('user_roles').delete()
            .eq('user_id', userId).eq('role_id', adminRole.id)
            .is('scope_type', null).is('scope_id', null)
    }
    return { ordersDeleted: orderIds.length }
}

async function m4Snapshot(userId) {
    await assertCiTkaUser(userId)
    const [{ count: entitlements }, { count: orders }, { count: attempts }] = await Promise.all([
        admin.from('entitlements').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('source_type', 'ci_e2e_m4'),
        admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).like('order_number', `${M4_ORDER_PREFIX}%`),
        admin.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId).contains('metadata', { ci_e2e_m4: true }),
    ])
    return { entitlements: entitlements ?? 0, orders: orders ?? 0, attempts: attempts ?? 0 }
}

async function ciM4(body) {
    if (body.action === 'set_enforcement') return json(200, await m4SetEnforcement(body.enabled === true))
    const userId = String(body.userId ?? '')
    if (!userId) return json(400, { error: 'CI_USER_ID_REQUIRED' })
    if (body.action === 'grant_pass') return json(200, await m4GrantPass(userId, body.mode === 'expired' ? 'expired' : 'active'))
    if (body.action === 'clear_pass') return json(200, await m4ClearPass(userId))
    if (body.action === 'consume_mini') return json(200, await m4ConsumeMini(userId, String(body.examSlug ?? '')))
    if (body.action === 'seed_order') return json(200, await m4SeedOrder(userId))
    if (body.action === 'assign_admin') {
        await assertCiTkaUser(userId)
        await assignRole(userId, 'ADMIN')
        return json(200, { ok: true })
    }
    if (body.action === 'clear_m4') return json(200, await m4ClearM4(userId))
    if (body.action === 'snapshot') return json(200, await m4Snapshot(userId))
    return json(400, { error: 'ACTION_INVALID' })
}

const ROUTES = {
    'ci-e2e-user': ciUser,
    'ci-e2e-cpns': ciCpns,
    'ci-e2e-admin': ciAdmin,
    'ci-e2e-m4': ciM4,
}

const server = createServer((request, response) => {
    const send = (payload) => {
        response.writeHead(payload.status, { 'content-type': 'application/json; charset=utf-8' })
        response.end(JSON.stringify(payload.body))
    }

    if (request.method !== 'POST') return send(json(405, { error: 'METHOD_NOT_ALLOWED' }))
    const name = (request.url ?? '').split('?')[0].split('/').filter(Boolean).pop() ?? ''
    const handler = ROUTES[name]
    if (!handler) return send(json(404, { error: 'FUNCTION_NOT_FOUND' }))
    if (!(request.headers.authorization ?? '').startsWith('Bearer ')) return send(json(401, { error: 'OIDC_REQUIRED' }))

    let raw = ''
    request.on('data', (chunk) => { raw += chunk })
    request.on('end', async () => {
        try {
            const body = raw ? JSON.parse(raw) : {}
            const payload = await handler(body)
            console.log(`[ci-helper] ${name} ${String(body.action ?? '-')} → ${payload.status}`)
            send(payload)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.error(`[ci-helper] ${name} gagal:`, message)
            send(json(500, { error: message }))
        }
    })
})

const port = Number(process.env.CI_HELPER_PORT || 54399)
server.listen(port, '127.0.0.1', () => {
    console.log(`[ci-helper] emulator Edge Function siap di http://127.0.0.1:${port}/functions/v1 (staging: ${projectRef})`)
})
