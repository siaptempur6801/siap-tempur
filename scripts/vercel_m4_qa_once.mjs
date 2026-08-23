import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const STAGING_REF = 'lpgrivowdcepcxradavu'
const MIDTRANS_API = 'https://api.sandbox.midtrans.com'
const SIMULATOR_PAYMENT = 'https://simulator.sandbox.midtrans.com/v2/qris/payment'
const PRODUCT_CODE = 'TKA_SMP_PASS_30'
const ADMIN_FEE = 500

function enabled(tag) {
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').includes(tag)
}

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_MISSING`)
  return value
}

function stagingRef(url) {
  return new URL(url).hostname.split('.')[0]
}

function authHeader(serverKey) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

async function midtransJson(url, options, serverKey) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(serverKey),
      ...(options?.headers || {}),
    },
  })
  const json = await response.json().catch(() => ({}))
  return { response, json }
}

async function waitForPaid(orderNumber, serverKey) {
  let last = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { response, json } = await midtransJson(
      `${MIDTRANS_API}/v2/${encodeURIComponent(orderNumber)}/status`,
      { method: 'GET' },
      serverKey,
    )
    if (response.ok) {
      last = json
      if (['capture', 'settlement'].includes(String(json.transaction_status || ''))) return json
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 250))
  }
  throw new Error(`MIDTRANS_NOT_PAID:${String(last?.transaction_status || 'unknown')}`)
}

async function paidQa() {
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  if (stagingRef(supabaseUrl) !== STAGING_REF) throw new Error('M4_QA_STAGING_GUARD')
  const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY')
  const serverKey = required('MIDTRANS_SERVER_KEY_SANDBOX')
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const email = `m4-qa-${suffix}@example.invalid`
  const password = `M4Qa!${randomUUID()}-${randomUUID()}`
  let userId = null
  let orderId = null
  let orderNumber = null
  let providerStatus = null
  let providerTransactionId = null

  const result = {
    stagingRef: STAGING_REF,
    productCode: PRODUCT_CODE,
    totalAmount: null,
    providerCharge: false,
    simulatorAccepted: false,
    providerStatus: null,
    orderPaid: false,
    paymentPaid: false,
    expectedFeatures: 0,
    entitlementCount: 0,
    duplicateEntitlementCount: 0,
    expiryDaysApprox: null,
    cleanup: false,
  }

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'M4 QA TKA SMP', m4_qa: true, ci_e2e: true, ci_kind: 'tka' },
    })
    if (createError || !created.user) throw createError || new Error('M4_QA_USER_CREATE_FAILED')
    userId = created.user.id

    const { data: program, error: programError } = await admin.from('programs').select('id').eq('code', 'TKA').maybeSingle()
    if (programError || !program) throw programError || new Error('TKA_PROGRAM_NOT_FOUND')
    const { data: track, error: trackError } = await admin.from('tracks').select('id').eq('program_id', program.id).eq('code', 'SMP').maybeSingle()
    if (trackError || !track) throw trackError || new Error('TKA_SMP_TRACK_NOT_FOUND')
    const { error: trackUpsertError } = await admin.from('user_tracks').upsert({
      user_id: userId,
      track_id: track.id,
      status: 'active',
      target_year: 2026,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,track_id' })
    if (trackUpsertError) throw trackUpsertError

    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, code, name, duration_days')
      .eq('program_id', program.id)
      .eq('track_id', track.id)
      .eq('code', PRODUCT_CODE)
      .in('status', ['active', 'ACTIVE'])
      .maybeSingle()
    if (productError || !product) throw productError || new Error('M4_QA_PRODUCT_NOT_FOUND')

    const now = new Date().toISOString()
    const { data: prices, error: priceError } = await admin
      .from('product_prices')
      .select('amount, currency, starts_at, ends_at')
      .eq('product_id', product.id)
      .in('status', ['active', 'ACTIVE'])
      .lte('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(20)
    if (priceError) throw priceError
    const priceRow = (prices || []).find((row) => !row.ends_at || row.ends_at >= now)
    if (!priceRow) throw new Error('M4_QA_PRICE_NOT_FOUND')
    const price = Number(priceRow.amount)
    const totalAmount = price + ADMIN_FEE
    result.totalAmount = totalAmount

    orderNumber = `M4QA-${PRODUCT_CODE}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
    const { data: order, error: orderError } = await admin.from('orders').insert({
      order_number: orderNumber,
      user_id: userId,
      status: 'pending',
      subtotal: price,
      discount_amount: 0,
      total_amount: totalAmount,
      currency: String(priceRow.currency || 'IDR'),
    }).select('id').single()
    if (orderError || !order) throw orderError || new Error('M4_QA_ORDER_CREATE_FAILED')
    orderId = order.id

    const { data: item, error: itemError } = await admin.from('order_items').insert({
      order_id: orderId,
      product_id: product.id,
      quantity: 1,
      unit_price: price,
      discount: 0,
      total: price,
    }).select('id').single()
    if (itemError || !item) throw itemError || new Error('M4_QA_ORDER_ITEM_CREATE_FAILED')

    const chargePayload = {
      payment_type: 'qris',
      transaction_details: { order_id: orderNumber, gross_amount: totalAmount },
      qris: { acquirer: 'gopay' },
      customer_details: { first_name: 'M4 QA TKA SMP', email },
      item_details: [
        { id: PRODUCT_CODE, price, quantity: 1, name: String(product.name) },
        { id: 'admin_fee', price: ADMIN_FEE, quantity: 1, name: 'Biaya Admin (QRIS)' },
      ],
    }
    const { response: chargeResponse, json: charge } = await midtransJson(
      `${MIDTRANS_API}/v2/charge`,
      { method: 'POST', body: JSON.stringify(chargePayload) },
      serverKey,
    )
    if (!chargeResponse.ok || String(charge.status_code) !== '201') {
      throw new Error(`MIDTRANS_QRIS_CHARGE_FAILED:${String(charge.status_message || chargeResponse.status)}`)
    }
    result.providerCharge = true
    providerTransactionId = String(charge.transaction_id || '')
    const qrCodeUrl = (Array.isArray(charge.actions) ? charge.actions : []).find((action) => action?.name === 'generate-qr-code')?.url
      || (Array.isArray(charge.actions) ? charge.actions : []).find((action) => action?.name === 'generate-qr-code-v2')?.url
    if (!providerTransactionId || !qrCodeUrl) throw new Error('MIDTRANS_QRIS_CHARGE_INCOMPLETE')

    const safeCharge = { ...charge }
    delete safeCharge.signature_key
    const { error: pendingPaymentError } = await admin.from('payments').upsert({
      order_id: orderId,
      provider: 'midtrans',
      provider_transaction_id: providerTransactionId,
      payment_method: 'qris',
      amount: totalAmount,
      status: 'pending',
      raw_response: { ...safeCharge, integration: 'm4_vercel_paid_qa' },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'order_id,provider' })
    if (pendingPaymentError) throw pendingPaymentError

    const simulatorResponse = await fetch(SIMULATOR_PAYMENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ qrCodeUrl }).toString(),
      redirect: 'follow',
    })
    const simulatorText = await simulatorResponse.text()
    if (!simulatorResponse.ok || /error|invalid|failed/i.test(simulatorText.slice(0, 5000))) {
      throw new Error(`MIDTRANS_SIMULATOR_FAILED:${simulatorResponse.status}`)
    }
    result.simulatorAccepted = true

    const paidStatus = await waitForPaid(orderNumber, serverKey)
    providerStatus = String(paidStatus.transaction_status || '')
    result.providerStatus = providerStatus
    const grossAmount = Number(paidStatus.gross_amount)
    if (!Number.isFinite(grossAmount) || grossAmount !== totalAmount) throw new Error('M4_QA_AMOUNT_MISMATCH')

    const rpcArgs = {
      p_order_id: orderId,
      p_provider: 'midtrans',
      p_status: providerStatus,
      p_provider_transaction_id: String(paidStatus.transaction_id || providerTransactionId),
      p_payment_method: String(paidStatus.payment_type || 'qris'),
      p_amount: grossAmount,
      p_raw_response: paidStatus,
    }
    const firstFulfill = await admin.rpc('fulfill_paid_order', rpcArgs)
    if (firstFulfill.error) throw firstFulfill.error

    const { count: expectedFeatures, error: featureCountError } = await admin
      .from('product_features')
      .select('feature_id', { count: 'exact', head: true })
      .eq('product_id', product.id)
    if (featureCountError) throw featureCountError
    result.expectedFeatures = expectedFeatures || 0

    const readState = async () => {
      const [orderResult, paymentResult, entitlementResult] = await Promise.all([
        admin.from('orders').select('status, paid_at').eq('id', orderId).single(),
        admin.from('payments').select('status, paid_at').eq('order_id', orderId).eq('provider', 'midtrans').single(),
        admin.from('entitlements').select('id, starts_at, expires_at, source_id').eq('user_id', userId).eq('source_type', 'order_item').eq('source_id', item.id),
      ])
      if (orderResult.error) throw orderResult.error
      if (paymentResult.error) throw paymentResult.error
      if (entitlementResult.error) throw entitlementResult.error
      return {
        order: orderResult.data,
        payment: paymentResult.data,
        entitlements: entitlementResult.data || [],
      }
    }

    const firstState = await readState()
    result.orderPaid = String(firstState.order.status).toLowerCase() === 'paid'
    result.paymentPaid = ['capture', 'settlement'].includes(String(firstState.payment.status).toLowerCase())
    result.entitlementCount = firstState.entitlements.length
    if (!result.orderPaid || !result.paymentPaid) throw new Error('M4_QA_PAID_STATE_MISSING')
    if (result.entitlementCount !== result.expectedFeatures || result.expectedFeatures !== 10) {
      throw new Error(`M4_QA_ENTITLEMENT_COUNT:${result.entitlementCount}/${result.expectedFeatures}`)
    }

    const finiteExpiries = firstState.entitlements
      .map((row) => row.expires_at ? Date.parse(row.expires_at) : NaN)
      .filter(Number.isFinite)
    const finiteStarts = firstState.entitlements
      .map((row) => row.starts_at ? Date.parse(row.starts_at) : NaN)
      .filter(Number.isFinite)
    if (finiteExpiries.length !== 10 || finiteStarts.length !== 10) throw new Error('M4_QA_EXPIRY_MISSING')
    const avgDays = finiteExpiries.reduce((sum, expiry, index) => sum + (expiry - finiteStarts[index]) / 86400000, 0) / finiteExpiries.length
    result.expiryDaysApprox = Math.round(avgDays * 100) / 100
    if (Math.abs(avgDays - Number(product.duration_days)) > 0.01) throw new Error(`M4_QA_EXPIRY_DAYS:${avgDays}`)

    const secondFulfill = await admin.rpc('fulfill_paid_order', rpcArgs)
    if (secondFulfill.error) throw secondFulfill.error
    const duplicateState = await readState()
    result.duplicateEntitlementCount = duplicateState.entitlements.length
    if (result.duplicateEntitlementCount !== 10) throw new Error(`M4_QA_DUPLICATE_ENTITLEMENTS:${result.duplicateEntitlementCount}`)

    console.log('M4_QA_PAID_RESULT=' + JSON.stringify(result))
  } finally {
    if (userId) {
      const { error: auditCleanupError } = await admin.from('audit_logs').delete().eq('actor_user_id', userId)
      if (auditCleanupError) console.log('M4_QA_CLEANUP_AUDIT=failed')
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.log('M4_QA_CLEANUP=failed')
      } else {
        result.cleanup = true
        if (orderNumber) {
          const { count } = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('order_number', orderNumber)
          console.log('M4_QA_CLEANUP=' + JSON.stringify({ userDeleted: true, remainingOrders: count || 0 }))
        } else {
          console.log('M4_QA_CLEANUP=' + JSON.stringify({ userDeleted: true, remainingOrders: 0 }))
        }
      }
    }
  }
}

if (enabled('[m4-qa-paid]')) {
  await paidQa()
} else {
  console.log('M4_QA_ONCE=skipped')
}
