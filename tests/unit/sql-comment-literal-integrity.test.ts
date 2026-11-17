import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regresi audit 2026-11-17 (N-01): `pg_format` pada commit 137b0ec mengganti
 * string literal di 39 statement `COMMENT ON … IS '…'` dengan placeholder
 * internalnya (`TEXTVALUE0E`, …). Hasilnya bukan SQL valid, jadi database baru
 * yang dibangun dari repo gagal, sementara CI tidak menjalankan migration.
 */
const repoRoot = resolve(__dirname, '../..')
const sqlFiles = execFileSync('git', ['ls-files', '--', '*.sql'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .map((file) => ({ file, sql: readFileSync(resolve(repoRoot, file), 'utf8') }))

/** Satu atau lebih literal `'…'` yang dipisah baris baru (digabung oleh Postgres), atau NULL. */
const COMMENT_VALUE = /^(?:NULL|E?'(?:[^']|'')*'(?:[ \t]*\r?\n\s*'(?:[^']|'')*')*)$/i

describe('integritas literal COMMENT di SQL', () => {
  it('menemukan file SQL (kontrol positif)', () => {
    expect(sqlFiles.length).toBeGreaterThan(100)
  })

  it('tidak ada placeholder pg_format TEXTVALUEnE', () => {
    const offenders = sqlFiles
      .filter(({ sql }) => /\bTEXTVALUE\d+E\b/.test(sql))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('setiap COMMENT ON … IS berisi string literal atau NULL', () => {
    const offenders: string[] = []
    for (const { file, sql } of sqlFiles) {
      for (const match of sql.matchAll(/\bCOMMENT\s+ON\b(?:'(?:''|[^'])*'|[^';])*;/gi)) {
        const value = match[0].match(/\sIS\s+([\s\S]*);$/i)?.[1].trim() ?? ''
        if (!COMMENT_VALUE.test(value)) offenders.push(`${file}: ${match[0].slice(0, 120)}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
