const ENV_CACHE = new Map<string, string>()

export function requireEnv(name: string) {
    const cached = ENV_CACHE.get(name)
    if (cached) return cached

    const value = process.env[name]
    if (!value) {
        throw new Error(`${name} is not configured`)
    }

    ENV_CACHE.set(name, value)
    return value
}

export const env = {
    supabaseUrl() {
        return requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    },
    supabaseAnonKey() {
        return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    },
    supabaseServiceRoleKey() {
        return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    },
    midtransServerKey() {
        return requireEnv('MIDTRANS_SERVER_KEY')
    },
    midtransClientKey() {
        return requireEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY')
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
