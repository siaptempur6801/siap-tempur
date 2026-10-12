import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const tkaShellSource = readFileSync(
  resolve(__dirname, '../../components/tka/TkaDashboardShell.tsx'),
  'utf8',
)
const legacyTkaAccessRoute = readFileSync(
  resolve(__dirname, '../../app/tka/[level]/pass/page.tsx'),
  'utf8',
)
const legacyCpnsAccessRoute = readFileSync(
  resolve(__dirname, '../../app/cpns/dashboard/pass/page.tsx'),
  'utf8',
)
const tkaBuyTokenSource = readFileSync(
  resolve(__dirname, '../../app/tka/[level]/beli-token/page.tsx'),
  'utf8',
)
const productAvailabilitySource = readFileSync(
  resolve(__dirname, '../../components/admin/ProductAvailabilityFields.tsx'),
  'utf8',
)
const adminProductSource = readFileSync(
  resolve(__dirname, '../../src/services/admin-product.service.ts'),
  'utf8',
)

describe('TKA access surface', () => {
  it('does not expose a pass destination in the TKA dashboard navigation', () => {
    expect(tkaShellSource).not.toContain('/pass')
  })

  it('keeps legacy access URLs as redirects to the program dashboards', () => {
    expect(legacyTkaAccessRoute).toContain('redirect(level ? tkaLevelPath(level) : \'/tka\')')
    expect(legacyCpnsAccessRoute).toContain("redirect('/cpns/dashboard')")
    expect(tkaBuyTokenSource).toContain('<TokenPackagesPage program="TKA"')
    expect(tkaBuyTokenSource).toContain('walletService.getExamTokenBalance(user.id, program.id)')
  })

  it('does not offer or accept PASS products from admin product management', () => {
    expect(productAvailabilitySource).not.toContain('value="PASS"')
    expect(adminProductSource).toContain("throw new Error('PRODUCT_TYPE_NOT_SUPPORTED')")
  })
})
