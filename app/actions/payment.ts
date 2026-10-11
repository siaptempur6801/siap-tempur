'use server'

import { createClient } from '@/lib/utils/supabase/server'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import { isServerActionRateLimited } from '@/lib/server-rate-limit'
import { paymentService } from '@/src/services/payment.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export type CreatePackageTransactionResult =
  | {
      success: true
      token: string
      orderId: string
      orderNumber: string
      redirectUrl: string | null
    }
  | {
      success: false
      message: string
    }

export type CreateQrisQaTransactionResult =
  | {
      success: true
      orderId: string
      orderNumber: string
      providerTransactionId: string
      qrImageUrl: string
      qrImageUrlV2: string | null
      simulatorUrl: string
      amount: number
    }
  | {
      success: false
      message: string
    }

function checkoutErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''

  if (message === 'PRODUCT_NOT_AVAILABLE') return 'Paket tidak tersedia.'
  if (message === 'MIDTRANS_TOKEN_MISSING') {
    return 'Midtrans tidak mengembalikan token pembayaran. Silakan coba lagi.'
  }
  if (message.startsWith('MIDTRANS_QRIS_CHARGE_FAILED:')) {
    return `Midtrans Sandbox menolak pembuatan QRIS: ${message.slice('MIDTRANS_QRIS_CHARGE_FAILED:'.length)}`
  }
  if (message === 'MIDTRANS_QRIS_IMAGE_URL_MISSING') {
    return 'Midtrans tidak mengembalikan direct QR image URL.'
  }

  return 'Terjadi kesalahan sistem saat memproses pembayaran. Silakan coba lagi.'
}

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function createPackageTransaction(
  productCode: string,
  returnPath = '/cpns/dashboard/profile',
): Promise<CreatePackageTransactionResult> {
  if (
    returnPath !== '/cpns/dashboard/profile' &&
    !/^\/tka\/(sd|smp|sma)\/profile\?tab=history$/.test(returnPath)
  ) {
    return { success: false, message: 'Tujuan pembayaran tidak valid.' }
  }
  try {
    await validateCsrf()
  } catch {
    return {
      success: false,
      message: 'Sesi keamanan kadaluarsa. Muat ulang halaman lalu coba lagi.',
    }
  }

  const user = await currentUser()
  if (!user) return { success: false, message: 'Sesi login tidak ditemukan. Silakan login ulang.' }

  if (await isServerActionRateLimited(user.id, 'create_transaction', 5, 60000)) {
    return { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }
  }

  try {
    const checkout = await paymentService.createCheckout({
      userId: user.id,
      email: user.email,
      fullName:
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
      productCode,
      returnPath,
    })

    return {
      success: true,
      token: checkout.token,
      orderId: checkout.orderId,
      orderNumber: checkout.orderNumber,
      redirectUrl: checkout.redirectUrl,
    }
  } catch (error) {
    logger.error('Package checkout creation failed', error, { productCode, userId: user.id })
    return { success: false, message: checkoutErrorMessage(error) }
  }
}

export async function createTkaPassTransaction(
  productCodeValue: string,
  levelValue: string,
): Promise<CreatePackageTransactionResult> {
  try {
    await validateCsrf()
  } catch {
    return {
      success: false,
      message: 'Sesi keamanan kadaluarsa. Muat ulang halaman lalu coba lagi.',
    }
  }

  const level = parseTkaLevel(levelValue)
  if (!level) return { success: false, message: 'Jenjang TKA tidak valid.' }

  const productCode = productCodeValue.trim().toUpperCase()
  const allowedCodes = new Set([`TKA_${level}_PASS_30`, `TKA_${level}_PASS_90`])
  if (!allowedCodes.has(productCode)) {
    return { success: false, message: 'Paket tidak sesuai dengan jenjang TKA ini.' }
  }

  const user = await currentUser()
  if (!user) return { success: false, message: 'Sesi login tidak ditemukan. Silakan login ulang.' }

  if (
    await isServerActionRateLimited(user.id, `create_tka_${level.toLowerCase()}_pass`, 5, 60000)
  ) {
    return { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }
  }

  try {
    const checkout = await paymentService.createCheckout({
      userId: user.id,
      email: user.email,
      fullName:
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
      productCode,
      returnPath: tkaLevelPath(level),
    })

    return {
      success: true,
      token: checkout.token,
      orderId: checkout.orderId,
      orderNumber: checkout.orderNumber,
      redirectUrl: checkout.redirectUrl,
    }
  } catch (error) {
    logger.error('TKA Pass checkout creation failed', error, {
      productCode,
      userId: user.id,
      level,
    })
    return { success: false, message: checkoutErrorMessage(error) }
  }
}

export async function createQrisQaTransaction(
  productCode: string,
): Promise<CreateQrisQaTransactionResult> {
  try {
    await validateCsrf()
  } catch {
    return {
      success: false,
      message: 'Sesi keamanan kadaluarsa. Muat ulang halaman lalu coba lagi.',
    }
  }

  if (env.appEnvironment() !== 'staging') {
    return { success: false, message: 'QRIS Simulator hanya tersedia pada staging.' }
  }

  const user = await currentUser()
  if (!user) return { success: false, message: 'Sesi login tidak ditemukan. Silakan login ulang.' }

  const canManagePayments = await authorizationService.hasPermission(PERMISSIONS.PAYMENT_MANAGE)
  if (!canManagePayments) {
    return {
      success: false,
      message: 'Akses QRIS QA hanya untuk admin dengan permission payment.manage.',
    }
  }

  if (await isServerActionRateLimited(user.id, 'create_qris_qa_transaction', 5, 60000)) {
    return { success: false, message: 'Terlalu banyak QRIS QA dibuat. Coba lagi satu menit lagi.' }
  }

  try {
    const checkout = await paymentService.createQrisQaCheckout({
      userId: user.id,
      email: user.email,
      fullName:
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
      productCode,
    })

    return { success: true, ...checkout }
  } catch (error) {
    logger.error('QRIS QA checkout creation failed', error, { productCode, userId: user.id })
    return { success: false, message: checkoutErrorMessage(error) }
  }
}

export async function syncPaymentStatus(orderId: string) {
  try {
    await validateCsrf()
  } catch {
    return false
  }

  const user = await currentUser()
  if (!user || typeof orderId !== 'string' || orderId.trim() === '') return false

  if (await isServerActionRateLimited(user.id, 'sync_payment', 10, 60000)) {
    logger.warn('Rate limit exceeded for syncPaymentStatus', { userId: user.id, orderId })
    return false
  }

  try {
    await paymentService.syncUserOrder(user.id, orderId)
    return true
  } catch (error) {
    logger.error('Payment status sync failed', error, { orderId, userId: user.id })
    return false
  }
}
