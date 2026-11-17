import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
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
 * Identitas user untuk request yang sedang berjalan, di-dedup per request.
 *
 * `supabase.auth.getUser()` selalu memanggil endpoint `/auth/v1/user` bila ada
 * sesi — satu round trip jaringan. Sebelum ini, satu render halaman dapat
 * memanggilnya beberapa kali (mis. `app/admin/layout.tsx` memanggil `getUser()`
 * lalu `getCurrentAuthorization()` yang memanggil `getUser()` lagi, lalu
 * `AdminOverview` memanggil `requirePermission` yang memanggilnya sekali lagi).
 *
 * `cache()` dari React memberi memoisasi berlingkup request: pemanggilan
 * pertama yang benar-benar menembak jaringan, sisanya memakai hasil yang sama.
 * Aman dari kebocoran antar-user karena lingkupnya satu request, bukan satu
 * proses — dan tidak ada data yang tersimpan lintas request.
 */
export const getAuthUser = cache(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    // `error` sengaja tidak dilempar: pemanggil lama memperlakukannya sebagai
    // "belum login" (mis. `if (error || !user) return null`). Menjaga bentuk
    // hasil yang sama membuat perubahan ini murni soal jumlah round trip.
    return { user: error ? null : data.user }
})

/**
 * Identitas user yang diverifikasi TANPA round trip jaringan.
 *
 * KENAPA
 *   `getAuthUser()` memanggil `GET /auth/v1/user` setiap kali ada sesi — satu
 *   round trip jaringan. Untuk halaman yang hanya perlu tahu "sudah login atau
 *   belum" (mis. label CTA di landing page), round trip itu tidak sepadan.
 *
 *   `getClaims()` memverifikasi tanda tangan JWT secara LOKAL memakai WebCrypto
 *   dengan kunci publik dari JWKS proyek. Proyek ini memakai penandatanganan
 *   asimetris (ES256), jadi verifikasinya benar-benar lokal — bukan sekadar
 *   membaca payload. JWKS di-cache oleh klien, sehingga round trip hanya terjadi
 *   sesekali saat kunci perlu disegarkan.
 *
 * KEAMANAN
 *   Nilai balik berasal dari payload JWT yang tanda tangannya SUDAH diverifikasi
 *   (`getClaims` melempar `AuthInvalidJwtError` bila tanda tangan tidak sah atau
 *   token kedaluwarsa). Ini setara dengan `getUser()` untuk keperluan identitas.
 *
 *   Bila JWT ditandatangani simetris (HS256) atau WebCrypto tidak tersedia,
 *   `getClaims()` otomatis jatuh ke `getUser()` — jadi fallback-nya aman dan
 *   tidak perlu ditangani di sini.
 *
 *   Hanya `sub` yang dikembalikan. Jangan pakai fungsi ini untuk data profil:
 *   klaim tidak memuatnya, dan profil tetap harus dibaca dari database.
 */
export const getAuthUserIdVerified = cache(async (): Promise<string | null> => {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
        env.supabaseUrl(),
        env.supabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    // Tidak ada yang perlu ditulis: verifikasi klaim tidak
                    // menyegarkan sesi. Penyegaran tetap tugas middleware.
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server Components cannot always mutate cookies.
                    }
                },
            },
        },
    )
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data) return null
    const sub = data.claims.sub
    return typeof sub === 'string' && sub.length > 0 ? sub : null
})

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
