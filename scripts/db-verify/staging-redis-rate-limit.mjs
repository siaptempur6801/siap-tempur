#!/usr/bin/env node
// Bounded provider compatibility check. Never loads .env.local implicitly.
// Only run after approval of the designated staging Redis origin.
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const rawUrl = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const approved = process.env.REDIS_VERIFY_APPROVED_STAGING_ORIGIN
if (!['staging', 'preview'].includes(process.env.APP_ENV ?? '') || !rawUrl || !token || !approved) {
    throw new Error('Requires APP_ENV=staging/preview, explicitly approved staging origin, and staging Redis credentials')
}
const url = new URL(rawUrl)
if (url.protocol !== 'https:' || url.origin !== approved || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Redis endpoint must exactly match the approved HTTPS staging origin')
}
const source = readFileSync(new URL('../../lib/api-utils.ts', import.meta.url), 'utf8')
const script = source.match(/const RATE_LIMIT_SCRIPT = `([^`]+)`;/)?.[1]
if (!script) throw new Error('Cannot read the application limiter script')
const prefix = `rate-limit:staging-verification:${randomUUID()}`
const windowMs = 5000
async function command(args) {
    const response = await fetch(url, {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(2000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
    })
    if (!response.ok) throw new Error(`Staging Redis HTTP ${response.status}`)
    const payload = await response.json()
    if (payload.error || payload.result === undefined) throw new Error('Staging Redis rejected command')
    return payload.result
}
const evalCounter = key => command(['EVAL', script, '1', key, String(windowMs)])
// Set expiry immediately, even for the intentional legacy no-TTL repair case.
// Finally deletes only these uniquely named verification keys.
try {
    const counts = await Promise.all(Array.from({ length: 4 }, () => evalCounter(prefix)))
    if (!counts.every(Number.isSafeInteger) || counts.sort((a,b) => a-b).join(',') !== '1,2,3,4') throw new Error('Shared atomic counter mismatch')
    const ttl = await command(['PTTL', prefix])
    if (typeof ttl !== 'number' || ttl <= 0 || ttl > windowMs) throw new Error('Counter TTL mismatch')
    await command(['SET', `${prefix}:repair`, '1', 'PX', String(windowMs)])
    await command(['PERSIST', `${prefix}:repair`])
    if (await evalCounter(`${prefix}:repair`) !== 2) throw new Error('Legacy counter mismatch')
    const repairTtl = await command(['PTTL', `${prefix}:repair`])
    if (typeof repairTtl !== 'number' || repairTtl <= 0 || repairTtl > windowMs) throw new Error('TTL repair mismatch')
    console.log(JSON.stringify({ environment: process.env.APP_ENV, concurrentIncrements: 4, atomicCounter: 'PASS', ttl: 'PASS', legacyTtlRepair: 'PASS', loadTest: false }))
} finally {
    await command(['DEL', prefix, `${prefix}:repair`])
}
