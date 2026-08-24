import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const STAGING_REF = 'lpgrivowdcepcxradavu'
const MIDTRANS_API = 'https://api.sandbox.midtrans.com'
const SIMULATOR_PAYMENT = 'https://simulator.sandbox.midtrans.com/v2/qris/payment'
const PRODUCT_CODE = 'TKA_SMP_PASS_30'
const ADMIN_FEE = 500
const QA_USER_ID = '03c04ac2-66be-402b-bb55-414cb491b04f'

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
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { response, json } = await midtransJson(
      `${MIDTRANS_API}/v2/${encodeURIComponent(orderNumber)}/status`,
      { method: 'GET' },
      serverKey,
    )
    if (response.ok) {
      last = json
      const status = String(json.transaction_status || '').toLowerCase()
      if (['capture', 'settlement'].includes(status)) return json
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`MIDTRANS_NOT_PAID:${String(last?.transaction_status || 'unknown')}`)
}

async function cleanDedicatedRobot(admin, userId, serverKey) {
  const { data: staleOrders, error: staleOrderError } = await admin
    .from('orders')
    .select('id, order_number')
    .eq('user_id', userId)
    .like('order_number', 'M4QA-%')
  if (staleOrderError) throw staleOrderError

  for (const stale of staleOrders || []) {
    try {
      await midtransJson(
        `${MIDTRANS_API}/v2/${encodeURIComponent(stale.order_number)}/expire`,
        { method: 'POST' },
        serverKey,
      )
    } catch {
      // Provider cleanup is best-effort; local QA artifacts are authoritative here.
    }
    const { error: staleDeleteError } = await admin.from('orders').delete().eq('id', stale.id)
    if (staleDeleteError) throw staleDeleteError
  }

  const { error: entitlementDeleteError } = await admin.from('entitlements').delete().eq('user_id', userId)
  if (entitlementDeleteError) throw entitlementDeleteError

  const [{ count: orderCount, error: orderCountError }, { count: entitlementCount, error: entitlementCountError }] = await Promise.all([
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('entitlements').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  if (orderCountError) throw orderCountError
  if (entitlementCountError) throw entitlementCountError
  if ((orderCount || 0) !== 0 || (entitlementCount || 0) !== 0) {
    throw new Error(`M4_QA_ROBOT_NOT_CLEAN:${orderCount}/${entitlementCount}`)
  }
}

async function paidQa() {
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  if (stagingRef(supabaseUrl) !== STAGING_REF) throw new Error('M4_QA_STAGING_GUARD')

  const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY')
  const serverKey = required('MIDTRANS_SERVER_KEY_SANDBOX')
  if (serviceRole === 'ci-no-service-role' || serverKey === 'e2e-not-used') throw new Error('M4_QA_REAL_CREDENTIALS_REQUIRED')

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userId = QA_USER_ID
  let orderId = null
  let orderItemId = null
  let orderNumber = null
  let providerTransactionId = null
  let mainError = null
  let cleanupError = null

  const result = {
    stagingRef: STAGING_REF,
    dedicatedRobotVerified: false,
    staleQaCleaned: false,
    productCode: PRODUCT_CODE,
    totalAmount: null,
    providerCharge: false,
    simulatorAccepted: false,
    simulatorStatus: null,
    providerStatus: null,
    orderPaid: false,
    paymentPaid: false,
    expectedFeatures: 0,
    entitlementCount: 0,
    duplicateEntitlementCount: 0,
    expiryDaysApprox: null,
    commerceCleanup: false,
  }

  try {
    const { data: robot, error: robotError } = await admin
      .from('profiles')
      .select('id, full_name, status')
      .eq('id', userId)
      .maybeSingle()
    if (robotError || !robot) throw robotError || new Error('M4_QA_ROBOT_NOT_FOUND')
    if (robot.full_name !== 'M4 Paid QA Robot' || robot.status !== 'active') throw new Error('M4_QA_ROBOT_MARKER_INVALID')
    result.dedicatedRobotVerified = true

    await cleanDedicatedRobot(admin, userId, serverKey)
    result.staleQaCleaned = true

    const { data: program, error: programError } = await admin.from('programs').select('id').eq('code', 'TKA').maybeSingle()
    if (programError || !program) throw programError || new Error('TKA_PROGRAM_NOT_FOUND')
    const { data: track, error: trackError } = await admin.from('tracks').select('id').eq('program_id', program.id).eq('code', 'SMP').maybeSingle()
    if (trackError || !track) throw trackError || new Error('TKA_SMP_TRACK_NOT_FOUND')

    const { count: activeTrackCount, error: activeTrackError } = await admin
      .from('user_tracks')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('track_id', track.id)
      .eq('status', 'active')
    if (activeTrackError) throw activeTrackError
    if (activeTrackCount !== 1) throw new Error('M4_QA_ROBOT_TRACK_NOT_ACTIVE')

    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, code, name, duration_days')
      .eq('program_id', program.id)
      .eq('track_id', track.id)
      .eq('code', PRODUCT_CODE)
      .in('status', ['active', 'ACTIVE'])
      .maybeSingle()
    if (productError || !product) throw productError || new Error('M4_QA_PRODUCT_NOT_FOUND')
    if (Number(product.duration_days) !== 30) throw new Error(`M4_QA_DURATION_GUARD:${product.duration_days}`)

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
    if (price !== 29000 || totalAmount !== 29500) throw new Error(`M4_QA_PRICE_GUARD:${price}/${totalAmount}`)

    const { count: expectedFeatures, error: featureCountError } = await admin
      .from('product_features')
      .select('feature_id', { count: 'exact', head: true })
      .eq('product_id', product.id)
    if (featureCountError) throw featureCountError
    result.expectedFeatures = expectedFeatures || 0
    if (result.expectedFeatures !== 10) throw new Error(`M4_QA_FEATURE_GUARD:${result.expectedFeatures}`)

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
    orderId = String(order.id)

    const { data: item, error: itemError } = await admin.from('order_items').insert({
      order_id: orderId,
      product_id: product.id,
      quantity: 1,
      unit_price: price,
      discount: 0,
      total: price,
    }).select('id').single()
    if (itemError || !item) throw itemError || new Error('M4_QA_ORDER_ITEM_CREATE_FAILED')
    orderItemId = String(item.id)

    const chargePayload = {
      payment_type: 'qris',
      transaction_details: { order_id: orderNumber, gross_amount: totalAmount },
      qris: { acquirer: 'gopay' },
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

    const actions = Array.isArray(charge.actions) ? charge.actions : []
    const qrCodeUrl = actions.find((action) => action?.name === 'generate-qr-code')?.url
      || actions.find((action) => action?.name === 'generate-qr-code-v2')?.url
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
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
    result.simulatorStatus = simulatorResponse.status
    const simulatorText = simulatorResponse.status >= 300 && simulatorResponse.status < 400
      ? ''
      : await simulatorResponse.text()
    console.log('M4_QA_SIMULATOR_RESPONSE=' + JSON.stringify({
      status: simulatorResponse.status,
      redirected: simulatorResponse.status >= 300 && simulatorResponse.status < 400,
      hasLocation: Boolean(simulatorResponse.headers.get('location')),
    }))
    if (simulatorResponse.status < 200 || simulatorResponse.status >= 400 || /invalid qr|failed to|error occurred/i.test(simulatorText.slice(0, 12000))) {
      throw new Error(`MIDTRANS_SIMULATOR_FAILED:${simulatorResponse.status}`)
    }
    result.simulatorAccepted = true

    const paidStatus = await waitForPaid(orderNumber, serverKey)
    const providerStatus = String(paidStatus.transaction_status || '').toLowerCase()
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

    const readState = async () => {
      const [orderResult, paymentResult, entitlementResult] = await Promise.all([
        admin.from('orders').select('status, paid_at').eq('id', orderId).single(),
        admin.from('payments').select('status, paid_at').eq('order_id', orderId).eq('provider', 'midtrans').single(),
        admin.from('entitlements').select('id, starts_at, expires_at, source_id').eq('user_id', userId).eq('source_type', 'order_item').eq('source_id', orderItemId),
      ])
      if (orderResult.error) throw orderResult.error
      if (paymentResult.error) throw paymentResult.error
      if (entitlementResult.error) throw entitlementResult.error
      return { order: orderResult.data, payment: paymentResult.data, entitlements: entitlementResult.data || [] }
    }

    const firstState = await readState()
    result.orderPaid = String(firstState.order.status).toLowerCase() === 'paid'
    result.paymentPaid = ['capture', 'settlement', 'paid'].includes(String(firstState.payment.status).toLowerCase())
    result.entitlementCount = firstState.entitlements.length
    if (!result.orderPaid || !result.paymentPaid) throw new Error('M4_QA_PAID_STATE_MISSING')
    if (result.entitlementCount !== 10) throw new Error(`M4_QA_ENTITLEMENT_COUNT:${result.entitlementCount}`)

    const durations = firstState.entitlements.map((row) => {
      const start = Date.parse(row.starts_at)
      const expiry = Date.parse(row.expires_at)
      return (expiry - start) / 86400000
    })
    if (durations.some((days) => !Number.isFinite(days))) throw new Error('M4_QA_EXPIRY_MISSING')
    const avgDays = durations.reduce((sum, days) => sum + days, 0) / durations.length
    result.expiryDaysApprox = Math.round(avgDays * 100) / 100
    if (Math.abs(avgDays - 30) > 0.01) throw new Error(`M4_QA_EXPIRY_DAYS:${avgDays}`)

    const secondFulfill = await admin.rpc('fulfill_paid_order', rpcArgs)
    if (secondFulfill.error) throw secondFulfill.error
    const duplicateState = await readState()
    result.duplicateEntitlementCount = duplicateState.entitlements.length
    if (result.duplicateEntitlementCount !== 10) throw new Error(`M4_QA_DUPLICATE_ENTITLEMENTS:${result.duplicateEntitlementCount}`)
  } catch (error) {
    mainError = error
  }

  try {
    if (orderItemId) {
      const { error } = await admin.from('entitlements').delete().eq('user_id', userId).eq('source_type', 'order_item').eq('source_id', orderItemId)
      if (error) throw error
    }
    if (orderId) {
      const { error } = await admin.from('orders').delete().eq('id', orderId)
      if (error) throw error
    }

    const [orderCheck, entitlementCheck] = await Promise.all([
      admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      admin.from('entitlements').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    if (orderCheck.error) throw orderCheck.error
    if (entitlementCheck.error) throw entitlementCheck.error
    result.commerceCleanup = (orderCheck.count || 0) === 0 && (entitlementCheck.count || 0) === 0
    if (!result.commerceCleanup) throw new Error(`M4_QA_COMMERCE_CLEANUP_COUNTS:${orderCheck.count}/${entitlementCheck.count}`)
  } catch (error) {
    cleanupError = error
  }

  if (mainError) {
    console.log('M4_QA_PAID_FAILURE=' + JSON.stringify({
      providerCharge: result.providerCharge,
      simulatorAccepted: result.simulatorAccepted,
      simulatorStatus: result.simulatorStatus,
      providerStatus: result.providerStatus,
      commerceCleanup: result.commerceCleanup,
      error: mainError instanceof Error ? mainError.message : String(mainError),
      cleanupError: cleanupError instanceof Error ? cleanupError.message : cleanupError ? String(cleanupError) : null,
    }))
    throw mainError
  }
  if (cleanupError || !result.commerceCleanup) throw cleanupError || new Error('M4_QA_COMMERCE_CLEANUP_FAILED')

  console.log('M4_QA_PAID_RESULT=' + JSON.stringify(result))
}

if (enabled('[m4-qa-paid]')) {
  await paidQa()
} else {
  console.log('M4_QA_ONCE=skipped')
}
