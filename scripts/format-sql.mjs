import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const checkOnly = process.argv.includes('--check')
// Statements pg_format must leave byte-for-byte untouched: multi-line string
// literals in them otherwise gain one space of indentation on every pass.
//
// They are swapped for opaque tokens here instead of using pg_format's own
// `-p` option. pgFormatter 5.11 replaces every `COMMENT ... IS '...'` literal
// with an internal TEXTVALUEnE placeholder *before* applying `-p`, and restores
// those placeholders *before* the `-p` ones, so a protected COMMENT statement
// came back as `IS TEXTVALUE0E;` — invalid SQL (see commit 24ec945).
const protectedStatements = new RegExp(
  String.raw`COMMENT\s+ON\b(?:(?:'(?:''|\\.|[^'])*')|[^';])*;|INSERT INTO public\.review_batches\b(?:(?:'(?:''|\\.|[^'])*')|[^';])*;`,
  'g',
)
const protectedToken = /PGFPROTECTED(\d+)PGFPROTECTED;/g
const pgFormatArgs = ['-X', '-s', '2', '-k', '-L', '--redundant-parenthesis', '-M']

function protect(sql) {
  if (/PGFPROTECTED\d+PGFPROTECTED/.test(sql)) {
    throw new Error('input already contains a PGFPROTECTED token')
  }
  const statements = []
  const masked = sql.replace(protectedStatements, (statement) => {
    statements.push(statement)
    return `PGFPROTECTED${statements.length - 1}PGFPROTECTED;`
  })
  return { masked, statements }
}

function restore(sql, statements) {
  let restored = 0
  const output = sql.replace(protectedToken, (_, index) => {
    restored += 1
    return statements[Number(index)]
  })
  if (restored !== statements.length || /PGFPROTECTED\d+PGFPROTECTED/.test(output)) {
    throw new Error(`restored ${restored} of ${statements.length} protected statement(s)`)
  }
  return output
}
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
    let next
    try {
      const { masked, statements } = protect(formatted)
      const result = spawnSync('pg_format', pgFormatArgs, { encoding: 'utf8', input: masked })
      if (result.status !== 0) {
        throw new Error(result.stderr.trim() || `pg_format exited ${result.status}`)
      }
      next = restore(result.stdout, statements)
    } catch (error) {
      failed.push(file)
      console.error(`${file}: ${error.message}`)
      break
    }

    if (next === formatted) {
      stable = true
      break
    }

    formatted = next
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
