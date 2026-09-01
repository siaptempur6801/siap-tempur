import { PERMISSIONS, ROLE_CODES, type RoleCode } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'

export { canAccessArticleAdmin, canPublishArticle, isAdminRole, isArticleWriterRole } from '@/lib/utils/roles'

const ROLE_PRIORITY: RoleCode[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.ADMIN,
    ROLE_CODES.CONTENT_REVIEWER,
    ROLE_CODES.CONTENT_EDITOR,
    ROLE_CODES.FINANCE,
    ROLE_CODES.SUPPORT,
    ROLE_CODES.SCHOOL_ADMIN,
]

/**
 * Transitional adapter for legacy callers.
 *
 * The role is now resolved from user_roles → roles, not profiles.role.
 * New code should depend on AuthorizationService permissions instead of this
 * helper and this function can be removed once legacy admin routes are migrated.
 */
export async function getCurrentUserRole(): Promise<{ userId: string; role: string; permissions: string[] } | null> {
    const authorization = await authorizationService.getCurrentAuthorization()
    if (!authorization) return null

    const role = ROLE_PRIORITY.find((candidate) => authorization.roles.includes(candidate)) ?? 'USER'

    return {
        userId: authorization.userId,
        role,
        permissions: authorization.permissions,
    }
}

export async function hasPermission(permission: Parameters<typeof authorizationService.hasPermission>[0]) {
    return authorizationService.hasPermission(permission)
}

export async function requirePermission(permission: Parameters<typeof authorizationService.requirePermission>[0]) {
    return authorizationService.requirePermission(permission)
}

export async function isAdmin() {
    return authorizationService.hasPermission(PERMISSIONS.ADMIN_ACCESS)
}
