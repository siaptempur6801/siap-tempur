import type { QuestionBankDetail } from '@/lib/question-bank'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'
import { createClient } from '@/lib/utils/supabase/server'
import { questionTaxonomyAndReview } from '@/src/services/admin-question-ux.service'
import QuestionBankForm,{ QuestionBankWorkflow } from './QuestionBankForm'
import { AdminReadinessChecklist } from './data-display/AdminReadinessChecklist'
import { AdminErrorState } from './feedback/AdminErrorState'

type Props={program:string;track:string;editId:string;subjects:{id:string;code:string;name:string}[];returnFilters:Record<string,string>;closeHref:string;canPublish:boolean}
/** Only mounted on the editor page. The authenticated RPC owns answer visibility. */
export default async function QuestionBankEditor({program,track,editId,subjects,returnFilters,closeHref,canPublish}:Props) {
 const {data,error}=await (await createClient()).rpc('get_question_bank_editor',{p_program:program,p_track:track,p_id:editId || null})
 if(error || !data || typeof data!=='object')return <AdminErrorState noun="detail soal" retryHref={`${closeHref}&${editId?`edit=${editId}`:'new=1'}`}/>
 const detail=data as unknown as QuestionBankDetail,question=detail.question
 if(isLegacyHistoryPlaceholder(question?.source_type))return <p role="note" className="text-sm text-warning">Placeholder riwayat pengerjaan lama tidak dapat diedit. Riwayat peserta tetap dipertahankan.</p>
 const readiness=question?(await questionTaxonomyAndReview([question])).get(String(question.id)):undefined
 return <div className="flex w-full max-w-[960px] flex-col gap-6">{question&&readiness&&<section aria-label="Question readiness"><h2 className="mb-3 font-semibold">Review & Kelengkapan · Versi {String(question.version)}</h2><p className="mb-3 text-sm text-muted-foreground">{readiness.taxonomy || 'Taksonomi belum dipetakan'} · {readiness.blockedAsset?'Asset: Blocked':'Asset: tidak ada blocker tercatat; konfirmasi pada Technical QA'}</p><AdminReadinessChecklist items={readiness.stages}/></section>}<QuestionBankForm key={question?String(question.id):'new'} detail={detail} program={program} track={track} subjects={subjects} returnFilters={returnFilters}/>{question&&<QuestionBankWorkflow question={question} program={program} track={track} returnFilters={returnFilters} canPublish={canPublish}/>}</div>
}
