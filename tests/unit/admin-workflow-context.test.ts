import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { questionBankReturnUrl } from '@/lib/question-bank'
import { expectSql } from './helpers/sql-contract'
describe('Admin workspace context URLs', () => {
  it.each([
    'https://example.com/admin',
    '//example.com/admin',
    '/participant',
    '/admin-other',
    '/admin\\evil',
    '/admin\ninvalid',
  ])('rejects unsafe return destination %s', (value) =>
    expect(adminReturnUrl(value, '/admin/monitoring')).toBe('/admin/monitoring'),
  )
  it('preserves complete monitoring filters in a local result return URL', () => {
    const url =
      '/admin/monitoring?org=org&batch=batch&assignment=assignment&q=Rina&status=completed&page=2'
    expect(adminReturnUrl(url, '/admin')).toBe(
      '/admin/organizations/org/batches/batch/assignments/assignment/monitoring?q=Rina&status=completed&page=2',
    )
  })
  it('question workflow keeps taxonomy/review/list state after save', () => {
    const form = new FormData()
    for (const [key, value] of Object.entries({
      program: 'CPNS',
      track: 'SKD',
      material: 'nationalism',
      submaterial: 'identity',
      review: 'blocked_asset',
      page: '2',
      q: 'TIU',
      returnTo: '/admin/assessments?assessment=one&tab=questions',
    }))
      form.set(`return_${key}`, value)
    const url = new URL(questionBankReturnUrl(form), 'http://local')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      material: 'nationalism',
      submaterial: 'identity',
      review: 'blocked_asset',
      page: '2',
      q: 'TIU',
    })
    expect(url.searchParams.get('returnTo')).toContain('assessment=one')
  })
  it('monitoring and results are scoped by source, organization, batch and assignment', () => {
    const source = readFileSync('src/services/admin-monitoring.service.ts', 'utf8')
    expect(source).toMatch(
      /\.eq\('source',\s*'organization'\)\s*\.eq\('organization_id',\s*context\.organization!\.id\)\s*\.eq\('batch_id',\s*context\.batch!\.id\)/,
    )
    expect(source).toMatch(/\.eq\('assignment_id',\s*context\.assignment\.id\)/)
    expect(source).toMatch(
      /\.eq\('source',\s*'b2c'\)\s*\.contains\('metadata',\s*\{\s*eventId:\s*context\.event\.id\s*\}\)/,
    )
    expect(source).not.toMatch(/question_snapshot|correct_option_id|answer_key/)
    expect(source).toContain('organizationService.getOrganization(context.org)')
  })
  it('progress stays aggregated in the database and counts only answered questions', () => {
    const service = readFileSync('src/services/admin-monitoring.service.ts', 'utf8')
    const migration = readFileSync(
      'supabase/migrations/20261008044154_admin_read_models.sql',
      'utf8',
    )
    expect(service).toContain("db.rpc('admin_monitoring_page'")
    expect(service).not.toContain(".from('attempt_questions')")
    expect(migration).toMatch(
      /a\.attempt_question_id\s*=\s*q\.id\s+and\s+a\.answered_at\s+is\s+not\s+null/i,
    )
  })
  it('summary and report projections avoid loading participant progress rows', () => {
    const service = readFileSync('src/services/admin-monitoring.service.ts', 'utf8')
    const migration = readFileSync(
      'supabase/migrations/20261008201957_admin_monitoring_summary.sql',
      'utf8',
    )
    expect(service).toContain("db.rpc('admin_monitoring_summary'")
    expect(service).toMatch(/if\s*\(\s*error\.code\s*!==\s*'PGRST202'\s*\)\s*throw\s+error/)
    expect(service).toContain("db.rpc('admin_monitoring_page'")
    expect(service).toMatch(/report:\s*includeReport\s*\?\s*projection\.report\s*:\s*null/)
    expect(service).toMatch(
      /if\s*\(includeReport\)\s*await authorizationService\.requirePermission\(PERMISSIONS\.REPORT_READ\)/,
    )
    expectSql(migration).toContain("'report', case when p_include_report")
    expect(migration).not.toContain('attempt_answers')
    expect(migration).not.toContain("'rows'")
  })
  it('activation checks readiness before any product write', () => {
    const source = readFileSync('src/services/admin-product.service.ts', 'utf8')
    expect(source.indexOf("if (status === 'ACTIVE')")).toBeLessThan(
      source.indexOf('let productId = input.id'),
    )
    expect(source).toContain('if (!readiness.ready) throw new Error(readiness.reason)')
  })
  it('audited CPNS manifests remain truthful about partial readiness', () => {
    function rows(file: string) {
      const [header, ...body] = readFileSync(`docs/content/cpns/${file}`, 'utf8').trim().split('\n')
      const keys = header.split('\t')
      return body.map((line) => Object.fromEntries(line.split('\t').map((v, i) => [keys[i], v])))
    }
    const full = rows('full-tryout-01.tsv')
    expect(full).toHaveLength(110)
    expect(full.filter((r) => r.content_review_state === 'APPROVED')).toHaveLength(107)
    expect(full.filter((r) => r.content_review_state === 'BLOCKED_ASSET')).toHaveLength(3)
    expect(
      rows('drill-node-readiness-v1.tsv').filter((r) => r.state === 'FROZEN_V1_READY'),
    ).toHaveLength(7)
  })
})
