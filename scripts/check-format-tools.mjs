import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const versions = JSON.parse(
  readFileSync(resolve(process.cwd(), 'format-tool-versions.json'), 'utf8'),
)
const tools = [
  {
    name: 'pg_format',
    args: ['--version'],
    version: versions.pgFormatter,
    match: /version\s+(\S+)/i,
  },
  { name: 'ruff', args: ['--version'], version: versions.ruff, match: /^ruff\s+(\S+)/ },
  { name: 'shfmt', args: ['--version'], version: versions.shfmt, match: /^(\S+)/ },
]

const failures = []

for (const tool of tools) {
  try {
    const output = execFileSync(tool.name, tool.args, { encoding: 'utf8' }).trim()
    const actual = output.match(tool.match)?.[1]
    if (actual !== tool.version) {
      failures.push(`${tool.name}: expected ${tool.version}, found ${actual ?? output}`)
    }
  } catch {
    failures.push(`${tool.name}: command not found`)
  }
}

if (failures.length > 0) {
  console.error('Formatter versions do not match format-tool-versions.json:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
}
