import { createAdminClient } from '@/lib/utils/supabase/server'
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

type RoleRelation = {
    id: string
    code: string
    name: string
}

type UserRoleRow = {
    role_id: string
    scope_type: string | null
    scope_id: string | null
    roles: RoleRelation | RoleRelation[] | null
}

type PermissionRelation = {
    code: string
}

type RolePermissionRow = {
    role_id: string
    permissions: PermissionRelation | PermissionRelation[] | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

export class AuthorizationRepository {
    async getUserAuthorization(userId: string, scope?: AuthorizationScope): Promise<UserAuthorization> {
        const supabase = await createAdminClient()

        let query = supabase
            .from('user_roles')
            .select('role_id, scope_type, scope_id, roles(id, code, name)')
            .eq('user_id', userId)

        if (scope) {
            query = query.or(
                `scope_type.is.null,and(scope_type.eq.${scope.type},scope_id.eq.${scope.id})`
            )
        } else {
            query = query.is('scope_type', null)
        }

        const { data: assignments, error: assignmentError } = await query
        if (assignmentError) throw assignmentError

        const rows = (assignments ?? []) as UserRoleRow[]
        const roleIds = [...new Set(rows.map((row) => row.role_id))]
        const roles = [...new Set(
            rows
                .map((row) => one(row.roles)?.code)
                .filter((code): code is RoleCode => Boolean(code))
        )]

        if (roleIds.length === 0) {
            return { userId, roles: [], permissions: [] }
        }

        const { data: grants, error: grantError } = await supabase
            .from('role_permissions')
            .select('role_id, permissions(code)')
            .in('role_id', roleIds)

        if (grantError) throw grantError

        const permissions = [...new Set(
            ((grants ?? []) as RolePermissionRow[])
                .map((grant) => one(grant.permissions)?.code)
                .filter((code): code is PermissionCode => Boolean(code))
        )]

        return { userId, roles, permissions }
    }
}

export const authorizationRepository = new AuthorizationRepository()
