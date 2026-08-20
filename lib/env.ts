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

/**
 * Schema V2 safety rail.
 *
 * Preview/staging deployments must never silently connect to the production
 * Supabase project. Production continues to use the existing production
 * project until the explicit cutover phase.
 */
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

export const env = {
    appEnvironment: getAppEnvironment,
    supabaseProjectRef() {
        return getSupabaseProjectRef(env.supabaseUrl())
    },
    supabaseUrl() {
        const value = requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
        return assertSupabaseEnvironment(value)
    },
    supabaseAnonKey() {
        return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    },
    supabaseServiceRoleKey() {
        return requireEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    midtransServerKey() {
        return requireEnv('MIDTRANS_SERVER_KEY', process.env.MIDTRANS_SERVER_KEY)
    },
    midtransClientKey() {
        return requireEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY)
    },
    siteUrl() {
        return process.env.NEXT_PUBLIC_SITE_URL || 'https://siaptempur.id'
    },
    upstashRedisRestUrl() {
        return process.env.UPSTASH_REDIS_REST_URL || ''
    },
    upstashRedisRestToken() {
        return process.env.UPSTASH_REDIS_REST_TOKEN || ''
    },
}
