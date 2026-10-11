import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const checkOnly = process.argv.includes('--check')
const protectedStatements = String.raw`COMMENT\s+ON\b(?:(?:'(?:''|\\.|[^'])*')|[^';])*;|INSERT INTO public\.review_batches\b(?:(?:'(?:''|\\.|[^'])*')|[^';])*;`
const pgFormatArgs = [
  '-X',
  '-s',
  '2',
  '-k',
  '-L',
  '--redundant-parenthesis',
  '-M',
  '-p',
  protectedStatements,
]
const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.sql'], { encoding: 'utf8' })
const untracked = execFileSync(
  'git',
  ['ls-files', '--others', '--exclude-standard', '-z', '--', '*.sql'],
  {
    encoding: 'utf8',
  },
)
const files = [...new Set(`${tracked}${untracked}`.split('\0').filter(Boolean))].sort()
const unformatted = []
const failed = []

for (const file of files) {
  const original = readFileSync(file, 'utf8')
  let formatted = original
  let stable = false

  for (let pass = 0; pass < 5; pass += 1) {
    const result = spawnSync('pg_format', pgFormatArgs, { encoding: 'utf8', input: formatted })
    if (result.status !== 0) {
      failed.push(file)
      console.error(`${file}: ${result.stderr.trim() || `pg_format exited ${result.status}`}`)
      break
    }

    if (result.stdout === formatted) {
      stable = true
      break
    }

    formatted = result.stdout
  }

  if (failed.at(-1) === file) continue

  if (!stable) {
    failed.push(file)
    console.error(`${file}: pg_format output did not stabilize after 5 passes`)
    continue
  }

  if (checkOnly) {
    if (formatted !== original) unformatted.push(file)
  } else if (formatted !== original) {
    writeFileSync(file, formatted)
  }
}

if (failed.length > 0) {
  console.error(`Unable to format ${failed.length} SQL file(s).`)
  process.exitCode = 1
} else if (unformatted.length > 0) {
  console.error(`SQL formatting required for ${unformatted.length} file(s):`)
  for (const file of unformatted) console.error(`- ${file}`)
  process.exitCode = 1
} else {
  console.log(
    `PostgreSQL formatting ${checkOnly ? 'verified' : 'applied'} for ${files.length} SQL file(s).`,
  )
}
