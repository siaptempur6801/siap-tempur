import { getAuthUser } from '@/lib/utils/supabase/server'
import {
  authorizationRepository,
  type AuthorizationScope,
  type UserAuthorization,
} from '@/src/repositories/authorization.repository'
import type { PermissionCode } from '@/src/auth/permissions'

export class AuthorizationError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

class AuthorizationService {
  async getCurrentAuthorization(scope?: AuthorizationScope): Promise<UserAuthorization | null> {
    // Identitas user di-dedup per request (lihat `getAuthUser`). Sebelumnya
    // satu render halaman admin dapat menembak `/auth/v1/user` tiga kali.
    const { user } = await getAuthUser()

    if (!user) return null
    return authorizationRepository.getUserAuthorization(user.id, scope)
  }

  async getAuthorizationForUser(userId: string, scope?: AuthorizationScope) {
    return authorizationRepository.getUserAuthorization(userId, scope)
  }

  async hasPermission(permission: PermissionCode, scope?: AuthorizationScope) {
    const authorization = await this.getCurrentAuthorization(scope)
    return authorization?.permissions.includes(permission) ?? false
  }

  async requireAuthenticated(scope?: AuthorizationScope) {
    const authorization = await this.getCurrentAuthorization(scope)
    if (!authorization) throw new AuthenticationError()
    return authorization
  }

  async requirePermission(permission: PermissionCode, scope?: AuthorizationScope) {
    const authorization = await this.requireAuthenticated(scope)
    if (!authorization.permissions.includes(permission)) {
      throw new AuthorizationError(`Missing permission: ${permission}`)
    }
    return authorization
  }

  async hasAnyPermission(permissions: PermissionCode[], scope?: AuthorizationScope) {
    const authorization = await this.getCurrentAuthorization(scope)
    if (!authorization) return false
    return permissions.some((permission) => authorization.permissions.includes(permission))
  }
}

export const authorizationService = new AuthorizationService()
