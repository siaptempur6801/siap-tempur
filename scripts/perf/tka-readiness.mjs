#!/usr/bin/env node
// Serial browser diagnostics against a local production build, not a load test.
// Supply an owned staging fixture's private Playwright storage state separately.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const base = new URL(process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3100')
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) ||
  base.username ||
  base.password ||
  base.pathname !== '/'
) {
  throw new Error('This diagnostic only accepts a loopback app origin')
}
const state = process.env.PERF_STORAGE_STATE_PATH
const output = process.env.PERF_OUTPUT_PATH
const samples = Number(process.env.PERF_SAMPLES ?? 7)
if (!state || !output || !Number.isInteger(samples) || samples < 1 || samples > 10) {
  throw new Error('Requires private fixture storage state, output path, and 1–10 serial samples')
}
const rows = [],
  browser = await chromium.launch()
try {
  for (const route of ['/tka/smp', '/tka/smp/tryout', '/tka/smp/mini-tryout']) {
    for (let sample = 1; sample <= samples; sample++) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        storageState: state,
      })
      try {
        if (process.env.PERF_BLOCK_PREFETCH === '1') {
          await context.route('**/*', (r) =>
            r.request().headers()['next-router-prefetch'] === '1' ? r.abort() : r.continue(),
          )
        }
        const page = await context.newPage(),
          errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        const start = Date.now()
        await page.goto(new URL(route, base).href)
        if (new URL(page.url()).pathname !== route)
          throw new Error('Fixture did not authenticate on the expected TKA route')
        await page
          .locator(route === '/tka/smp' ? '[data-testid="tka-level-ready"]' : 'h1')
          .first()
          .waitFor()
        await page.locator('html[data-interaction-guard="ready"]').waitFor()
        const readyMs = Date.now() - start
        await page.waitForTimeout(500)
        const end = Date.now()
        const nav = await page.evaluate(() => {
          const n = performance.getEntriesByType('navigation')[0]
          return {
            ttfb: n.responseStart,
            documentEnd: n.responseEnd,
            domContentLoaded: n.domContentLoadedEventEnd,
          }
        })
        const log = process.env.FETCH_METRICS_FILE
        const queries = log
          ? readFileSync(log, 'utf8')
              .trim()
              .split('\n')
              .filter(Boolean)
              .map(JSON.parse)
              .filter((r) => r.start >= start && r.end <= end)
              .map((r) => ({
                path: r.path,
                method: r.method,
                duration: r.end - r.start,
                start: r.start - start,
                end: r.end - start,
                bytes: r.bytes,
                status: r.status,
              }))
          : []
        rows.push({ route, sample, readyMs, nav, queries, errors })
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
}
writeFileSync(output, JSON.stringify(rows, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
console.log(`Recorded ${rows.length} serial samples in ${output}; no capacity claim.`)
