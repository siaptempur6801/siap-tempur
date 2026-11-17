import { adminRoutes } from '@/lib/admin-routes'
import { saveAdminExamAction } from '@/app/actions/admin-exams'
import { AdminEmptyState,AdminFeedbackBanner,AdminHint,AdminPage,AdminPageHeader,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import AssessmentDetail from '@/components/admin/domain/assessment/AssessmentDetail'
import AssessmentForm from '@/components/admin/domain/assessment/AssessmentForm'
import AssessmentList from '@/components/admin/domain/assessment/AssessmentList'
import type { AdminExamsSearchParams } from '@/components/admin/domain/assessment/AssessmentWorkspaceTypes'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { PERMISSIONS } from '@/src/auth/permissions'
import { assessmentReadiness, assessmentSupplies } from '@/src/services/admin-assessment-ux.service'
import { adminExamsService } from '@/src/services/admin-exams.service'
import { assessmentCatalogService } from '@/src/services/assessment-catalog.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'

export type { AdminExamsSearchParams } from '@/components/admin/domain/assessment/AssessmentWorkspaceTypes'
const PATH = adminRoutes.assessments
export default async function AdminExamsWorkspace({ searchParams }: { searchParams: Promise<AdminExamsSearchParams> }) {
  const params = await searchParams
  const authorization = await authorizationService.getCurrentAuthorization()
  const permissions = new Set(authorization?.permissions ?? [])
  if (!permissions.has(PERMISSIONS.EXAM_MANAGE)) return <AdminPage><AdminPageHeader title="Assessment"/><AdminEmptyState title="Akses tidak tersedia" description="Hubungi pengelola untuk akses Assessment."/></AdminPage>
  const program = (params.domain || params.program || 'CPNS').toUpperCase()
  const requestedTrack = (params.level || params.track || '').toUpperCase()
  const track = (program === 'TKA' ? ['SD','SMP','SMA'] : ['SKD']).includes(requestedTrack) ? requestedTrack : program === 'TKA' ? 'SMP' : 'SKD'
  const filters = { search: params.search || params.q, type: params.type, status: params.status, page: params.page, id: params.assessment || params.edit }
  const context = { programCode: program, trackCode: track }
  const listQuery = new URLSearchParams({ program, track })
  for (const key of ['search', 'domain', 'type', 'status', 'level', 'page'] as const) { const value = key === 'search' ? filters.search : params[key]; if(value) listQuery.set(key, key === 'level' ? track : value) }
  const listHref = `${PATH}?${listQuery}`
  const href = (extra: Record<string, string>) => { const q = new URLSearchParams(listQuery); for (const [k,v] of Object.entries(extra)) q.set(k,v); return `${PATH}?${q}` }
  let data
  try { data = await adminExamsService.getWorkspace(context, filters) } catch { return <AdminErrorState noun="assessment" retryHref={listHref}/> }

  const supplies = await assessmentSupplies(data.exams.map(e => e.id))
  const eligible = await assessmentCatalogService.listDistributable(undefined, data.exams.map(e => e.id), supplies)
  const readiness = new Map(await Promise.all(data.exams.map(async exam => {
    const sections = data.examSections.filter(s => s.exam_id === exam.id)
    const rule = data.drillRules.find(r => r.blueprintId === exam.blueprint_id)
    const node = rule && data.drillNodes.find(n => n.id === rule.knowledgeNodeId)
    return [exam.id, await assessmentReadiness(exam, sections, rule ? { available: node?.availableQuestionCount || 0, required: rule.questionCount } : undefined, supplies.get(exam.id))] as const
  })))
  const eligibleIds = new Set(eligible.map(e=>e.id))
  const selected = data.exams.find(e => e.id === filters.id)
  const newForm = params.new === '1'
  const form = (exam = selected) => <AssessmentForm key={exam?.id || 'new'} canActivate={exam ? readiness.get(exam.id)?.configurationReady : false} action={saveAdminExamAction} program={program} track={track} examTypes={data.catalog.examTypes} subjects={data.catalog.subjects} knowledgeNodes={data.drillNodes} editedExam={exam} drillRule={data.drillRules.find(r => r.blueprintId === exam?.blueprint_id) || null} closeHref={exam ? href({ assessment: exam.id, tab: 'overview' }) : listHref} returnTo={exam ? href({ assessment: exam.id, tab: 'overview' }) : listHref}/>
  if (newForm) return <AdminPage><AdminBreadcrumbs items={[{label:'Assessment', href:listHref},{label:'Buat Assessment'}]}/><AdminPageHeader title="Buat Assessment" description={`${program} · ${track}`}/><AdminFeedbackBanner error={params.error}/><div className="w-full max-w-4xl"><AdminHint>Simpan informasi assessment terlebih dahulu. Pengaturan soal, readiness, dan distribusi dapat dilanjutkan dari halaman detail.</AdminHint></div>{form(undefined)}</AdminPage>
  if (filters.id && !selected) return <AdminPage><AdminBreadcrumbs items={[{label:'Assessment',href:listHref},{label:'Tidak ditemukan'}]}/><AdminEmptyState title="Assessment tidak ditemukan" description="Assessment tidak tersedia dalam konteks ini." action={<Link className={adminSecondaryButtonClass} href={listHref}>Kembali ke Assessment</Link>}/></AdminPage>
  const props = {data,params,program,track,permissions,readiness,eligibleIds,listHref,href,form,filters,listQuery}
  if(selected) return <AssessmentDetail {...props} selected={selected}/>
  return <AssessmentList {...props}/>
}
