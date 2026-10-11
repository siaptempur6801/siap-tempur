import { parseAdminPage } from '@/lib/admin-pagination'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import 'server-only'
import { authorizationService } from './authorization.service'
export async function getAdminAudit(filters: {
  actor?: string
  action?: string
  entity?: string
  from?: string
  to?: string
  page?: string
}) {
  await authorizationService.requirePermission(PERMISSIONS.AUDIT_READ)
  const db = await createAdminClient(),
    page = parseAdminPage(filters.page)
  type FilterChain = {
    eq: (key: string, value: string) => FilterChain
    gte: (key: string, value: string) => FilterChain
    lte: (key: string, value: string) => FilterChain
  }
  const applyFilters = <T>(builder: T): T => {
    let query = builder as unknown as FilterChain
    if (
      filters.actor &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.actor)
    )
      query = query.eq('actor_user_id', filters.actor)
    if (filters.action) query = query.eq('action', filters.action)
    if (filters.entity) query = query.eq('entity_type', filters.entity)
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from))
      query = query.gte('created_at', `${filters.from}T00:00:00+07:00`)
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to))
      query = query.lte('created_at', `${filters.to}T23:59:59.999+07:00`)
    return query as unknown as T
  }
  const count = await applyFilters(
    db.from('audit_logs').select('id', { count: 'exact', head: true }),
  )
  if (count.error) throw count.error
  const total = count.count || 0
  const result =
    (page - 1) * 50 < total
      ? await applyFilters(
          db
            .from('audit_logs')
            .select('id,actor_user_id,action,entity_type,entity_id,created_at,old_data,new_data'),
        )
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range((page - 1) * 50, page * 50 - 1)
      : { data: [], error: null }
  if (result.error) throw result.error
  const ids = [
    ...new Set(
      (result.data || []).map((l) => String(l.actor_user_id)).filter((id) => id !== 'null'),
    ),
  ]
  const profiles = ids.length
    ? await db.from('profiles').select('id,full_name,display_name').in('id', ids)
    : { data: [], error: null }
  if (profiles.error) throw profiles.error
  const names = new Map(
    (profiles.data || []).map((p) => [
      String(p.id),
      String(p.full_name || p.display_name || 'Pengguna'),
    ]),
  )
  return {
    logs: (result.data || []).map((l) => ({
      ...l,
      actor_name: names.get(String(l.actor_user_id)) || 'Sistem',
    })),
    total,
    page,
  }
}
