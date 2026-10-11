import 'server-only'
import { createV2AdminClient } from '@/lib/utils/supabase/server'

/** Call only after the owning workspace's permission check. */
export async function adminResourceCounts(
  kind: 'event_participants' | 'organization_assignments' | 'user_entitlements',
  ids: string[],
) {
  const counts = new Map<string, number>()
  if (!ids.length) return counts
  const db = await createV2AdminClient()
  const { data, error } = await db.rpc('admin_resource_counts', { p_kind: kind, p_ids: ids })
  if (error) throw error
  for (const row of data || []) counts.set(row.resource_id, Number(row.total))
  return counts
}
