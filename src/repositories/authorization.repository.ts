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
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export class AuthorizationRepository {
    async getUserAuthorization(userId: string, scope?: AuthorizationScope): Promise<UserAuthorization> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_user_authorization', {
            p_user_id: userId,
            p_scope_type: scope?.type ?? null,
            p_scope_id: scope?.id ?? null,
        })
        if (error) throw error

        const payload = data && typeof data === 'object' && !Array.isArray(data)
            ? data as AuthorizationPayload
            : {}
        const roles = stringArray(payload.roles) as RoleCode[]
        const permissions = stringArray(payload.permissions) as PermissionCode[]
        return { userId, roles, permissions }
    }
}

export const authorizationRepository = new AuthorizationRepository()
