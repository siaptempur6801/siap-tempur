import { cache } from 'react'
import { createV2Client, getAuthUser } from '@/lib/utils/supabase/server'

// React cache is request-scoped: catalog lookups never cache permissions or
// attempt/payment state across users. The join removes a dependent HTTP read.
const getTkaCatalogContext = cache(async (programCode: string, trackCode: string) => {
  const db = await createV2Client()
  const { data, error } = await db
    .from('tracks')
    .select('id, program_id, programs!inner(code)')
    .eq('code', trackCode)
    .eq('programs.code', programCode)
    .maybeSingle()
  if (error) throw error
  return data ? { programId: data.program_id, trackId: data.id } : null
})

// Catalog RLS is independent of the Auth user lookup. Start both reads together,
// but preserve the login redirect on an invalid session even if catalog RLS fails.
export async function getAuthenticatedTkaCatalogContext(programCode: string, trackCode: string) {
  const catalogPending = getTkaCatalogContext(programCode, trackCode).then(
    (data) => ({ data, error: null }),
    (error) => ({ data: null, error }),
  )
  const identity = await getAuthUser()
  if (!identity.user) return { user: null, catalogContext: null }
  const catalog = await catalogPending
  if (catalog.error) throw catalog.error
  return { user: identity.user, catalogContext: catalog.data }
}

export async function getTkaAttemptSummaries(
  db: Awaited<ReturnType<typeof createV2Client>>,
  examIds: string[],
  directOnly: boolean,
) {
  if (examIds.length === 0) return []
  const { data, error } = await db.rpc('learner_exam_attempt_summaries', {
    p_exam_ids: examIds,
    p_direct_only: directOnly,
  })
  if (error) throw error
  return data ?? []
}
