import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  permissions: [] as string[],
  db: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
  listRoles: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/utils/supabase/server', () => ({
  createAdminClient: m.db,
  createV2AdminClient: m.db,
}))
vi.mock('@/src/services/authorization.service', () => ({
  AuthorizationError: class extends Error {},
  authorizationService: {
    requireAuthenticated: async () => ({ permissions: m.permissions }),
    requirePermission: async (p: string) => {
      if (!m.permissions.includes(p)) throw new Error('Forbidden')
    },
  },
}))
vi.mock('@/src/services/admin-directory.service', () => ({
  adminDirectoryService: { listRoles: m.listRoles },
}))
import {
  getAdminUserIdentity,
  getAdminUserRoles,
  getAdminUserActivity,
  getAdminUserAccessCounts,
} from '@/src/services/admin-user-workspace.service'
function query(data: unknown) {
  const result = { data, error: null }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    then: (resolve: (r: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  m.permissions = []
  m.db.mockResolvedValue({ from: m.from, rpc: m.rpc, auth: { admin: { getUserById: m.getUser } } })
})
describe('User workspace privilege and privacy boundaries', () => {
  it.each(
    [[], ['entitlement.manage'], ['order.read'], ['event.manage']].map((permissions) => ({
      permissions,
    })),
  )('does not expose identity, roles or attempts to $permissions', async ({ permissions }) => {
    m.permissions = permissions
    for (const read of [getAdminUserIdentity, getAdminUserRoles, getAdminUserActivity])
      await expect(read('selected-user')).rejects.toThrow()
    expect(m.db).not.toHaveBeenCalled()
  })
  it('returns only email and last activity from auth identity', async () => {
    m.permissions = ['user.read']
    m.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'selected@example.invalid',
          last_sign_in_at: '2026-10-08',
          app_metadata: { secret: 'private' },
          identities: [{ secret: 'private' }],
        },
      },
      error: null,
    })
    expect(await getAdminUserIdentity('selected-user')).toEqual({
      email: 'selected@example.invalid',
      lastActivity: '2026-10-08',
    })
    expect(m.getUser).toHaveBeenCalledWith('selected-user')
  })
  it('scopes attempts to the selected user and does not select questions, answers, or snapshots', async () => {
    m.permissions = ['user.read']
    const attempts = query([])
    m.from.mockReturnValue(attempts)
    await getAdminUserActivity('selected-user')
    expect(attempts.eq).toHaveBeenCalledWith('user_id', 'selected-user')
    expect(attempts.select).toHaveBeenCalledWith(
      'id,status,started_at,submitted_at,total_score,exams(title)',
    )
    expect(attempts.limit).toHaveBeenCalledWith(25)
  })
  it('does not treat user.read as access to entitlements', async () => {
    m.permissions = ['user.read']
    await expect(getAdminUserAccessCounts(['selected-user'])).rejects.toThrow()
    expect(m.db).not.toHaveBeenCalled()
  })
  it('counts grants only for users in the current page through a bounded aggregate', async () => {
    m.permissions = ['entitlement.manage']
    m.rpc.mockResolvedValue({ data: [{ resource_id: 'selected-user', total: 5001 }], error: null })
    expect(await getAdminUserAccessCounts(['selected-user'])).toEqual(
      new Map([['selected-user', 5001]]),
    )
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith('admin_resource_counts', {
      p_kind: 'user_entitlements',
      p_ids: ['selected-user'],
    })
    expect(m.from).not.toHaveBeenCalled()
  })
})
