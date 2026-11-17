'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { auditAdminAction } from '@/lib/audit-log'
import { logger } from '@/lib/logger'
import { isServerActionRateLimited } from '@/lib/server-rate-limit'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { commerceService } from '@/src/services/commerce.service'
import { paymentService } from '@/src/services/payment.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Hasil yang ditampilkan halaman detail order lewat query `sync`. */
type AdminOrderSyncResult =
  'synced' | 'reversed' | 'unchanged' | 'owner_deleted' | 'not_syncable' | 'failed'

function backToOrder(orderId: string, result: AdminOrderSyncResult, status?: string): never {
  revalidatePath(`/admin/commerce/orders/${orderId}`)
  const params = new URLSearchParams({ sync: result })
  if (status) params.set('sync_status', status)
  redirect(`/admin/commerce/orders/${orderId}?${params}`)
}

/**
 * Sinkronkan satu order dengan status Midtrans (audit B-08). Untuk dukungan "sudah
 * bayar tapi token belum masuk" tanpa akses database dan tanpa menambah token manual
 * (yang berisiko kredit ganda). Memakai jalur pemenuhan yang sama dengan webhook:
 * idempoten dan aman diulang.
 */
export async function syncAdminOrderAction(form: FormData) {
  const orderId = String(form.get('order_id') ?? '').trim()
  if (!UUID.test(orderId)) redirect('/admin/commerce/orders')
  await validateCsrf()
  const actor = await authorizationService.requireAuthenticated()
  if (!actor.permissions.includes(PERMISSIONS.PAYMENT_MANAGE)) backToOrder(orderId, 'failed')
  if (await isServerActionRateLimited(actor.userId, 'admin_order_sync', 20, 60_000)) {
    backToOrder(orderId, 'failed', 'rate_limited')
  }

  let result: AdminOrderSyncResult = 'failed'
  let providerStatus: string | undefined
  try {
    const order = await commerceService.getOrderById(orderId)
    const status = order ? String(order.status).toLowerCase() : ''
    if (!order) {
      result = 'not_syncable'
    } else if (status === 'paid') {
      const refreshed = await paymentService.refreshPaidOrder(orderId)
      providerStatus = refreshed.status
      result = refreshed.reversed ? 'reversed' : 'unchanged'
    } else if (['pending', 'expired', 'failed', 'cancelled'].includes(status)) {
      if (!order.user_id) {
        result = 'owner_deleted'
      } else {
        const synced = await paymentService.syncUserOrder(String(order.user_id), orderId)
        providerStatus = synced.status
        result = synced.paid ? 'synced' : 'unchanged'
      }
    } else {
      result = 'not_syncable'
    }
  } catch (error) {
    logger.error('Sinkronisasi order oleh admin gagal', error, { orderId })
    result = 'failed'
  }

  await auditAdminAction({
    action: 'ADMIN_ORDER_SYNC',
    actorId: actor.userId,
    entityType: 'order',
    entityId: orderId,
    label: `Sinkronkan order: ${result}`,
    after: { result, providerStatus: providerStatus ?? null },
  }).catch(() => undefined)

  backToOrder(orderId, result, providerStatus)
}
