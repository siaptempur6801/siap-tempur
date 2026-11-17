#!/usr/bin/env node
/**
 * Regenerasi `types/database.types.ts` dari project Supabase staging.
 *
 * Project ref dibaca dari env, bukan di-hardcode di package.json:
 *   SUPABASE_TYPES_PROJECT_REF, atau fallback NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF.
 * Hanya membaca skema lewat Supabase CLI; tidak menulis ke database.
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const projectRef = (
  process.env.SUPABASE_TYPES_PROJECT_REF ||
  process.env.NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF ||
  ''
).trim()

if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error(
    'Set SUPABASE_TYPES_PROJECT_REF (atau NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF) ke project ref staging.',
  )
  process.exit(1)
}

const result = spawnSync(
  'supabase',
  ['gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public'],
  { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 },
)

if (result.status !== 0 || !result.stdout) {
  console.error(result.stderr || `supabase gen types gagal (exit ${result.status})`)
  process.exit(result.status || 1)
}

writeFileSync('types/database.types.ts', result.stdout)
console.log(`types/database.types.ts diperbarui dari project ${projectRef}.`)
