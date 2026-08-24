import { spawn } from 'node:child_process'

const TAG = '[m4-security-qa]'
const PORT = 3011
const ORIGIN = `http://127.0.0.1:${PORT}`

function enabled() {
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').includes(TAG)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForServer(child) {
  const deadline = Date.now() + 25_000
  let lastError
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`NEXT_START_EXITED:${child.exitCode}`)
    try {
      const response = await fetch(`${ORIGIN}/api/health`, { signal: AbortSignal.timeout(2_000) })
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw lastError ?? new Error('NEXT_START_TIMEOUT')
}

async function run() {
  if (!enabled()) {
    console.log('M4_SECURITY_QA=skipped')
    return
  }

  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += String(chunk) })

  try {
    await waitForServer(child)
    const response = await fetch(`${ORIGIN}/api/internal/tka-smp-m4-security-qa`, {
      signal: AbortSignal.timeout(60_000),
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(`SECURITY_ROUTE_FAILED:${response.status}:${JSON.stringify(result)}`)
    }

    assert(result.staging === true, 'SECURITY_STAGING_GUARD_FAILED')
    assert(result.signatureRejection === true, 'WEBHOOK_SIGNATURE_REJECTION_FAILED')
    assert(result.amountMismatchRejection === true, 'WEBHOOK_AMOUNT_MISMATCH_REJECTION_FAILED')
    assert(result.pendingAccepted === true, 'WEBHOOK_PENDING_FAILED')
    assert(result.duplicatePendingAccepted === true, 'WEBHOOK_DUPLICATE_PENDING_FAILED')
    assert(result.duplicatePendingMessage === 'Already processed', 'WEBHOOK_DUPLICATE_PENDING_IDEMPOTENCY_FAILED')

    assert(result.terminalResults?.expire?.webhookStatus === 200, 'WEBHOOK_EXPIRE_HTTP_FAILED')
    assert(result.terminalResults?.expire?.orderStatus === 'expired', 'WEBHOOK_EXPIRE_ORDER_FAILED')
    assert(result.terminalResults?.expire?.paymentStatus === 'expire', 'WEBHOOK_EXPIRE_PAYMENT_FAILED')
    assert(result.terminalResults?.cancel?.webhookStatus === 200, 'WEBHOOK_CANCEL_HTTP_FAILED')
    assert(result.terminalResults?.cancel?.orderStatus === 'cancelled', 'WEBHOOK_CANCEL_ORDER_FAILED')
    assert(result.terminalResults?.cancel?.paymentStatus === 'cancel', 'WEBHOOK_CANCEL_PAYMENT_FAILED')
    assert(result.terminalResults?.deny?.webhookStatus === 200, 'WEBHOOK_DENY_HTTP_FAILED')
    assert(result.terminalResults?.deny?.orderStatus === 'failed', 'WEBHOOK_DENY_ORDER_FAILED')
    assert(result.terminalResults?.deny?.paymentStatus === 'deny', 'WEBHOOK_DENY_PAYMENT_FAILED')

    assert(result.settlementAccepted === true, 'WEBHOOK_SETTLEMENT_FAILED')
    assert(result.duplicateSettlementAccepted === true, 'WEBHOOK_DUPLICATE_SETTLEMENT_FAILED')
    assert(result.duplicateSettlementMessage === 'Already processed', 'WEBHOOK_DUPLICATE_SETTLEMENT_IDEMPOTENCY_FAILED')
    assert(result.entitlementCountBeforeCancel === 10, `WEBHOOK_SETTLEMENT_ENTITLEMENTS_FAILED:${result.entitlementCountBeforeCancel}`)
    assert(result.cancelAfterPaidAccepted === true, 'WEBHOOK_CANCEL_AFTER_PAID_HTTP_FAILED')
    assert(result.paidOrderStatusAfterCancel === 'paid', `WEBHOOK_CANCEL_AFTER_PAID_ORDER_REGRESSION:${result.paidOrderStatusAfterCancel}`)
    assert(['capture', 'settlement'].includes(String(result.paidPaymentStatusAfterCancel)), `WEBHOOK_CANCEL_AFTER_PAID_PAYMENT_REGRESSION:${result.paidPaymentStatusAfterCancel}`)
    assert(result.paidAtPreserved === true, 'WEBHOOK_CANCEL_AFTER_PAID_TIMESTAMP_REGRESSION')
    assert(result.entitlementCountAfterCancel === 10, `WEBHOOK_CANCEL_AFTER_PAID_ENTITLEMENT_REGRESSION:${result.entitlementCountAfterCancel}`)

    console.log('M4_SECURITY_QA_RESULT=' + JSON.stringify(result))
  } finally {
    child.kill('SIGTERM')
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve()
      child.once('exit', resolve)
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
        resolve()
      }, 3_000).unref()
    })
    if (stderr.trim()) console.log('M4_SECURITY_QA_SERVER_STDERR=' + stderr.trim().slice(0, 2_000))
  }
}

await run()
