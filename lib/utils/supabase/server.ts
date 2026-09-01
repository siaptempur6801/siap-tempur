import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'

/**
 * Transitional untyped client used by legacy runtime while each domain is
 * migrated to Schema V2. It still passes through the staging safety guard in
 * lib/env.ts on Preview deployments.
 */
export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        env.supabaseUrl(),
        env.supabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server Components cannot always mutate cookies. The
                        // middleware refresh path remains responsible for that.
                    }
                },
            },
        }
    )
}

/**
 * Typed Schema V2 client. New repositories/services must prefer this client.
 */
export async function createV2Client() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        env.supabaseUrl(),
        env.supabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // See createClient() note above.
                    }
                },
            },
        }
    )
}

/**
 * Transitional privileged client for legacy server actions.
 * USE ONLY on the server after explicit authorization checks.
 */
export async function createAdminClient() {
    return createSupabaseClient(
        env.supabaseUrl(),
        env.supabaseServiceRoleKey(),
        { auth: { persistSession: false, autoRefreshToken: false } }
    )
}

/**
 * Typed privileged Schema V2 client for repositories/services.
 * Never import this function from client components.
 */
export async function createV2AdminClient() {
    return createSupabaseClient<Database>(
        env.supabaseUrl(),
        env.supabaseServiceRoleKey(),
        { auth: { persistSession: false, autoRefreshToken: false } }
    )
}
