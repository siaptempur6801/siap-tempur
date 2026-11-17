import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Kontrak ACL untuk objek sensitif (audit 2026-11-17, menindaklanjuti P1-1 dan
 * P2-2 di SECURITY_AUDIT_AUTH_AUTHZ_RLS.md).
 *
 * Kerahasiaan kunci jawaban di Schema V2 dijaga oleh GRANT, bukan RLS: policy
 * `attempt_questions_select_own` ada, tetapi `authenticated` tidak punya hak
 * tabel. Tidak ada yang mencegah regresi bila satu GRANT ditambahkan. Test ini
 * membaca file SQL di repo (tidak menyentuh database) dan gagal bila snapshot
 * ACL kanonik atau migration mana pun memberi hak ke role klien.
 */
const repoRoot = resolve(__dirname, '../..')
const migrationsDir = resolve(repoRoot, 'supabase/migrations')
const bootstrapAclPath = 'scripts/cutover/bootstrap/18_acl.sql'

const CLIENT_ROLES = /\b(authenticated|anon|public)\b/i

/** Tabel yang memuat kunci jawaban, skor per opsi, atau jawaban peserta. */
const ANSWER_BEARING_TABLES = [
  'attempt_questions',
  'attempt_answers',
  'attempt_answer_options',
  'question_versions',
  'question_options',
  'question_explanations',
]

/** Fungsi yang hanya boleh dipanggil server (service_role). */
const SERVICE_ONLY_FUNCTIONS = [
  'recalculate_leaderboard',
  'recalculate_event_rankings',
  'fulfill_paid_order',
  'update_attempt_answer_scores',
]

type GrantStatement = { file: string; statement: string; grantees: string }

function stripLineComments(sql: string) {
  return sql.replace(/--[^\n]*/g, '')
}

/**
 * Pernyataan GRANT tidak pernah mengandung `;`, jadi `[^;]*` membatasi
 * pencocokan pada satu pernyataan, termasuk di file yang memuat badan fungsi.
 */
function grantStatements(file: string, sql: string): GrantStatement[] {
  const statements: GrantStatement[] = []
  for (const match of stripLineComments(sql).matchAll(/\bGRANT\b[^;]*;/gi)) {
    const statement = match[0]
    const grantees = statement.match(/\bTO\s+([^;]*);/i)?.[1] ?? ''
    statements.push({ file, statement, grantees })
  }
  return statements
}

function objectPattern(name: string) {
  return new RegExp(`\\bpublic\\.${name}\\b`, 'i')
}

const sqlSources = [
  bootstrapAclPath,
  ...readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .map((file) => `supabase/migrations/${file}`),
].map((file) => ({ file, sql: readFileSync(resolve(repoRoot, file), 'utf8') }))

const allGrants = sqlSources.flatMap(({ file, sql }) => grantStatements(file, sql))
const clientGrants = allGrants.filter(({ grantees }) => CLIENT_ROLES.test(grantees))

describe('ACL objek sensitif', () => {
  it('parser menemukan GRANT ke role klien (kontrol positif agar test tidak kosong)', () => {
    const bootstrapClientGrants = clientGrants.filter(({ file }) => file === bootstrapAclPath)
    expect(bootstrapClientGrants.length).toBeGreaterThan(0)
  })

  it.each(ANSWER_BEARING_TABLES)(
    'tidak ada GRANT pada public.%s untuk authenticated/anon/PUBLIC',
    (table) => {
      const offenders = clientGrants
        .filter(({ statement }) => objectPattern(table).test(statement))
        .map(({ file, statement }) => `${file}: ${statement.slice(0, 160)}`)
      expect(offenders).toEqual([])
    },
  )

  it.each(SERVICE_ONLY_FUNCTIONS)(
    'tidak ada GRANT EXECUTE public.%s untuk authenticated/anon/PUBLIC',
    (fn) => {
      const offenders = clientGrants
        .filter(({ statement }) => objectPattern(fn).test(statement))
        .map(({ file, statement }) => `${file}: ${statement.slice(0, 160)}`)
      expect(offenders).toEqual([])
    },
  )

  it('snapshot ACL kanonik mencabut hak klien dari tabel kunci jawaban', () => {
    const sql = stripLineComments(readFileSync(resolve(repoRoot, bootstrapAclPath), 'utf8'))
    for (const table of ANSWER_BEARING_TABLES) {
      const revoked = [...sql.matchAll(/\bREVOKE\b[^;]*;/gi)].some(
        ([statement]) =>
          objectPattern(table).test(statement) && /\bFROM\b[^;]*\bauthenticated\b/i.test(statement),
      )
      expect(revoked, `${table} tidak dicabut dari authenticated`).toBe(true)
    }
  })
})
