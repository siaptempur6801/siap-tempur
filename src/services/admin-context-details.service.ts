import 'server-only'

import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import { AuthorizationError, authorizationService } from '@/src/services/authorization.service'

/** Guard every privileged lookup here, including callers outside the admin pages. */
export async function getAdminUserDetail(userId: string) {
  const actor = await authorizationService.requireAuthenticated()
  const canRead = actor.permissions.some(
    (code) =>
      code === PERMISSIONS.USER_READ ||
      code === PERMISSIONS.USER_MANAGE ||
      code === PERMISSIONS.ENTITLEMENT_MANAGE,
  )
  if (!canRead) throw new AuthorizationError()
  const db = await createV2AdminClient()
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, display_name, status, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getAdminUserAccess(userId: string) {
  await authorizationService.requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
  const db = await createV2AdminClient()
  const [wallets, entitlements] = await Promise.all([
    db
      .from('wallets')
      .select('id, user_id, wallet_type, balance, updated_at')
      .eq('user_id', userId)
      .order('wallet_type'),
    db
      .from('entitlements')
      .select(
        'id, feature_id, source_type, status, starts_at, expires_at, usage_count, usage_limit',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])
  if (wallets.error) throw wallets.error
  if (entitlements.error) throw entitlements.error
  const featureIds = [...new Set((entitlements.data ?? []).map((row) => row.feature_id))]
  const features = featureIds.length
    ? await db.from('features').select('id, name, code').in('id', featureIds)
    : { data: [], error: null }
  if (features.error) throw features.error
  const featuresById = new Map((features.data ?? []).map((row) => [String(row.id), row]))
  return {
    wallets: wallets.data ?? [],
    entitlements: (entitlements.data ?? []).map((row) => ({
      ...row,
      feature_name: String(featuresById.get(row.feature_id)?.name || 'Akses fitur'),
      feature_code: featuresById.get(row.feature_id)?.code
        ? String(featuresById.get(row.feature_id)?.code)
        : null,
    })),
  }
}

export async function getAdminOrderDetail(orderId: string) {
  const actor = await authorizationService.requireAuthenticated()
  if (
    !actor.permissions.some(
      (code) => code === PERMISSIONS.ORDER_READ || code === PERMISSIONS.PAYMENT_MANAGE,
    )
  )
    throw new AuthorizationError()
  const db = await createV2AdminClient()
  const [order, payments] = await Promise.all([
    db
      .from('orders')
      .select('id, order_number, user_id, status, total_amount, currency, paid_at, created_at')
      .eq('id', orderId)
      .maybeSingle(),
    db
      .from('payments')
      .select('id, provider, payment_method, amount, status, paid_at, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
  ])
  if (order.error) throw order.error
  if (payments.error) throw payments.error
  return { order: order.data, payments: payments.data ?? [] }
}

/** Entitlement operators need a minimal user directory, including users without wallets. */
export async function listAdminAccessUsers(search: string, offset: number, limit: number) {
  await authorizationService.requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
  const db = await createV2AdminClient()
  let query = db.from('profiles').select('id, full_name, display_name', { count: 'exact' })
  if (search.trim()) {
    const value = escapePostgrestValue(`%${search.trim()}%`)
    query = query.or(`full_name.ilike.${value},display_name.ilike.${value}`)
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + limit - 1)
  if (error) throw error
  return { users: data ?? [], total: count ?? 0 }
}
