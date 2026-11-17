#!/usr/bin/env node
/**
 * Emulator lokal untuk Edge Function CI E2E SiapTempur.
 *
 * Latar belakang: gate staging di GitHub Actions memakai Supabase Edge Function
 * (`ci-e2e-user`, `ci-e2e-cpns`, `ci-e2e-admin`) yang diverifikasi lewat GitHub OIDC.
 * Untuk bisa menjalankan gate yang sama **lokal / di Docker tanpa GitHub Actions**, script ini
 * meniru endpoint tersebut memakai service-role key dari `.env.local` (staging).
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CI_TKA_EMAIL =
  /^ci-(?:tka|content-editor|content-reviewer)-[a-zA-Z0-9-]{1,96}@example\.invalid$/
const CI_CPNS_EMAIL = /^ci-cpns-[a-zA-Z0-9-]{1,96}@example\.invalid$/
const CI_ADMIN_EMAIL = /^ci-admin-[a-zA-Z0-9-]{1,96}@example\.invalid$/
/** Cerminan ALLOWED_ROLES di `supabase/functions/ci-e2e-admin`. SUPER_ADMIN tidak ada. */
const CI_ADMIN_ALLOWED_ROLES = [
  'ADMIN',
  'CONTENT_EDITOR',
  'CONTENT_REVIEWER',
  'FINANCE',
  'SUPPORT',
  'SCHOOL_ADMIN',
]

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
if (!supabaseUrl || !serviceRoleKey)
  throw new Error('NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib ada')
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
if (projectRef !== EXPECTED_STAGING_REF)
  throw new Error(`Helper lokal hanya untuk staging (${EXPECTED_STAGING_REF}); dapat ${projectRef}`)

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const json = (status, body) => ({ status, body })

async function findProgramTrack(programCode, trackCode) {
  const { data: program, error: programError } = await admin
    .from('programs')
    .select('id')
    .eq('code', programCode)
    .maybeSingle()
  if (programError || !program) throw programError ?? new Error(`${programCode}_PROGRAM_NOT_FOUND`)
  const { data: track, error: trackError } = await admin
    .from('tracks')
    .select('id')
    .eq('program_id', program.id)
    .eq('code', trackCode)
    .maybeSingle()
  if (trackError || !track)
    throw trackError ?? new Error(`${programCode}_${trackCode}_TRACK_NOT_FOUND`)
  return { programId: program.id, trackId: track.id }
}

async function createUser({ email, password, metadata }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // Akun uji sudah menyetujui S&K agar tidak dialihkan ke /persetujuan (lib/consent.ts).
    user_metadata: {
      ...metadata,
      consent: { version: '2026-11-17', accepted_at: new Date().toISOString(), age_basis: 'adult' },
    },
  })
  if (error || !data.user) throw error ?? new Error('CI_USER_CREATE_FAILED')
  return data.user.id
}

async function assignRole(userId, roleCode) {
  const { data: role, error } = await admin
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .maybeSingle()
  if (error || !role) throw error ?? new Error(`${roleCode}_ROLE_NOT_FOUND`)
  const { data: existing } = await admin
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', role.id)
    .is('scope_type', null)
    .is('scope_id', null)
    .maybeSingle()
  if (existing) return
  const { error: insertError } = await admin
    .from('user_roles')
    .insert({ user_id: userId, role_id: role.id, scope_type: null, scope_id: null })
  if (insertError) throw insertError
}

async function activateTrack(userId, programCode, trackCode) {
  const { trackId } = await findProgramTrack(programCode, trackCode)
  const now = new Date().toISOString()
  const { error } = await admin.from('user_tracks').upsert(
    {
      user_id: userId,
      track_id: trackId,
      status: 'active',
      target_year: 2026,
      started_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id,track_id' },
  )
  if (error) throw error
}

/** Hapus seluruh baris milik user sebelum menghapus auth user (menghindari FK error). */
async function purgeUserData(userId) {
  const { data: attempts } = await admin.from('exam_attempts').select('id').eq('user_id', userId)
  const attemptIds = (attempts ?? []).map((row) => row.id)
  if (attemptIds.length > 0) {
    const { data: questions } = await admin
      .from('attempt_questions')
      .select('id')
      .in('attempt_id', attemptIds)
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

/**
 * Baris review yang ditinggalkan user CI.
 *
 * `content_reviews.reviewer_id` dan `questions.reviewer_id` memakai ON DELETE
 * RESTRICT, sehingga reviewer CI tidak pernah bisa dihapus — profil gagal
 * dihapus, lalu `auth.admin.deleteUser` gagal "Database error deleting user".
 */
async function cleanupReviewerArtifacts(userId) {
  const { error: reviewError } = await admin
    .from('content_reviews')
    .delete()
    .eq('reviewer_id', userId)
  if (reviewError) throw reviewError
  const { error: questionError } = await admin
    .from('questions')
    .update({ reviewer_id: null })
    .eq('reviewer_id', userId)
  if (questionError) throw questionError
}

/**
 * Artifact content editor: soal CWS-* yang dibuat user CI.
 *
 * Cerminan `cleanupContentEditorArtifacts` di `supabase/functions/ci-e2e-user`.
 * Tanpa ini, `auth.admin.deleteUser` gagal "Database error deleting user" karena
 * `questions.author_id` masih mereferensikan user tersebut.
 */
async function cleanupContentEditorArtifacts(userId) {
  const { data: questions, error: questionError } = await admin
    .from('questions')
    .select('id')
    .eq('author_id', userId)
    .like('question_code', 'CWS-%')
  if (questionError) throw questionError
  const questionIds = (questions ?? []).map((row) => String(row.id))
  if (questionIds.length === 0) return

  // Soal yang sudah dipakai exam/attempt bukan artifact CI — jangan dihapus.
  const [{ count: examRefs, error: examRefError }, { count: attemptRefs, error: attemptRefError }] =
    await Promise.all([
      admin
        .from('exam_question_items')
        .select('id', { count: 'exact', head: true })
        .in('question_id', questionIds),
      admin
        .from('attempt_questions')
        .select('id', { count: 'exact', head: true })
        .in('question_id', questionIds),
    ])
  if (examRefError) throw examRefError
  if (attemptRefError) throw attemptRefError
  if ((examRefs ?? 0) > 0 || (attemptRefs ?? 0) > 0)
    throw new Error('CI_CONTENT_CLEANUP_OPERATIONAL_REFERENCE')

  for (const step of [
    () =>
      admin
        .from('content_reviews')
        .delete()
        .eq('entity_type', 'question')
        .in('entity_id', questionIds),
    () =>
      admin.from('audit_logs').delete().eq('entity_type', 'question').in('entity_id', questionIds),
    () => admin.from('questions').delete().in('id', questionIds),
  ]) {
    const { error } = await step()
    if (error) throw error
  }
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
    if (!['tka', 'content_editor', 'content_reviewer'].includes(kind))
      return json(400, { error: 'CI_USER_KIND_INVALID' })
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')
    if (!CI_TKA_EMAIL.test(email) || !email.startsWith(`ci-${kind.replace('_', '-')}-`))
      return json(400, { error: 'CI_EMAIL_INVALID' })
    if (password.length < 20 || password.length > 160)
      return json(400, { error: 'CI_PASSWORD_INVALID' })

    const fullName =
      kind === 'content_editor'
        ? 'CI Content Editor'
        : kind === 'content_reviewer'
          ? 'CI Content Reviewer'
          : 'CI TKA SMP'
    const userId = await createUser({
      email,
      password,
      metadata: {
        full_name: fullName,
        ci_e2e: true,
        ci_kind: kind,
        github_run_id: String(body.runId ?? ''),
      },
    })
    try {
      if (kind === 'tka') {
        await activateTrack(userId, 'TKA', 'SMP')
        const { error } = await admin.from('wallets').upsert(
          {
            user_id: userId,
            wallet_type: 'exam_token_tka',
            balance: 50,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,wallet_type' },
        )
        if (error) throw error
      } else
        await assignRole(userId, kind === 'content_editor' ? 'CONTENT_EDITOR' : 'CONTENT_REVIEWER')
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
    if (user.user_metadata?.ci_e2e !== true || !CI_TKA_EMAIL.test(user.email ?? ''))
      return json(403, { error: 'CI_USER_DELETE_FORBIDDEN' })
    if (user.user_metadata?.ci_kind === 'content_editor')
      await cleanupContentEditorArtifacts(userId)
    await cleanupReviewerArtifacts(userId)
    await deleteUserFully(userId)
    return json(200, { ok: true })
  }

  return json(400, { error: 'ACTION_INVALID' })
}

// --------------------------------------------------------------- ci-e2e-cpns

async function ciCpns(body) {
  if (body.action === 'provision') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')
    if (!CI_CPNS_EMAIL.test(email)) return json(400, { error: 'CI_EMAIL_INVALID' })
    if (password.length < 20 || password.length > 160)
      return json(400, { error: 'CI_PASSWORD_INVALID' })

    const userId = await createUser({
      email,
      password,
      metadata: {
        full_name: 'CI CPNS SKD',
        ci_e2e: true,
        ci_kind: 'cpns',
        github_run_id: String(body.runId ?? ''),
      },
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
    if (
      user.user_metadata?.ci_e2e !== true ||
      user.user_metadata?.ci_kind !== 'cpns' ||
      !CI_CPNS_EMAIL.test(user.email ?? '')
    ) {
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
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')
    if (!CI_ADMIN_EMAIL.test(email)) return json(400, { error: 'CI_ADMIN_EMAIL_INVALID' })
    if (password.length < 20 || password.length > 160)
      return json(400, { error: 'CI_ADMIN_PASSWORD_INVALID' })

    const userId = await createUser({
      email,
      password,
      metadata: {
        full_name: 'CI Admin Workspace',
        ci_e2e: true,
        ci_kind: 'admin',
        github_run_id: String(body.runId ?? ''),
      },
    })
    try {
      // Mengikuti Edge Function asli: peran opsional untuk menguji alur tiap
      // peran, dengan SUPER_ADMIN sengaja TIDAK diizinkan.
      const role = String(body.role ?? 'ADMIN')
        .trim()
        .toUpperCase()
      if (!CI_ADMIN_ALLOWED_ROLES.includes(role)) {
        await deleteUserFully(userId).catch(() => undefined)
        return json(400, { error: 'CI_ADMIN_ROLE_NOT_ALLOWED' })
      }
      await assignRole(userId, role)
      return json(200, { userId, role })
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
    if (
      user.user_metadata?.ci_e2e !== true ||
      user.user_metadata?.ci_kind !== 'admin' ||
      !CI_ADMIN_EMAIL.test(user.email ?? '')
    ) {
      return json(403, { error: 'CI_USER_DELETE_FORBIDDEN' })
    }
    await deleteUserFully(userId)
    return json(200, { ok: true })
  }

  return json(400, { error: 'ACTION_INVALID' })
}

const ROUTES = {
  'ci-e2e-user': ciUser,
  'ci-e2e-cpns': ciCpns,
  'ci-e2e-admin': ciAdmin,
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
  if (!(request.headers.authorization ?? '').startsWith('Bearer '))
    return send(json(401, { error: 'OIDC_REQUIRED' }))

  let raw = ''
  request.on('data', (chunk) => {
    raw += chunk
  })
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
  console.log(
    `[ci-helper] emulator Edge Function siap di http://127.0.0.1:${port}/functions/v1 (staging: ${projectRef})`,
  )
})
