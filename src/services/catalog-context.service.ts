import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { cache } from 'react'

export type ProgramTrackContext = {
  programCode: string
  trackCode: string
}

type ResolvedCatalogContext = ProgramTrackContext & {
  program: { id: string; code: string; name: string }
  track: { id: string; code: string; name: string }
  subjects: Array<{ id: string; code: string; name: string; subjectType: string }>
  examTypes: Array<{ id: string; code: string; name: string }>
}

export const CPNS_SKD_CONTEXT: ProgramTrackContext = {
  programCode: 'CPNS',
  trackCode: 'SKD',
}

function normalizeCode(value: string, label: string) {
  const normalized = value.trim().toUpperCase()
  if (!normalized) throw new Error(`${label}_REQUIRED`)
  return normalized
}

// Primitive keys deduplicate within one server render; no persistent/auth cache.
const resolveCatalog = cache(
  async (programCode: string, trackCode: string): Promise<ResolvedCatalogContext> => {
    const admin = await createV2AdminClient()

    // Track embeds its program: one scoped request replaces program → track.
    const [scope, types] = await Promise.all([
      admin
        .from('tracks')
        .select('id, code, name, programs!inner(id, code, name)')
        .eq('programs.code', programCode)
        .eq('code', trackCode)
        .maybeSingle(),
      admin.from('exam_types').select('id, code, name').order('code'),
    ])
    if (scope.error) throw scope.error
    if (types.error) throw types.error
    const track = scope.data
    if (!track) {
      // Preserve specific errors for invalid context without burdening valid requests.
      const { data: program, error } = await admin
        .from('programs')
        .select('id')
        .eq('code', programCode)
        .maybeSingle()
      if (error) throw error
      if (!program) throw new Error(`PROGRAM_NOT_FOUND:${programCode}`)
      throw new Error(`TRACK_NOT_FOUND:${programCode}/${trackCode}`)
    }
    const program = track.programs as unknown as { id: string; code: string; name: string }
    const examTypes = types.data
    const { data: subjects, error: subjectError } = await admin
      .from('subjects')
      .select('id, code, name, subject_type')
      .eq('track_id', track.id)
      .in('status', ['active', 'ACTIVE'])
      .order('sort_order', { ascending: true })
    if (subjectError) throw subjectError

    return {
      programCode,
      trackCode,
      program: {
        id: String(program.id),
        code: String(program.code),
        name: String(program.name),
      },
      track: {
        id: String(track.id),
        code: String(track.code),
        name: String(track.name),
      },
      subjects: (subjects ?? []).map((row) => ({
        id: String(row.id),
        code: String(row.code),
        name: String(row.name),
        subjectType: String(row.subject_type ?? 'mandatory'),
      })),
      examTypes: (examTypes ?? []).map((row) => ({
        id: String(row.id),
        code: String(row.code),
        name: String(row.name),
      })),
    }
  },
)

class CatalogContextService {
  resolve(context: ProgramTrackContext): Promise<ResolvedCatalogContext> {
    return resolveCatalog(
      normalizeCode(context.programCode, 'PROGRAM_CODE'),
      normalizeCode(context.trackCode, 'TRACK_CODE'),
    )
  }
}

export const catalogContextService = new CatalogContextService()
