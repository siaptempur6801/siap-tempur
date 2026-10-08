import { createAdminClient } from '@/lib/utils/supabase/server'
import { authorizationService } from './authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import type { AdminExamRow, AdminExamSectionRow } from './admin-exams.service'
import type { ReadinessItem } from '@/components/admin/data-display/AdminReadinessChecklist'
import { assessmentCatalogService } from './assessment-catalog.service'
import { adminOffset, parseAdminPage } from '@/lib/admin-pagination'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { chunkValues } from '@/lib/supabase-batch'
import type { AssessmentOption } from '@/components/admin/AssessmentSelector'

export type AssessmentSupply = {
  exam_id: string; bound_count: number; approved_bound_count: number; reviewed_bound_count: number;
  sections: Array<{subject_id: string | null; question_count: number | null; published_count: number}>
}
export async function assessmentSupplies(examIds: string[]) {
  const db = await createAdminClient()
  const supply = new Map<string, AssessmentSupply>()
  if (!examIds.length) return supply
  const {data,error} = await db.rpc('admin_assessment_supply', {p_exam_ids: examIds})
  if (error) throw error
  for (const row of (data || []) as AssessmentSupply[]) supply.set(row.exam_id,row)
  return supply
}
export async function assessmentReadiness(exam: AdminExamRow, sections: AdminExamSectionRow[], drill?: { available: number; required: number }, supplied?: AssessmentSupply) {
  const supply = supplied ?? (await assessmentSupplies([exam.id])).get(exam.id)
  if (!supply) throw new Error('Assessment supply unavailable')
  const bound = Number(supply.bound_count)
  const reviewed = Number(supply.approved_bound_count)
  const completeReviews = Number(supply.reviewed_bound_count)
  const count = sections.reduce((sum, s) => sum + (s.question_count || 0), 0)
  const content = bound ? reviewed === bound && bound >= count : drill ? drill.available >= drill.required && drill.required > 0 : sections.length > 0 && sections.every(s => Number(s.question_count) > 0 && supply.sections.some(bank => bank.subject_id === s.subject_id && Number(bank.published_count) >= Number(s.question_count)))
  const items: ReadinessItem[] = [
    { label: 'Soal dikonfigurasi', ready: count > 0, detail: `${count} soal · ${sections.length} bagian${bound ? ` · ${bound} soal terikat` : ' · pool dinamis'}` },
    { label: 'Durasi dikonfigurasi', ready: Number(exam.duration_seconds) > 0, detail: `${Math.ceil((exam.duration_seconds || 0) / 60)} menit` },
    { label: 'Scoring dikonfigurasi', ready: sections.length > 0 && sections.every(s => !!s.subject_id), detail: 'Mengikuti subtes dan engine scoring assessment.' },
    { label: 'Taksonomi valid', ready: sections.length > 0 && sections.every(s => !!s.subject_id) },
    { label: 'Konten tersedia sesuai konfigurasi', ready: content, detail: bound ? `${reviewed} / ${bound} soal versi terikat disetujui atau diterbitkan.` : drill ? `${drill.available} soal disetujui dengan versi tersimpan; perlu ${drill.required}.` : 'Pool menggunakan soal berstatus terbit. Aset dan QA release tetap perlu diverifikasi melalui review konten.' },
  ]
  const configurationReady=items.every(item=>item.ready)
  items.push({label:'Review akademik, editorial & Technical QA',ready:!!bound && completeReviews===bound,detail:bound ? `${completeReviews} / ${bound} versi soal memiliki tiga review yang selesai.` : 'Pool dinamis: review per versi belum diverifikasi pada ringkasan ini. Buka review konten.'})
  return { items, ready: configurationReady, configurationReady, questionCount: count, bound: bound ?? 0 }
}

/** Separate UI adapter: canonical distribution eligibility stays in the existing catalog service. */
export async function assessmentOptions(filters: { search?: string; domain?: string; type?: string; level?: string; page?: string; selectedId?: string } = {}) {
  const actor = await authorizationService.requireAuthenticated()
  if (!actor.permissions.some(p => ([PERMISSIONS.EXAM_MANAGE, PERMISSIONS.EVENT_MANAGE, PERMISSIONS.ORGANIZATION_MANAGE] as string[]).includes(p))) throw new Error('Forbidden')
  const db = await createAdminClient()
  let query = db.from('exams').select('id, title, status, duration_seconds, programs!inner(code), tracks!inner(code), exam_types!inner(code), exam_sections(question_count)', { count: 'exact' }).order('title')
  if (filters.search) query = query.ilike('title', `%${escapePostgrestValue(filters.search)}%`)
  if (filters.domain) query = query.eq('programs.code', filters.domain)
  if (filters.type) query = query.eq('exam_types.code', filters.type)
  if (filters.level) query = query.eq('tracks.code', filters.level)
  const page = parseAdminPage(filters.page)
  const { data, count, error } = await query.range(adminOffset(page), adminOffset(page) + 24)
  if (error) throw error
  let rows = data ?? []
  if (filters.selectedId && !rows.some(r => r.id === filters.selectedId)) {
    const { data: selected, error } = await db.from('exams').select('id, title, status, duration_seconds, programs!inner(code), tracks!inner(code), exam_types!inner(code), exam_sections(question_count)').eq('id', filters.selectedId).maybeSingle()
    if (error) throw error
    if (selected) rows = [selected, ...rows]
  }
  const eligible = new Set((await assessmentCatalogService.listDistributable(undefined, rows.map(r => String(r.id)))).map(e => e.id))
  const options: AssessmentOption[] = rows.map(r => {
    const domain = (r.programs as unknown as { code: string }).code
    const level = (r.tracks as unknown as { code: string }).code
    const type = (r.exam_types as unknown as { code: string }).code
    const status = String(r.status).toLowerCase()
    const ready = eligible.has(String(r.id))
    const reason = ready
      ? undefined
      : status === 'draft'
        ? 'Masih berstatus Draft dan belum dapat digunakan.'
        : status === 'archived'
          ? 'Assessment sudah diarsipkan dan tidak dapat digunakan.'
          : 'Periksa kelengkapan soal dan konfigurasi assessment.'
    return { id: String(r.id), title: String(r.title), domain, level, type, status: String(r.status), durationSeconds: Number(r.duration_seconds || 0), questionCount: (r.exam_sections as unknown as { question_count: number }[]).reduce((sum, s) => sum + Number(s.question_count || 0), 0), eligible: ready, reason }
  })
  return { options, total: count ?? 0, page }
}

export async function assessmentQuestionPreview(examId:string,subjectIds:string[],page=1,drillNodeId?:string) {
  await authorizationService.requirePermission(PERMISSIONS.QUESTION_MANAGE)
  const db=await createAdminClient()
  const {data:bindings,error:bindingError,count:boundCount}=await db.from('exam_question_items').select('question_id,question_version,position',{count:'exact'}).eq('exam_id',examId).order('position').range((page-1)*25,page*25-1)
  if(bindingError) throw bindingError
  const fields='id,question_code,stem,question_type,version,status'
  if(boundCount) {
    const {data,error}=bindings?.length ? await db.from('questions').select(fields).in('id',bindings.map(b=>String(b.question_id))) : {data:[],error:null}
    if(error) throw error
    // Select the stem only from the exact frozen version. Never send snapshots or keys.
    const frozen:Array<{question_id:string;version:number;stem:unknown}>=[]
    for(const version of new Set((bindings || []).map(b=>Number(b.question_version)))) {
      const ids=(bindings || []).filter(b=>Number(b.question_version)===version).map(b=>String(b.question_id))
      const {data:versions,error}=await db.from('question_versions').select('question_id,version,stem:snapshot->question->>stem').eq('version',version).in('question_id',ids)
      if(error) throw error
      frozen.push(...(versions || []))
    }
    return {rows:(bindings || []).flatMap(b=>{const q=data?.find(q=>q.id===b.question_id);const version=frozen.find(v=>v.question_id===b.question_id && Number(v.version)===Number(b.question_version));return q?[{...q,stem:String(version?.stem || 'Preview versi terikat belum tersedia.'),bound_version:b.question_version}]:[]}),total:boundCount,frozen:true}

  }
  if(drillNodeId) {
    const {data:paths,error:pathError}=await db.from('knowledge_node_paths').select('descendant_id').eq('ancestor_id',drillNodeId)
    if(pathError) throw pathError
    const ids=new Set<string>()
    for(const nodes of chunkValues([...new Set([drillNodeId,...(paths || []).map(p=>String(p.descendant_id))])])) {
      for(let offset=0;;offset+=500) {
        const {data,error}=await db.from('question_knowledge_nodes').select('question_id').in('knowledge_node_id',nodes).eq('relation_type','primary').order('question_id').order('knowledge_node_id').range(offset,offset+499)
        if(error) throw error
        for(const m of data || []) ids.add(String(m.question_id))
        if((data || []).length<500) break
      }
    }
    const eligible:Array<{id:string;version:number}>=[]
    for(const batch of chunkValues([...ids])) {
      const {data,error}=await db.from('questions').select('id,version').in('id',batch).in('subject_id',subjectIds).in('status',['approved','published'])
      if(error) throw error
      const {data:versions,error:versionError}=await db.from('question_versions').select('question_id,version').in('question_id',batch)
      if(versionError) throw versionError
      eligible.push(...(data || []).filter(q=>versions?.some(v=>v.question_id===q.id && Number(v.version)===Number(q.version))))
    }
    const pageIds=eligible.sort((a,b)=>a.id.localeCompare(b.id)).slice((page-1)*25,page*25).map(q=>q.id)
    const {data,error}=pageIds.length?await db.from('questions').select(fields).in('id',pageIds).order('id'):{data:[],error:null}
    if(error) throw error
    return {rows:(data || []).map(q=>({...q,bound_version:q.version})),total:eligible.length,frozen:false}
  }
  if(!subjectIds.length)return {rows:[],total:0,frozen:false}
  const {data,error,count}=await db.from('questions').select(fields,{count:'exact'}).in('subject_id',subjectIds).in('status',['published','PUBLISHED','active','ACTIVE']).order('question_code').range((page-1)*25,page*25-1)
  if(error) throw error
  return {rows:(data || []).map(q=>({...q,bound_version:q.version})),total:count || 0,frozen:false}
}
