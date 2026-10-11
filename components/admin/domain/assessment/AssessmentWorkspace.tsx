import { saveAdminExamAction } from '@/app/actions/admin-exams'
import {
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminHint,
  AdminPage,
  AdminPageHeader,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import AssessmentDetail from '@/components/admin/domain/assessment/AssessmentDetail'
import AssessmentForm from '@/components/admin/domain/assessment/AssessmentForm'
import AssessmentList from '@/components/admin/domain/assessment/AssessmentList'
import type { AdminExamsSearchParams } from '@/components/admin/domain/assessment/AssessmentWorkspaceTypes'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import Link from '@/components/admin/navigation/AdminLink'
import { adminRoutes } from '@/lib/admin-routes'
import { PERMISSIONS } from '@/src/auth/permissions'
import { assessmentReadiness, assessmentSupplies } from '@/src/services/admin-assessment-ux.service'
import { assessmentCatalogService } from '@/src/services/assessment-catalog.service'
import { adminExamsService, drillRuleForExam } from '@/src/services/admin-exams.service'
import { authorizationService } from '@/src/services/authorization.service'

export type { AdminExamsSearchParams } from '@/components/admin/domain/assessment/AssessmentWorkspaceTypes'

const PATH = adminRoutes.assessments
const TKA_TRACKS = ['SD', 'SMP', 'SMA']

function resolveContext(params: AdminExamsSearchParams) {
  const program = (params.domain || params.program || 'CPNS').toUpperCase()
  const requestedTrack = (params.level || params.track || '').toUpperCase()
  const validTracks = program === 'TKA' ? TKA_TRACKS : ['SKD']
  const track = validTracks.includes(requestedTrack)
    ? requestedTrack
    : program === 'TKA'
      ? 'SMP'
      : 'SKD'

  return { program, track }
}

function createContextHref(query: URLSearchParams) {
  return (extra: Record<string, string>) => {
    const nextQuery = new URLSearchParams(query)
    for (const [key, value] of Object.entries(extra)) nextQuery.set(key, value)
    return `${PATH}?${nextQuery}`
  }
}

export default async function AdminExamsWorkspace({
  searchParams,
}: {
  searchParams: Promise<AdminExamsSearchParams>
}) {
  const params = await searchParams
  const authorization = await authorizationService.getCurrentAuthorization()
  const permissions = new Set(authorization?.permissions ?? [])

  if (!permissions.has(PERMISSIONS.EXAM_MANAGE)) {
    return (
      <AdminPage>
        <AdminPageHeader title="Assessment" />
        <AdminEmptyState
          title="Akses tidak tersedia"
          description="Hubungi pengelola untuk akses Assessment."
        />
      </AdminPage>
    )
  }

  const { program, track } = resolveContext(params)
  const filters = {
    search: params.search || params.q,
    type: params.type,
    status: params.status,
    page: params.page,
    id: params.assessment || params.edit,
  }
  const context = { programCode: program, trackCode: track }
  const listQuery = new URLSearchParams({ program, track })

  for (const key of ['search', 'type', 'status', 'page'] as const) {
    const value = key === 'search' ? filters.search : params[key]
    if (value) listQuery.set(key, value)
  }

  const listHref = `${PATH}?${listQuery}`
  const href = createContextHref(listQuery)

  let data: Awaited<ReturnType<typeof adminExamsService.getWorkspace>>
  try {
    data = await adminExamsService.getWorkspace(context, filters)
  } catch {
    return <AdminErrorState noun="assessment" retryHref={listHref} />
  }

  const supplies = await assessmentSupplies(data.exams.map((exam) => exam.id))
  const eligible = await assessmentCatalogService.listDistributable(
    undefined,
    data.exams.map((exam) => exam.id),
    supplies,
  )
  const readiness = new Map(
    await Promise.all(
      data.exams.map(async (exam) => {
        const sections = data.examSections.filter((section) => section.exam_id === exam.id)
        const isDrill =
          data.catalog.examTypes.find((type) => type.id === exam.exam_type_id)?.code === 'DRILL'
        const rule = isDrill
          ? drillRuleForExam(exam, sections, data.drillRules, data.drillNodes)
          : undefined
        const node =
          rule && data.drillNodes.find((candidate) => candidate.id === rule.knowledgeNodeId)
        const drillSection =
          sections.find((section) => section.config?.mode === 'drill') ??
          sections.find((section) => typeof section.config?.knowledge_node_id === 'string') ??
          sections[0]
        const drillSupply = isDrill
          ? {
              available: node?.availableQuestionCount ?? 0,
              required: rule?.questionCount ?? Number(drillSection?.question_count ?? 0),
            }
          : undefined
        const result = await assessmentReadiness(exam, sections, drillSupply, supplies.get(exam.id))

        return [exam.id, result] as const
      }),
    ),
  )
  const eligibleIds = new Set(eligible.map((exam) => exam.id))
  const selected = data.exams.find((exam) => exam.id === filters.id)

  const renderForm = (exam = selected) => {
    const sections = exam ? data.examSections.filter((section) => section.exam_id === exam.id) : []
    const isDrill = Boolean(
      exam &&
      data.catalog.examTypes.find((type) => type.id === exam.exam_type_id)?.code === 'DRILL',
    )
    const drillRule =
      exam && isDrill
        ? drillRuleForExam(exam, sections, data.drillRules, data.drillNodes)
        : undefined
    const drillSection =
      sections.find((section) => section.config?.mode === 'drill') ??
      sections.find((section) => typeof section.config?.knowledge_node_id === 'string') ??
      (sections.length === 1 ? sections[0] : undefined)
    const returnHref = exam ? href({ assessment: exam.id, tab: 'overview' }) : listHref

    return (
      <AssessmentForm
        key={exam?.id || 'new'}
        canActivate={exam ? readiness.get(exam.id)?.configurationReady : false}
        action={saveAdminExamAction}
        program={program}
        track={track}
        examTypes={data.catalog.examTypes}
        subjects={data.catalog.subjects}
        knowledgeNodes={data.drillNodes}
        editedExam={exam}
        editedSection={
          isDrill && drillSection
            ? {
                subjectId: drillSection.subject_id,
                title: drillSection.title,
                questionCount: drillSection.question_count,
                config: drillSection.config,
              }
            : undefined
        }
        drillRule={drillRule || null}
        closeHref={returnHref}
        returnTo={returnHref}
      />
    )
  }

  if (params.new === '1') {
    return (
      <AdminPage>
        <AdminBreadcrumbs
          items={[{ label: 'Assessment', href: listHref }, { label: 'Buat Assessment' }]}
        />
        <AdminPageHeader title="Buat Assessment" description={`${program} · ${track}`} />
        <AdminFeedbackBanner error={params.error} />
        <div className="w-full max-w-4xl">
          <AdminHint>
            Simpan informasi assessment terlebih dahulu. Pengaturan soal, kesiapan, dan distribusi
            dapat dilanjutkan dari halaman detail.
          </AdminHint>
        </div>
        {renderForm(undefined)}
      </AdminPage>
    )
  }

  if (filters.id && !selected) {
    return (
      <AdminPage>
        <AdminBreadcrumbs
          items={[{ label: 'Assessment', href: listHref }, { label: 'Tidak ditemukan' }]}
        />
        <AdminEmptyState
          title="Assessment tidak ditemukan"
          description="Assessment tidak tersedia dalam konteks ini."
          action={
            <Link className={adminSecondaryButtonClass} href={listHref}>
              Kembali ke Assessment
            </Link>
          }
        />
      </AdminPage>
    )
  }

  const workspaceProps = {
    data,
    params,
    program,
    track,
    permissions,
    readiness,
    eligibleIds,
    listHref,
    href,
    form: renderForm,
    filters,
    listQuery,
  }

  if (selected) return <AssessmentDetail {...workspaceProps} selected={selected} />
  return <AssessmentList {...workspaceProps} />
}
