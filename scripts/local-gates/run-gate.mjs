#!/usr/bin/env node
/**
 * Gate staging versi LOKAL (tanpa GitHub Actions).
 *
 * Meniru apa yang dilakukan workflow di `.github/workflows/*-staging-e2e.yml`:
 * build aplikasi dengan env staging, jalankan emulator Edge Function
 * (`scripts/local-gates/ci-helper.mjs`), lalu jalankan project Playwright yang sama.
 *
 * Pemakaian:
 *   node scripts/local-gates/run-gate.mjs tka
 *   node scripts/local-gates/run-gate.mjs cpns
 *   node scripts/local-gates/run-gate.mjs admin
 *   node scripts/local-gates/run-gate.mjs all
 *
 * Opsi env:
 *   PORT_APP=3100 PORT_HELPER=54399 SKIP_BUILD=1
 *   ONLY_CLEANUP=1     (hanya bersihkan sisa user ci-* di staging)
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(resolve(process.cwd(), 'package.json'))
const { createClient } = require('@supabase/supabase-js')

const APP_PORT = Number(process.env.PORT_APP || 3100)
const HELPER_PORT = Number(process.env.PORT_HELPER || 54399)
const BASE_URL = `http://127.0.0.1:${APP_PORT}`

const fileEnv = Object.fromEntries(
    readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
        .map((line) => {
            const index = line.indexOf('=')
            return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
        }),
)

const STAGING_URL = fileEnv.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = fileEnv.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE = fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!STAGING_URL?.includes('lpgrivowdcepcxradavu')) throw new Error('`.env.local` harus menunjuk staging')

const GATES = {
    tka: {
        // Sama seperti workflow: app dijalankan Playwright webServer di port 3000
        // (E2E_REMOTE_BASE_URL tidak diset) dan service role sengaja placeholder.
        project: 'test --project=chromium-tka-staging',
        serviceRoleKey: 'ci-no-service-role',
        appBaseUrl: BASE_URL,
        manageApp: true,
        env: { E2E_TKA_STAGING: '1' },
    },
    cpns: {
        project: '--config=playwright.cpns-rc.config.ts test --project=chromium-cpns-rc',
        serviceRoleKey: SERVICE_ROLE,
        appBaseUrl: BASE_URL,
        manageApp: true,
        env: { E2E_REMOTE_BASE_URL: '1' },
    },
    admin: {
        project: '--project=chromium-admin-staging',
        serviceRoleKey: SERVICE_ROLE,
        appBaseUrl: BASE_URL,
        manageApp: true,
        env: { E2E_ADMIN_STAGING: '1', E2E_REMOTE_BASE_URL: '1' },
    },
}

const children = []

function startProcess(command, args, env, label) {
    const child = spawn(command, args, { cwd: process.cwd(), env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`))
    child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`))
    child.on('exit', (code, signal) => console.log(`[${label}] proses berhenti (code=${code}, signal=${signal})`))
    children.push(child)
    return child
}

function stopAll() {
    for (const child of children) {
        try { child.kill('SIGTERM') } catch { /* sudah mati */ }
    }
}

/**
 * Tunggu sampai server menjawab. Status apa pun diterima: `/api/health` sengaja mengembalikan
 * non-200 bila kunci privileged tidak tersedia (gate TKA memakai placeholder seperti di CI),
 * dan itu bukan alasan untuk menganggap server belum siap.
 */
async function waitForHttp(url, timeoutMs, label, { acceptAnyStatus = false } = {}) {
    const deadline = Date.now() + timeoutMs
    let lastStatus = 'none'
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: 'manual' })
            lastStatus = String(response.status)
            if (response.ok || acceptAnyStatus) return
        } catch { /* belum siap */ }
        await new Promise((res) => setTimeout(res, 700))
    }
    throw new Error(`${label} tidak siap dalam ${timeoutMs}ms (${url}, status terakhir ${lastStatus})`)
}

async function cleanStagingLeftovers() {
    const admin = createClient(STAGING_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const targets = (data?.users ?? []).filter((user) => /^ci-/.test(user.email ?? ''))
    for (const user of targets) {
        const { data: attempts } = await admin.from('exam_attempts').select('id').eq('user_id', user.id)
        const attemptIds = (attempts ?? []).map((row) => row.id)
        if (attemptIds.length > 0) {
            const { data: questions } = await admin.from('attempt_questions').select('id').in('attempt_id', attemptIds)
            const questionIds = (questions ?? []).map((row) => row.id)
            if (questionIds.length > 0) {
                await admin.from('attempt_answers').delete().in('attempt_question_id', questionIds)
                await admin.from('attempt_questions').delete().in('id', questionIds)
            }
            await admin.from('exam_attempts').delete().in('id', attemptIds)
        }
        for (const [table, column] of [
            ['audit_logs', 'actor_user_id'], ['user_roles', 'user_id'], ['entitlements', 'user_id'],
            ['user_tracks', 'user_id'], ['wallet_transactions', 'user_id'], ['wallets', 'user_id'],
        ]) {
            await admin.from(table).delete().eq(column, user.id)
        }
        await admin.from('profiles').delete().eq('id', user.id)
        await admin.auth.admin.deleteUser(user.id).catch(() => undefined)
    }
    await admin.from('feature_flags').update({ enabled: false, rollout_percentage: 0 }).eq('key', 'tka.smp.monetization_enforcement')
    console.log(`[gate] pembersihan staging selesai (${targets.length} user ci-* dihapus)`)
}

async function runGate(name) {
    const gate = { ...GATES[name] }
    if (!gate) throw new Error(`Gate tidak dikenal: ${name}`)

    // Gate yang butuh Vercel Preview (mis. admin memverifikasi deploymentCommitSha) bisa
    // diarahkan dengan GATE_BASE_URL; app lokal tidak dijalankan dalam mode ini.
    const overrideBaseUrl = process.env.GATE_BASE_URL?.trim()
    if (overrideBaseUrl) {
        gate.appBaseUrl = overrideBaseUrl
        gate.manageApp = false
        console.log(`[gate] memakai base URL eksternal: ${overrideBaseUrl}`)
    }

    const expectedSha = process.env.E2E_EXPECTED_HEAD_SHA?.trim()

    if (process.env.SKIP_BUILD !== '1') {
        console.log('[gate] build aplikasi (env staging)…')
        await new Promise((done, fail) => {
            const build = startProcess('npm', ['run', 'build'], { APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging' }, 'build')
            build.on('exit', (code) => (code === 0 ? done() : fail(new Error(`build gagal (exit ${code})`))))
        })
    }

    const appEnv = {
        PORT: String(APP_PORT),
        APP_ENV: 'staging',
        NEXT_PUBLIC_APP_ENV: 'staging',
        NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: PUBLISHABLE,
        // Kunci service role: TKA memakai placeholder seperti workflow aslinya.
        SUPABASE_SERVICE_ROLE_KEY: gate.serviceRoleKey,
        NEXT_PUBLIC_SITE_URL: BASE_URL,
        // Suite staging membuat banyak user & login dari satu alamat.
        E2E_DISABLE_AUTH_RATE_LIMIT: '1',
    }

    console.log(`[gate] menjalankan gate "${name}"…`)
    startProcess('node', ['scripts/local-gates/ci-helper.mjs'], { CI_HELPER_PORT: String(HELPER_PORT) }, 'ci-helper')
    if (gate.manageApp) {
        startProcess('npm', ['run', 'start'], appEnv, 'app')
        await waitForHttp(`${gate.appBaseUrl}/login`, 60_000, 'aplikasi')
    }
    await waitForHttp(`http://127.0.0.1:${HELPER_PORT}/functions/v1/ci-e2e-m4`, 30_000, 'ci-helper', { acceptAnyStatus: true })

    const testEnv = {
        ...gate.env,
        ...(gate.manageApp ? {} : {
            APP_ENV: 'staging',
            NEXT_PUBLIC_APP_ENV: 'staging',
            SUPABASE_SERVICE_ROLE_KEY: gate.serviceRoleKey,
            E2E_DISABLE_AUTH_RATE_LIMIT: '1',
        }),
        BASE_URL: gate.appBaseUrl,
        // Mode remote aktif kecuali gate memakai webServer Playwright (gate TKA).
        ...(gate.manageApp || overrideBaseUrl ? { E2E_REMOTE_BASE_URL: gate.env.E2E_REMOTE_BASE_URL ?? '1' } : {}),
        NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: PUBLISHABLE,
        NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF: 'lpgrivowdcepcxradavu',
        SUPABASE_SERVICE_ROLE_KEY: gate.serviceRoleKey,
        CI_E2E_HELPER_BASE_URL: `http://127.0.0.1:${HELPER_PORT}/functions/v1`,
        E2E_GITHUB_OIDC_TOKEN: 'local-docker',
        GITHUB_RUN_ID: `local-${name}`,
        CI: 'true',
        E2E_DISABLE_AUTH_RATE_LIMIT: '1',
        ...(expectedSha ? { E2E_EXPECTED_HEAD_SHA: expectedSha, PR_HEAD_SHA: expectedSha } : {}),
        // Secret bypass Vercel hidup di .env.local, bukan di shell → teruskan eksplisit.
        ...(fileEnv.VERCEL_AUTOMATION_BYPASS_SECRET ? { VERCEL_AUTOMATION_BYPASS_SECRET: fileEnv.VERCEL_AUTOMATION_BYPASS_SECRET } : {}),
        ...(process.env.VERCEL_SHARE_URL || fileEnv.VERCEL_SHARE_URL ? { VERCEL_SHARE_URL: process.env.VERCEL_SHARE_URL || fileEnv.VERCEL_SHARE_URL } : {}),
    }

    const args = gate.project.split(' ').filter((token) => token !== 'test')
    const exitCode = await new Promise((done) => {
        const runner = startProcess('npx', ['playwright', 'test', ...args], testEnv, `pw-${name}`)
        runner.on('exit', (code) => done(code ?? 1))
    })

    await cleanStagingLeftovers()
    return exitCode
}

const targets = (process.argv[2] || 'all') === 'all' ? Object.keys(GATES) : [process.argv[2]]
let failed = 0
try {
    if (process.env.ONLY_CLEANUP === '1') {
        await cleanStagingLeftovers()
    } else {
        for (const target of targets) {
            const code = await runGate(target)
            console.log(`[gate] ${target} → exit ${code}`)
            if (code !== 0) failed += 1
        }
    }
} finally {
    stopAll()
}
process.exit(failed === 0 ? 0 : 1)
