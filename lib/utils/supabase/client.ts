import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'

/** Transitional client for legacy browser code during Schema V2 migration. */
export function createClient() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey())
}

/** Typed Schema V2 browser client for new safe/public repositories only. */
export function createV2Client() {
  return createBrowserClient<Database>(env.supabaseUrl(), env.supabaseAnonKey())
}
