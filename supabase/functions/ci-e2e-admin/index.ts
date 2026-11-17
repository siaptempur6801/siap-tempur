import { createClient } from 'npm:@supabase/supabase-js@2.103.2'

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com'
const EXPECTED_AUDIENCE = 'siap-tempur-staging-e2e'
// Repo GitHub yang boleh memanggil fungsi ini lewat OIDC. Default: repo lama dan
// repo `origin` saat ini (keduanya milik pemilik project). Persempit lewat secret
// fungsi CI_E2E_ALLOWED_REPOSITORIES (dipisah koma).
const ALLOWED_REPOSITORIES = (
  Deno.env.get('CI_E2E_ALLOWED_REPOSITORIES') ?? '8shagrid/siap-tempur,siaptempur6801/siap-tempur'
)
  .split(',')
  .map((repository) => repository.trim())
  .filter(Boolean)
// Fungsi ini membuat/menghapus user uji memakai service role, jadi hanya boleh
// berjalan di project staging. Di project lain (mis. production) ia menolak semua
// permintaan walau tidak sengaja ter-deploy (audit N-09).
const ALLOWED_PROJECT_REF = Deno.env.get('CI_E2E_ALLOWED_PROJECT_REF') ?? 'lpgrivowdcepcxradavu'
const EXPECTED_WORKFLOW_FILES = ['admin-workspace-staging-e2e.yml']
const GITHUB_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks'
const CI_ADMIN_EMAIL = /^ci-admin-[a-zA-Z0-9-]{1,96}@example\.invalid$/
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

type Body = {
  action?: 'provision' | 'cleanup'
  email?: string
  password?: string
  runId?: string
  userId?: string
  role?: string
}

/**
 * Peran yang boleh diprovisikan helper ini.
 *
 * Diperlukan untuk menguji ALUR TIAP PERAN: `FINANCE`, `SUPPORT`, dan
 * `SCHOOL_ADMIN` tidak punya jalan masuk lain, padahal justru ketiganya yang
 * dulu tidak punya permukaan admin sama sekali.
 *
 * `SUPER_ADMIN` SENGAJA TIDAK ADA DI DAFTAR. Helper ini sudah bisa membuat
 * `ADMIN` — yang praktis sudah sangat luas — dan menambahkan `SUPER_ADMIN` akan
 * menaikkan dampak bila endpoint ini disalahgunakan. Tidak ada test alur peran
 * yang membutuhkan `role.manage`.
 */
const ALLOWED_ROLES = [
  'ADMIN',
  'CONTENT_EDITOR',
  'CONTENT_REVIEWER',
  'FINANCE',
  'SUPPORT',
  'SCHOOL_ADMIN',
] as const

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
  if (header.alg !== 'RS256' || typeof header.kid !== 'string')
    throw new Error('OIDC_HEADER_INVALID')

  const jwksResponse = await fetch(GITHUB_JWKS_URL, { cache: 'no-store' })
  if (!jwksResponse.ok) throw new Error('OIDC_JWKS_UNAVAILABLE')
  const jwks = (await jwksResponse.json()) as { keys?: Array<JsonWebKey & { kid?: string }> }
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
  const repository = String(claims.repository ?? '')
  if (!ALLOWED_REPOSITORIES.includes(repository)) throw new Error('OIDC_REPOSITORY_INVALID')
  if (!claims.sub?.startsWith(`repo:${repository}:`)) throw new Error('OIDC_SUBJECT_INVALID')
  if (!['workflow_dispatch', 'pull_request'].includes(String(claims.event_name ?? '')))
    throw new Error('OIDC_EVENT_INVALID')
  if (
    !EXPECTED_WORKFLOW_FILES.some((file) =>
      claims.workflow_ref?.startsWith(`${repository}/.github/workflows/${file}@`),
    )
  )
    throw new Error('OIDC_WORKFLOW_INVALID')
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
  if (new URL(url).hostname.split('.')[0] !== ALLOWED_PROJECT_REF)
    throw new Error('CI_E2E_PROJECT_NOT_ALLOWED')
  return createClient(url, adminApiKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function provision(body: Body) {
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const runId = body.runId?.trim() ?? ''
  if (!CI_ADMIN_EMAIL.test(email)) return json({ error: 'CI_ADMIN_EMAIL_INVALID' }, 400)
  if (password.length < 20 || password.length > 160)
    return json({ error: 'CI_ADMIN_PASSWORD_INVALID' }, 400)
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(runId)) return json({ error: 'CI_RUN_ID_INVALID' }, 400)

  const admin = adminClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      // Akun uji sudah menyetujui S&K agar tidak dialihkan ke /persetujuan (lib/consent.ts).
      consent: { version: '2026-11-17', accepted_at: new Date().toISOString(), age_basis: 'adult' },
      full_name: 'CI Admin Workspace',
      ci_e2e: true,
      ci_kind: 'admin',
      github_run_id: runId,
    },
  })
  if (createError || !created.user) throw createError ?? new Error('CI_ADMIN_CREATE_FAILED')

  const userId = created.user.id
  try {
    const requestedRole = body.role?.trim().toUpperCase() || 'ADMIN'
    if (!(ALLOWED_ROLES as readonly string[]).includes(requestedRole)) {
      throw new Error('CI_ADMIN_ROLE_NOT_ALLOWED')
    }

    const { data: role, error: roleError } = await admin
      .from('roles')
      .select('id')
      .eq('code', requestedRole)
      .maybeSingle()
    if (roleError || !role) throw roleError ?? new Error('ADMIN_ROLE_NOT_FOUND')

    const { error: assignmentError } = await admin
      .from('user_roles')
      .insert({ user_id: userId, role_id: role.id, scope_type: null, scope_id: null })
    if (assignmentError) throw assignmentError

    return json({ userId, role: requestedRole })
  } catch (error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
    throw error
  }
}

async function cleanup(body: Body) {
  const userId = body.userId ?? ''
  if (!UUID.test(userId)) return json({ error: 'CI_ADMIN_USER_ID_INVALID' }, 400)

  const admin = adminClient()
  const { data, error: getError } = await admin.auth.admin.getUserById(userId)
  if (getError) {
    if (String(getError.message).toLowerCase().includes('not found'))
      return json({ ok: true, alreadyDeleted: true })
    throw getError
  }

  const user = data.user
  const marked = user?.user_metadata?.ci_e2e === true && user?.user_metadata?.ci_kind === 'admin'
  const email = user?.email ?? ''
  if (!marked || !CI_ADMIN_EMAIL.test(email))
    return json({ error: 'CI_ADMIN_DELETE_FORBIDDEN' }, 403)

  const { error: auditActorError } = await admin
    .from('audit_logs')
    .delete()
    .eq('actor_user_id', userId)
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

    const body = (await req.json()) as Body
    if (body.action === 'provision') return await provision(body)
    if (body.action === 'cleanup') return await cleanup(body)
    return json({ error: 'ACTION_INVALID' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const unauthorized = message.startsWith('OIDC_')
    console.error('[ci-e2e-admin]', message)
    return json({ error: unauthorized ? 'OIDC_INVALID' : message }, unauthorized ? 401 : 500)
  }
})
