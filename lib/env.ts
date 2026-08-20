const ENV_CACHE = new Map<string, string>()

const PRODUCTION_SUPABASE_PROJECT_REF = 'llnttutwhtvxtdktiizo'
const STAGING_SUPABASE_PROJECT_REF = 'lpgrivowdcepcxradavu'

export type AppEnvironment = 'development' | 'staging' | 'production' | 'test'

export function requireEnv(name: string, directValue?: string) {
    const cached = ENV_CACHE.get(name)
    if (cached) return cached

    const value = directValue ?? process.env[name]
    if (!value) {
        throw new Error(`${name} is not configured`)
    }

    ENV_CACHE.set(name, value)
    return value
}

function getSupabaseProjectRef(url: string) {
    try {
        const hostname = new URL(url).hostname
        const [projectRef] = hostname.split('.')
        return projectRef || null
    } catch {
        return null
    }
}

function getAppEnvironment(): AppEnvironment {
    const configured = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV
    if (configured === 'production' || configured === 'staging' || configured === 'test' || configured === 'development') {
        return configured
    }

    if (process.env.VERCEL_ENV === 'production') return 'production'
    if (process.env.VERCEL_ENV === 'preview') return 'staging'
    if (process.env.NODE_ENV === 'test') return 'test'
    return 'development'
}

function assertSupabaseEnvironment(url: string) {
    const appEnvironment = getAppEnvironment()
    const projectRef = getSupabaseProjectRef(url)

    if (!projectRef) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid Supabase project URL')
    }

    if (appEnvironment === 'staging') {
        if (projectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
            throw new Error('Schema V2 staging is blocked from using the production Supabase project')
        }

        const expectedRef = process.env.NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF || STAGING_SUPABASE_PROJECT_REF
        if (projectRef !== expectedRef) {
            throw new Error(`Schema V2 staging expected Supabase project ${expectedRef}, received ${projectRef}`)
        }
    }

    return url
}

function assertMidtransEnvironment(value: string, keyName: string) {
    const appEnvironment = getAppEnvironment()
    const isSandboxKey = value.includes('SB-')

    if (appEnvironment === 'staging' && !isSandboxKey) {
        throw new Error(`${keyName} must use a Midtrans Sandbox key on staging`)
    }

    if (appEnvironment === 'production' && isSandboxKey) {
        throw new Error(`${keyName} must not use a Midtrans Sandbox key in production`)
    }

    return value
}

function resolveMidtransServerKey() {
    const appEnvironment = getAppEnvironment()

    if (appEnvironment === 'production') {
        return requireEnv('MIDTRANS_SERVER_KEY', process.env.MIDTRANS_SERVER_KEY)
    }

    const value = process.env.MIDTRANS_SERVER_KEY_SANDBOX || process.env.MIDTRANS_SERVER_KEY
    return requireEnv('MIDTRANS_SERVER_KEY_SANDBOX', value)
}

function resolveMidtransClientKey() {
    const appEnvironment = getAppEnvironment()

    if (appEnvironment === 'production') {
        return requireEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY)
    }

    const value = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    return requireEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX', value)
}

export const env = {
    appEnvironment: getAppEnvironment,
    supabaseProjectRef() {
        return getSupabaseProjectRef(env.supabaseUrl())
    },
    supabaseUrl() {
        const value = requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
        return assertSupabaseEnvironment(value)
    },
    supabasePublishableKey() {
        const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        return requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', value)
    },
    /** @deprecated New code should use supabasePublishableKey(). */
    supabaseAnonKey() {
        return env.supabasePublishableKey()
    },
    supabaseServiceRoleKey() {
        return requireEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    midtransServerKey() {
        const value = resolveMidtransServerKey()
        const keyName = getAppEnvironment() === 'production' ? 'MIDTRANS_SERVER_KEY' : 'MIDTRANS_SERVER_KEY_SANDBOX'
        return assertMidtransEnvironment(value, keyName)
    },
    midtransClientKey() {
        const value = resolveMidtransClientKey()
        const keyName = getAppEnvironment() === 'production' ? 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY' : 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX'
        return assertMidtransEnvironment(value, keyName)
    },
    siteUrl() {
        const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
        if (configured) return configured.replace(/\/$/, '')

        const vercelUrl = process.env.VERCEL_URL?.trim()
        if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`

        if (getAppEnvironment() === 'production') return 'https://siaptempur.id'
        return 'http://localhost:3000'
    },
    upstashRedisRestUrl() {
        return process.env.UPSTASH_REDIS_REST_URL || ''
    },
    upstashRedisRestToken() {
        return process.env.UPSTASH_REDIS_REST_TOKEN || ''
    },
}
