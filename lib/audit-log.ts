import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'
import { getIp } from '@/lib/api-utils'

/**
 * Menulis satu peristiwa audit admin ke `audit_logs`.
 *
 * Nama kolom di sini HARUS mengikuti skema nyata `public.audit_logs`:
 *   id, actor_user_id, action, entity_type, entity_id,
 *   old_data, new_data, ip_address, user_agent, created_at
 *
 * Sebelumnya fungsi ini memakai `actor_id`, `target_type`, `target_id`, dan
 * `details` — empat nama kolom yang TIDAK ADA di tabel tersebut. Akibatnya
 * setiap insert gagal dengan `42703`, dan karena kegagalannya hanya dicatat
 * sebagai `logger.warn`, seluruh audit trail admin hilang tanpa ada yang tahu.
 * Jangan mengubah nama kolom di sini tanpa memeriksa skema terlebih dahulu.
 */
export async function logAuditEvent(params: {
    action: string
    actor_id: string
    target_type: string
    target_id?: string
    details?: Record<string, unknown>
}) {
    try {
        const headerStore = await headers()
        const req = new Request('https://dummy.com', { headers: headerStore })
        const ipAddress = getIp(req)

        const admin = await createAdminClient()
        const { error } = await admin.from('audit_logs').insert({
            action: params.action,
            actor_user_id: params.actor_id,
            entity_type: params.target_type,
            entity_id: params.target_id || null,
            new_data: params.details || null,
            ip_address: ipAddress,
            user_agent: headerStore.get('user-agent'),
        })

        if (error) {
            // Dicatat sebagai error, bukan warn: kegagalan audit adalah masalah
            // keamanan/kepatuhan, bukan gangguan kosmetik. Sebelumnya kegagalan
            // ini tidak terlihat sama sekali.
            logger.error('Gagal menulis audit log', error, {
                action: params.action,
                actorId: params.actor_id,
            })
            return { success: false as const, error: error.message }
        }
        return { success: true as const }
    } catch (e) {
        logger.error('Gagal menyusun audit log', e, { action: params.action })
        return { success: false as const, error: e instanceof Error ? e.message : String(e) }
    }
}
