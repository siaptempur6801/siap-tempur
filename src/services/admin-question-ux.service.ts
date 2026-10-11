import { createAdminClient } from '@/lib/utils/supabase/server'
import { chunkValues } from '@/lib/supabase-batch'

type ReviewStage = {
  label: string
  ready: boolean
  detail: string
}

export type QuestionTaxonomyReview = {
  taxonomy: string
  review: string
  blockedAsset: boolean
  blockedContent: boolean
  stages: ReviewStage[]
}

const REVIEW_STAGES = [
  ['academic', 'Academic Review'],
  ['editorial', 'Editorial Review'],
  ['technical_qa', 'Technical QA'],
] as const

function reviewDetail(review: { status: string; completed_at: string | null } | undefined) {
  if (!review) return 'Belum direview untuk versi ini'
  const status =
    {
      pending: 'Menunggu review',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      revision_required: 'Perlu revisi',
      cancelled: 'Dibatalkan',
    }[review.status] ?? review.status

  return `${status}${review.completed_at ? ' · Selesai' : ''}`
}

export async function questionTaxonomyAndReview(questions: Record<string, unknown>[]) {
  const result = new Map<string, QuestionTaxonomyReview>()
  const questionsById = new Map(questions.map((question) => [String(question.id), question]))
  const ids = [...questionsById.keys()]
  if (!ids.length) return result

  const db = await createAdminClient()
  for (const batch of chunkValues(ids)) {
    const [{ data: maps, error: mapError }, { data: reviews, error: reviewError }] =
      await Promise.all([
        db
          .from('question_knowledge_nodes')
          .select('question_id,knowledge_nodes(name,node_type)')
          .in('question_id', batch)
          .eq('relation_type', 'primary'),
        db
          .from('content_reviews')
          .select('id,entity_id,status,notes,question_version,review_stage,completed_at,created_at')
          .eq('entity_type', 'question')
          .in('entity_id', batch)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false }),
      ])
    if (mapError) throw mapError
    if (reviewError) throw reviewError

    const taxonomyById = new Map<string, string[]>()
    for (const mapping of maps ?? []) {
      const questionId = String(mapping.question_id)
      const node = mapping.knowledge_nodes as unknown as { name: string } | null
      if (!node?.name) continue
      const taxonomy = taxonomyById.get(questionId) ?? []
      taxonomy.push(node.name)
      taxonomyById.set(questionId, taxonomy)
    }

    const reviewsById = new Map<string, typeof reviews>()
    for (const review of reviews ?? []) {
      const questionId = String(review.entity_id)
      const questionReviews = reviewsById.get(questionId) ?? []
      questionReviews.push(review)
      reviewsById.set(questionId, questionReviews)
    }

    for (const id of batch) {
      const question = questionsById.get(id)
      if (!question) continue

      const version = Number(question.version)
      const latest = new Map<string, NonNullable<typeof reviews>[number]>()
      for (const review of reviewsById.get(id) ?? []) {
        if (Number(review.question_version) !== version) continue
        const stage = String(review.review_stage)
        if (!latest.has(stage)) latest.set(stage, review)
      }

      const currentReviews = [...latest.values()]
      const blockedAsset = currentReviews.some(
        (review) =>
          /blocked[_ ]asset|aset.*belum|asset.*missing/i.test(String(review.notes ?? '')) &&
          review.status !== 'approved',
      )
      const blockedContent = currentReviews.some(
        (review) =>
          /blocked[_ ]content/i.test(String(review.notes ?? '')) && review.status !== 'approved',
      )
      const rejected = currentReviews.some((review) => review.status === 'rejected')
      const approved = REVIEW_STAGES.every(([stage]) => {
        const review = latest.get(stage)
        return review?.status === 'approved' && Boolean(review.completed_at)
      })
      const taxonomy = (taxonomyById.get(id) ?? []).join(' · ')
      const stages = REVIEW_STAGES.map(([stage, label]) => {
        const review = latest.get(stage)
        return {
          label,
          ready: review?.status === 'approved' && Boolean(review.completed_at),
          detail: reviewDetail(
            review ? { status: review.status, completed_at: review.completed_at } : undefined,
          ),
        }
      })

      result.set(id, {
        taxonomy,
        stages,
        review: blockedAsset
          ? 'blocked_asset'
          : blockedContent
            ? 'blocked_content'
            : rejected
              ? 'rejected'
              : approved
                ? 'approved'
                : 'needs_review',
        blockedAsset,
        blockedContent,
      })
    }
  }

  return result
}

export async function questionTaxonomyOptions(subjectIds: string[]) {
  if (!subjectIds.length) return []
  const db = await createAdminClient()
  const { data, error } = await db
    .from('knowledge_nodes')
    .select('id,name,node_type,parent_id,subject_id')
    .in('subject_id', subjectIds)
    .order('name')
  if (error) throw error
  return data ?? []
}
