import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const FUNCTIONS = ['ci-e2e-admin', 'ci-e2e-cpns', 'ci-e2e-user'] as const

const source = (name: string) =>
  readFileSync(resolve(__dirname, `../../supabase/functions/${name}/index.ts`), 'utf8')

describe('Edge Function ci-e2e-* (N-09)', () => {
  it.each(FUNCTIONS)('%s menolak berjalan di luar project staging', (name) => {
    const code = source(name)
    expect(code).toContain("Deno.env.get('CI_E2E_ALLOWED_PROJECT_REF') ?? 'lpgrivowdcepcxradavu'")
    expect(code).toMatch(
      /hostname\.split\('\.'\)\[0\] !== ALLOWED_PROJECT_REF\)\s*throw new Error\('CI_E2E_PROJECT_NOT_ALLOWED'\)/,
    )
    expect(code).not.toContain('llnttutwhtvxtdktiizo')
  })

  it.each(FUNCTIONS)('%s mengikat OIDC ke repo yang diizinkan dan workflow-nya', (name) => {
    const code = source(name)
    expect(code).toContain("Deno.env.get('CI_E2E_ALLOWED_REPOSITORIES')")
    expect(code).toContain(
      "if (!ALLOWED_REPOSITORIES.includes(repository)) throw new Error('OIDC_REPOSITORY_INVALID')",
    )
    expect(code).toContain('claims.sub?.startsWith(`repo:${repository}:`)')
    expect(code).toContain('`${repository}/.github/workflows/${file}@`')
    expect(code).not.toContain('EXPECTED_REPOSITORY')
  })
})
