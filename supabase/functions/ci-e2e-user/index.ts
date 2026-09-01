import { createClient } from 'npm:@supabase/supabase-js@2.103.2'

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com'
const EXPECTED_AUDIENCE = 'siap-tempur-staging-e2e'
const EXPECTED_REPOSITORY = '8shagrid/siap-tempur'
const EXPECTED_WORKFLOW_PREFIXES = [
  '8shagrid/siap-tempur/.github/workflows/tka-staging-e2e.yml@',
  '8shagrid/siap-tempur/.github/workflows/content-review-staging-e2e.yml@',
]
const GITHUB_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks'
const CI_EMAIL = /^ci-(?:tka|content-editor|content-reviewer)-[a-zA-Z0-9-]{1,96}@example\.invalid$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

type UserKind = 'tka' | 'content_editor' | 'content_reviewer'

type Body = {
  action?: 'provision' | 'cleanup'
  kind?: UserKind
  email?: string
  password?: string
  runId?: string
  userId?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
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
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    base64UrlBytes(parts[2]),
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
  if (!EXPECTED_WORKFLOW_PREFIXES.some((prefix) => claims.workflow_ref?.startsWith(prefix))) throw new Error('OIDC_WORKFLOW_INVALID')
  return claims
}

function adminApiKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      // Fall through to the legacy service-role key.
    }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  throw new Error('SUPABASE_ADMIN_KEY_MISSING')
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('SUPABASE_URL_MISSING')
  return createClient(url, adminApiKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function expectedEmailPrefix(kind: UserKind) {
  if (kind === 'content_editor') return 'ci-content-editor-'
  if (kind === 'content_reviewer') return 'ci-content-reviewer-'
  return 'ci-tka-'
}

async function assignContentRole(admin: ReturnType<typeof adminClient>, userId: string, roleCode: 'CONTENT_EDITOR' | 'CONTENT_REVIEWER') {
  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .maybeSingle()
  if (roleError || !role) throw roleError ?? new Error(`${roleCode}_ROLE_NOT_FOUND`)

  const { error: assignmentError } = await admin
    .from('user_roles')
    .insert({ user_id: userId, role_id: role.id, scope_type: null, scope_id: null })
  if (assignmentError) throw assignmentError
}

async function provision(body: Body) {
  const kind = body.kind ?? 'tka'
  if (!['tka', 'content_editor', 'content_reviewer'].includes(kind)) return json({ error: 'CI_USER_KIND_INVALID' }, 400)

  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const runId = body.runId?.trim() ?? ''
  if (!CI_EMAIL.test(email) || !email.startsWith(expectedEmailPrefix(kind))) return json({ error: 'CI_EMAIL_INVALID' }, 400)
  if (password.length < 20 || password.length > 160) return json({ error: 'CI_PASSWORD_INVALID' }, 400)
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(runId)) return json({ error: 'CI_RUN_ID_INVALID' }, 400)

  const admin = adminClient()
  const fullName = kind === 'content_editor' ? 'CI Content Editor' : kind === 'content_reviewer' ? 'CI Content Reviewer' : 'CI TKA SMP'
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      ci_e2e: true,
      ci_kind: kind,
      github_run_id: runId,
    },
  })
  if (createError || !created.user) throw createError ?? new Error('CI_USER_CREATE_FAILED')

  const userId = created.user.id
  try {
    if (kind === 'tka') {
      const { data: program, error: programError } = await admin
        .from('programs')
        .select('id')
        .eq('code', 'TKA')
        .maybeSingle()
      if (programError || !program) throw programError ?? new Error('TKA_PROGRAM_NOT_FOUND')

      const { data: track, error: trackError } = await admin
        .from('tracks')
        .select('id')
        .eq('program_id', program.id)
        .eq('code', 'SMP')
        .maybeSingle()
      if (trackError || !track) throw trackError ?? new Error('TKA_SMP_TRACK_NOT_FOUND')

      const { error: userTrackError } = await admin
        .from('user_tracks')
        .upsert({
          user_id: userId,
          track_id: track.id,
          status: 'active',
          target_year: 2026,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,track_id' })
      if (userTrackError) throw userTrackError
    } else if (kind === 'content_editor') {
      await assignContentRole(admin, userId, 'CONTENT_EDITOR')
    } else {
      await assignContentRole(admin, userId, 'CONTENT_REVIEWER')
    }

    return json({ userId, kind })
  } catch (error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
    throw error
  }
}

async function cleanupContentEditorArtifacts(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data: questions, error: questionError } = await admin
    .from('questions')
    .select('id, question_code')
    .eq('author_id', userId)
    .like('question_code', 'CWS-%')
  if (questionError) throw questionError
  const questionIds = (questions ?? []).map((row) => String(row.id))
  if (questionIds.length === 0) return

  const [{ count: examRefs, error: examRefError }, { count: attemptRefs, error: attemptRefError }] = await Promise.all([
    admin.from('exam_question_items').select('id', { count: 'exact', head: true }).in('question_id', questionIds),
    admin.from('attempt_questions').select('id', { count: 'exact', head: true }).in('question_id', questionIds),
  ])
  if (examRefError) throw examRefError
  if (attemptRefError) throw attemptRefError
  if ((examRefs ?? 0) > 0 || (attemptRefs ?? 0) > 0) throw new Error('CI_CONTENT_CLEANUP_OPERATIONAL_REFERENCE')

  const cleanupSteps = [
    () => admin.from('content_reviews').delete().eq('entity_type', 'question').in('entity_id', questionIds),
    () => admin.from('audit_logs').delete().eq('entity_type', 'question').in('entity_id', questionIds),
    () => admin.from('questions').delete().in('id', questionIds),
  ]
  for (const step of cleanupSteps) {
    const { error } = await step()
    if (error) throw error
  }
}

async function cleanup(body: Body) {
  const userId = body.userId ?? ''
  if (!UUID.test(userId)) return json({ error: 'CI_USER_ID_INVALID' }, 400)

  const admin = adminClient()
  const { data, error: getError } = await admin.auth.admin.getUserById(userId)
  if (getError) {
    if (String(getError.message).toLowerCase().includes('not found')) return json({ ok: true, alreadyDeleted: true })
    throw getError
  }

  const user = data.user
  const marked = user?.user_metadata?.ci_e2e === true
  const email = user?.email ?? ''
  if (!marked || !CI_EMAIL.test(email)) return json({ error: 'CI_USER_DELETE_FORBIDDEN' }, 403)

  if (user?.user_metadata?.ci_kind === 'content_editor') {
    await cleanupContentEditorArtifacts(admin, userId)
  }

  const { error: auditActorError } = await admin.from('audit_logs').delete().eq('actor_user_id', userId)
  if (auditActorError) throw auditActorError

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) throw deleteError
  return json({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  try {
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'OIDC_REQUIRED' }, 401)
    await verifyGithubOidc(authHeader.slice('Bearer '.length).trim())

    const body = await req.json() as Body
    if (body.action === 'provision') return await provision(body)
    if (body.action === 'cleanup') return await cleanup(body)
    return json({ error: 'ACTION_INVALID' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const unauthorized = message.startsWith('OIDC_')
    console.error('[ci-e2e-user]', message)
    return json({ error: unauthorized ? 'OIDC_INVALID' : 'CI_E2E_USER_FAILED' }, unauthorized ? 401 : 500)
  }
})
