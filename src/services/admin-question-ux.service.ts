import { createAdminClient } from '@/lib/utils/supabase/server'
import { chunkValues } from '@/lib/supabase-batch'
export async function questionTaxonomyAndReview(questions:Record<string,unknown>[]) {
 const db=await createAdminClient();const ids=questions.map(q=>String(q.id));const result=new Map<string,{taxonomy:string;review:string;blockedAsset:boolean;stages:{label:string;ready:boolean;detail:string}[]}>()
 for(const batch of chunkValues(ids)) {
  const [{data:maps,error:mapError},{data:reviews,error:reviewError}]=await Promise.all([
   db.from('question_knowledge_nodes').select('question_id,knowledge_nodes(name,node_type)').in('question_id',batch).eq('relation_type','primary'),
   db.from('content_reviews').select('entity_id,status,notes,question_version,review_stage,completed_at').eq('entity_type','question').in('entity_id',batch).order('created_at',{ascending:false}),
  ])
  if(mapError) throw mapError;if(reviewError) throw reviewError
  for(const id of batch) {
   const question=questions.find(q=>String(q.id)===id)!
   const relevant=(reviews || []).filter(r=>String(r.entity_id)===id && Number(r.question_version)===Number(question.version))
   const latest=new Map<string,typeof relevant[number]>()
   for(const r of relevant) if(!latest.has(String(r.review_stage))) latest.set(String(r.review_stage),r)
   const blockedAsset=[...latest.values()].some(r=>/blocked[_ ]asset|aset.*belum|asset.*missing/i.test(String(r.notes || '')) && r.status!=='approved')
   const blockedContent=[...latest.values()].some(r=>/blocked[_ ]content/i.test(String(r.notes || '')) && r.status!=='approved')
   const rejected=[...latest.values()].some(r=>r.status==='rejected')
   const approved=['academic','editorial','technical_qa'].every(stage=>{const r=latest.get(stage);return r?.status==='approved'&&!!r.completed_at})
   const taxonomy=(maps || []).filter(r=>String(r.question_id)===id).map(r=>(r.knowledge_nodes as unknown as {name:string}|null)?.name).filter(Boolean).join(' · ')
   const stages=[['academic','Academic Review'],['editorial','Editorial Review'],['technical_qa','Technical QA']].map(([stage,label])=>{const review=latest.get(stage);return {label,ready:review?.status==='approved'&&!!review.completed_at,detail:review?`${review.status}${review.completed_at?' · Selesai':''}`:'Belum direview untuk versi ini'}})
   result.set(id,{taxonomy,stages,review:blockedAsset?'Blocked Asset':blockedContent?'Blocked Content':rejected?'Rejected':approved?'Approved':'Needs Review',blockedAsset})
  }
 }
 return result
}
export async function questionTaxonomyOptions(subjectIds:string[]) {
 const db=await createAdminClient();if(!subjectIds.length)return []
 const {data,error}=await db.from('knowledge_nodes').select('id,name,node_type,parent_id,subject_id').in('subject_id',subjectIds).order('name');if(error)throw error;return data || []
}
