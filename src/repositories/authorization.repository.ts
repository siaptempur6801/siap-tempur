import { cache } from 'react'
import { createClient } from '@/lib/utils/supabase/server'
import type { PermissionCode, RoleCode } from '@/src/auth/permissions'

export type AuthorizationScope = {
  type: string
  id: string
}

export type UserAuthorization = {
  userId: string
  roles: RoleCode[]
  permissions: PermissionCode[]
}

type AuthorizationPayload = {
  user_id?: unknown
  roles?: unknown
  permissions?: unknown
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/**
 * Hasil `get_user_authorization` di-dedup per request.
 *
 * `RPC get_user_authorization` dipanggil beberapa kali dalam satu render halaman
 * admin (layout → page → komponen), masing-masing satu round trip. Karena hasilnya
 * hanya bergantung pada (userId, scope) dan tidak berubah selama satu request,
 * memoisasi berlingkup request aman dan menghapus round trip berulang.
 *
 * Kunci cache memakai string (bukan objek `scope`) karena React `cache()`
 * membandingkan argumen dengan identitas referensial — objek berbeda dengan isi
 * sama akan dianggap pemanggilan berbeda dan cache tidak pernah kena.
 */
const getCachedAuthorization = cache(
  async (userId: string, scopeType: string, scopeId: string): Promise<UserAuthorization> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_authorization', {
      p_user_id: userId,
      p_scope_type: scopeType === '' ? null : scopeType,
      p_scope_id: scopeId === '' ? null : scopeId,
    })
    if (error) throw error

    const payload =
      data && typeof data === 'object' && !Array.isArray(data) ? (data as AuthorizationPayload) : {}
    const roles = stringArray(payload.roles) as RoleCode[]
    const permissions = stringArray(payload.permissions) as PermissionCode[]
    return { userId, roles, permissions }
  },
)

class AuthorizationRepository {
  async getUserAuthorization(
    userId: string,
    scope?: AuthorizationScope,
  ): Promise<UserAuthorization> {
    return getCachedAuthorization(userId, scope?.type ?? '', scope?.id ?? '')
  }
}

export const authorizationRepository = new AuthorizationRepository()
