import { cache } from 'react'
import { createV2Client } from '@/lib/utils/supabase/server'

// React cache is request-scoped: catalog lookups never cache permissions or
// attempt/payment state across users. The join removes a dependent HTTP read.
export const getTkaCatalogContext = cache(async (programCode: string, trackCode: string) => {
    const db = await createV2Client()
    const { data, error } = await db.from('tracks')
        .select('id, program_id, programs!inner(code)')
        .eq('code', trackCode)
        .eq('programs.code', programCode)
        .maybeSingle()
    if (error) throw error
    return data ? { programId: data.program_id, trackId: data.id } : null
})

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
