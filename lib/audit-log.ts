import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'
import { getIp } from '@/lib/api-utils'

/**
 * Logs an administrative action to the audit_logs table for security and compliance.
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
            actor_id: params.actor_id,
            target_type: params.target_type,
            target_id: params.target_id || null,
            details: params.details || null,
            ip_address: ipAddress
        })

        if (error) {
            logger.warn('Failed to insert audit log', { error: error.message, action: params.action })
        }
    } catch (e) {
        logger.warn('Error constructing audit log', { error: e })
    }
}
