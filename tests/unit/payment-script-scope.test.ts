import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
describe('CPNS payment script boundary', () => {
  it('keeps payment scripts out of the dashboard layout and on every payment entry point', () => {
    const layout = readFileSync('app/cpns/dashboard/layout.tsx', 'utf8')
    expect(layout).not.toContain('midtransSnapScriptUrl')
    for (const route of ['beli-paket', 'event'])
      expect(readFileSync(`app/cpns/dashboard/${route}/page.tsx`, 'utf8')).toContain(
        '<MidtransSnapScript />',
      )
    // Tempur Pass was retired; the legacy route only redirects and must not load payments.
    const legacyPass = readFileSync('app/cpns/dashboard/pass/page.tsx', 'utf8')
    expect(legacyPass).toContain("redirect('/cpns/dashboard')")
    expect(legacyPass).not.toContain('MidtransSnapScript')
    const script = readFileSync('components/payments/MidtransSnapScript.tsx', 'utf8')
    expect(script).toContain('nonce={nonce}')
    expect(script).toContain('env.midtransClientKey()')
    expect(script).toContain('env.midtransSnapScriptUrl()')
  })
})
