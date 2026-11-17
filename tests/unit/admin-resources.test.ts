import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ADMIN_RESOURCE_ROUTES,
  ADMIN_RESOURCE_COPY,
  ADMIN_RESOURCE_PERMISSIONS,
  type AdminResourceMode,
} from '@/lib/admin-resources'
const root = resolve(__dirname, '../..')
const source = (path: string) => readFileSync(join(root, path), 'utf8')
describe('canonical catalog composition', () => {
  it('has exactly the two catalog resources with working routes, titles and permissions', () => {
    expect(Object.keys(ADMIN_RESOURCE_ROUTES)).toEqual(['products', 'questions'])
    for (const mode of Object.keys(ADMIN_RESOURCE_ROUTES) as AdminResourceMode[]) {
      expect(
        existsSync(join(root, 'app', ADMIN_RESOURCE_ROUTES[mode], '[[...route]]/page.tsx')),
      ).toBe(true)
      expect(ADMIN_RESOURCE_COPY[mode].title).toBeTruthy()
      expect(ADMIN_RESOURCE_PERMISSIONS[mode].length).toBeGreaterThan(0)
    }
  })
  it('uses product.manage and question.manage without broadening access', () => {
    expect(ADMIN_RESOURCE_PERMISSIONS).toEqual({
      products: ['product.manage'],
      questions: ['question.manage'],
    })
  })
  it('authorizes before catalog/data queries and never duplicates the domain payload', () => {
    const workspace = source('components/admin/domain/catalog/CatalogWorkspace.tsx')
    expect(workspace.indexOf('ADMIN_RESOURCE_PERMISSIONS[mode].some')).toBeLessThan(
      workspace.indexOf('catalogContextService.resolve'),
    )
    expect(workspace).toContain('catalogContextService.resolve(context)')
    expect(workspace).toContain('adminWorkspaceService.listDomainPage(mode,')
  })
  it('Event uses a real assessment selector and settings include ticket linking', () => {
    const event = source('components/admin/domain/event/EventWorkspace.tsx')
    expect(event).toContain('await assessmentOptions(')
    expect(event).toContain('<EventWorkflowForm')
    expect(event).toContain('<EventTicketLink')
    expect(event).toContain('PERMISSIONS.EVENT_MANAGE')
    expect(event).toMatch(/selectedId:\s*params\.exam/)
  })
  it('keeps assessment and Orders in their own workspaces', () => {
    expect(existsSync(join(root, 'app/admin/assessments/[[...route]]/page.tsx'))).toBe(true)
    expect(existsSync(join(root, 'components/admin/domain/commerce/OrdersWorkspace.tsx'))).toBe(
      true,
    )
    expect(existsSync(join(root, 'app/admin/AdminOperationsWorkspace.tsx'))).toBe(false)
  })
})
