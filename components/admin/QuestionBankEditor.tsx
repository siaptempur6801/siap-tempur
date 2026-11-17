import type { QuestionBankDetail } from '@/lib/question-bank'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'
import { createClient } from '@/lib/utils/supabase/server'
import { questionTaxonomyAndReview } from '@/src/services/admin-question-ux.service'
import QuestionBankForm, { QuestionBankWorkflow } from './QuestionBankForm'
import { AdminReadinessChecklist } from './data-display/AdminReadinessChecklist'
import { AdminErrorState } from './feedback/AdminErrorState'

type Props = {
  program: string
  track: string
  editId: string
  subjects: { id: string; code: string; name: string }[]
  returnFilters: Record<string, string>
  closeHref: string
  canPublish: boolean
}

/** Only mounted on the editor page. The authenticated RPC owns answer visibility. */
export default async function QuestionBankEditor({
  program,
  track,
  editId,
  subjects,
  returnFilters,
  closeHref,
  canPublish,
}: Props) {
  const { data, error } = await (
    await createClient()
  ).rpc('get_question_bank_editor', {
    p_program: program,
    p_track: track,
    p_id: editId || null,
  })

  if (error || !data || typeof data !== 'object') {
    const retryQuery = new URLSearchParams({
      program,
      track,
      ...(editId ? { edit: editId } : { new: '1' }),
    })
    return (
      <AdminErrorState
        noun="detail soal"
        retryHref={`${closeHref}${closeHref.includes('?') ? '&' : '?'}${retryQuery}`}
      />
    )
  }

  const detail = data as unknown as QuestionBankDetail
  const question = detail.question
  if (isLegacyHistoryPlaceholder(question?.source_type)) {
    return (
      <p role="note" className="text-sm text-warning">
        Placeholder riwayat pengerjaan lama tidak dapat diedit. Riwayat peserta tetap dipertahankan.
      </p>
    )
  }

  const readiness = question
    ? (await questionTaxonomyAndReview([question])).get(String(question.id))
    : undefined
  const assetSummary = readiness?.blockedAsset
    ? 'Aset terblokir · perlu diperiksa pada Technical QA'
    : 'Tidak ada blocker aset tercatat'
  const contentSummary = readiness?.blockedContent ? ' · Konten terblokir' : ''

  return (
    <div className="flex w-full flex-col gap-6">
      {question && readiness ? (
        <section
          aria-label="Kelengkapan review"
          className="rounded-lg border border-border bg-card p-4 sm:p-5"
        >
          <div className="mb-3">
            <h2 className="font-semibold">
              Review dan kelengkapan · Versi {String(question.version)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {readiness.taxonomy || 'Taksonomi belum dipetakan'} · {assetSummary}
              {contentSummary}
            </p>
          </div>
          <AdminReadinessChecklist items={readiness.stages} />
        </section>
      ) : null}
      <QuestionBankForm
        key={question ? String(question.id) : 'new'}
        detail={detail}
        program={program}
        track={track}
        subjects={subjects}
        returnFilters={returnFilters}
      />
      {question ? (
        <QuestionBankWorkflow
          question={question}
          program={program}
          track={track}
          returnFilters={returnFilters}
          canPublish={canPublish}
        />
      ) : null}
    </div>
  )
}
