import { randomUUID } from 'node:crypto'

const MIDTRANS_API = 'https://api.sandbox.midtrans.com'
const SIMULATOR_PAYMENT = 'https://simulator.sandbox.midtrans.com/v2/qris/payment'
const TAG = '[m4-qa-controls]'

function enabled() {
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').includes(TAG)
}

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_MISSING`)
  return value
}

function authHeader(serverKey) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

function attrs(tag) {
  const result = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*["']([^"']*)["']/g
  let match
  while ((match = re.exec(tag))) result[match[1].toLowerCase()] = match[2]
  return result
}

function selectOptions(body, selectName) {
  const options = []
  const selectRe = new RegExp(`<select\\b[^>]*name=["']${selectName}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i')
  const select = body.match(selectRe)
  if (!select) return options
  const optionRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi
  let match
  while ((match = optionRe.exec(select[1])) && options.length < 30) {
    const a = attrs(`<option ${match[1]}>`)
    options.push({ value: a.value || null, text: cleanText(match[2]), selected: /\bselected\b/i.test(match[1]) })
  }
  return options
}

function inspectControls(html) {
  const forms = []
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
  let formMatch
  while ((formMatch = formRe.exec(html)) && forms.length < 10) {
    const formAttrs = attrs(`<form ${formMatch[1]}>`)
    const body = formMatch[2]
    const fields = []
    const fieldRe = /<(input|button|select|textarea)\b[^>]*>(?:([\s\S]*?)<\/\1>)?/gi
    let fieldMatch
    while ((fieldMatch = fieldRe.exec(body)) && fields.length < 30) {
      const tagText = fieldMatch[0]
      const a = attrs(tagText)
      const tagName = fieldMatch[1].toLowerCase()
      fields.push({
        tag: tagName,
        type: a.type || null,
        name: a.name || null,
        id: a.id || null,
        text: tagName === 'button' ? cleanText(fieldMatch[2]) : null,
        options: tagName === 'select' && a.name ? selectOptions(body, a.name) : undefined,
      })
    }
    forms.push({
      method: String(formAttrs.method || 'get').toLowerCase(),
      action: formAttrs.action || null,
      id: formAttrs.id || null,
      fields,
    })
  }

  const buttons = []
  const buttonRe = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let buttonMatch
  while ((buttonMatch = buttonRe.exec(html)) && buttons.length < 40) {
    const a = attrs(`<${buttonMatch[1]} ${buttonMatch[2]}>`)
    const text = cleanText(buttonMatch[3])
    if (!text) continue
    if (/pay|payment|complete|confirm|success|settle|qris|gopay|continue|lanjut|bayar|selesai/i.test(text)) {
      buttons.push({ tag: buttonMatch[1].toLowerCase(), text, href: a.href || null, type: a.type || null, name: a.name || null, id: a.id || null })
    }
  }

  const sameOriginPaths = new Set()
  const pathRe = /["'`]((?:\/|https:\/\/simulator\.sandbox\.midtrans\.com\/)[A-Za-z0-9_?&=./:%-]{2,})["'`]/g
  let pathMatch
  while ((pathMatch = pathRe.exec(html)) && sameOriginPaths.size < 80) {
    try {
      const parsed = new URL(pathMatch[1], 'https://simulator.sandbox.midtrans.com')
      if (parsed.hostname === 'simulator.sandbox.midtrans.com') sameOriginPaths.add(`${parsed.pathname}${parsed.search}`)
    } catch {}
  }

  return { forms, buttons, paths: [...sameOriginPaths] }
}

async function run() {
  const serverKey = required('MIDTRANS_SERVER_KEY_SANDBOX')
  if (serverKey === 'e2e-not-used') throw new Error('REAL_SANDBOX_KEY_REQUIRED')
  const orderId = `M4CTRL-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`

  const chargeResponse = await fetch(`${MIDTRANS_API}/v2/charge`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader(serverKey) },
    body: JSON.stringify({ payment_type: 'qris', transaction_details: { order_id: orderId, gross_amount: 29500 }, qris: { acquirer: 'gopay' } }),
  })
  const charge = await chargeResponse.json().catch(() => ({}))
  if (!chargeResponse.ok || String(charge.status_code) !== '201') throw new Error(`CHARGE_FAILED:${chargeResponse.status}:${String(charge.status_message || '')}`)

  try {
    const actions = Array.isArray(charge.actions) ? charge.actions : []
    const qrCodeUrl = actions.find((action) => action?.name === 'generate-qr-code')?.url || actions.find((action) => action?.name === 'generate-qr-code-v2')?.url
    if (!qrCodeUrl) throw new Error('QR_URL_MISSING')

    const scanResponse = await fetch(SIMULATOR_PAYMENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ qrCodeUrl }).toString(),
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
    })
    const html = await scanResponse.text()
    console.log('M4_QRIS_CONTROLS=' + JSON.stringify({ scanStatus: scanResponse.status, contentType: scanResponse.headers.get('content-type'), ...inspectControls(html) }))
  } finally {
    const expireResponse = await fetch(`${MIDTRANS_API}/v2/${encodeURIComponent(orderId)}/expire`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader(serverKey) },
    }).catch(() => null)
    console.log('M4_QRIS_CONTROLS_EXPIRE=' + String(expireResponse?.status || 'network-error'))
  }
}

if (enabled()) await run()
else console.log('M4_QRIS_CONTROLS=skipped')
