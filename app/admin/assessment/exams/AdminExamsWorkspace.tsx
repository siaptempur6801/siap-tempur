import Link from 'next/link'
import { Archive, Layers3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminExamsService } from '@/src/services/admin-exams.service'
import {
  archiveAdminExamAction,
  saveAdminExamAction,
  saveAdminExamSectionAction,
} from '@/app/actions/admin-exams'
import AdminExamFormModal from '@/components/admin/AdminExamFormModal'
import AdminModal from '@/components/admin/AdminModal'
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  adminDangerButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'

export type AdminExamsSearchParams = {
  ok?: string
  error?: string
  edit?: string
  program?: string
  track?: string
}

function statusVariant(value: string): 'neutral' | 'blue' | 'green' | 'yellow' | 'red' {
  switch (value.toLowerCase()) {
    case 'active': return 'green'
    case 'draft':
    case 'scheduled': return 'yellow'
    case 'archived': return 'neutral'
    case 'failed': return 'red'
    default: return 'blue'
  }
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('space-y-1.5', className)}>
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function ContextFields({ program, track }: { program: string; track: string }) {
  return <><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/></>
}

function workspaceHref(program: string, track: string, edit?: string) {
  const query = new URLSearchParams({ program, track })
  if (edit) query.set('edit', edit)
  return `/admin/assessment/exams?${query.toString()}`
}

export default async function AdminExamsWorkspace({ searchParams }: { searchParams: Promise<AdminExamsSearchParams> }) {
  const params = await searchParams
  const requestedContext = {
    programCode: (params.program || 'CPNS').toUpperCase(),
    trackCode: (params.track || 'SKD').toUpperCase(),
  }
  const [data, authorization] = await Promise.all([
    adminExamsService.getWorkspace(requestedContext),
    authorizationService.getCurrentAuthorization(),
  ])
  const permissions = new Set(authorization?.permissions ?? [])
  const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE)
  const program = data.catalog.program.code
  const track = data.catalog.track.code
  const closeHref = workspaceHref(program, track)

  const typeById = new Map(data.catalog.examTypes.map((row) => [row.id, row]))
  const subjectById = new Map(data.catalog.subjects.map((row) => [row.id, row]))
  const nodeById = new Map(data.drillNodes.map((row) => [row.id, row]))
  const drillRuleByBlueprint = new Map(data.drillRules.map((row) => [row.blueprintId, row]))
  const sectionsFor = (examId: string) => data.examSections.filter((row) => row.exam_id === examId)
  const editedExam = data.exams.find((row) => row.id === params.edit)
  const editedDrillRule = editedExam?.blueprint_id ? drillRuleByBlueprint.get(editedExam.blueprint_id) : undefined

  const pageAction = canExams ? (
    <AdminExamFormModal
      action={saveAdminExamAction}
      program={program}
      track={track}
      examTypes={data.catalog.examTypes}
      subjects={data.catalog.subjects}
      knowledgeNodes={data.drillNodes}
      editedExam={editedExam}
      drillRule={editedDrillRule ? {
        subjectId: editedDrillRule.subjectId,
        knowledgeNodeId: editedDrillRule.knowledgeNodeId,
        questionCount: editedDrillRule.questionCount,
      } : null}
      closeHref={closeHref}
    />
  ) : null

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Exams"
        description={`Kelola exam untuk ${data.catalog.program.name} / ${data.catalog.track.name}. Drill berfokus pada satu submateri; Full Tryout menggunakan sections.`}
        action={pageAction}
      />

      {params.ok || params.error ? (
        <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm font-bold shadow-sm', params.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
          {params.error || params.ok}
        </div>
      ) : null}

      {!canExams ? (
        <AdminCard><AdminEmptyState title="Akses tidak tersedia" description="Akun ini tidak memiliki permission exam.manage."/></AdminCard>
      ) : data.exams.length ? (
        <section className="space-y-3">
          {data.exams.map((exam) => {
            const examType = typeById.get(exam.exam_type_id)
            const typeCode = examType?.code ?? '?'
            const isDrill = typeCode === 'DRILL'
            const sections = sectionsFor(exam.id)
            const drillRule = exam.blueprint_id ? drillRuleByBlueprint.get(exam.blueprint_id) : undefined
            const drillNode = drillRule ? nodeById.get(drillRule.knowledgeNodeId) : undefined
            const drillSubject = drillRule ? subjectById.get(drillRule.subjectId) : undefined

            return (
              <AdminCard key={exam.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900">{exam.title}</span>
                      <AdminBadge variant={isDrill ? 'violet' : 'blue'}>{typeCode}</AdminBadge>
                      <AdminBadge variant={statusVariant(exam.status)}>{exam.status}</AdminBadge>
                    </div>
                    {isDrill ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <AdminBadge variant="blue">{drillSubject?.code ?? '?'} → {drillNode?.name ?? 'Submateri belum terhubung'}</AdminBadge>
                        <span>{drillRule?.questionCount ?? 0} soal Drill</span>
                        <span>·</span>
                        <span>pool {drillNode?.availableQuestionCount ?? 0} soal</span>
                        <span>·</span>
                        <span>{exam.duration_seconds ?? 0} detik</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-slate-500">{sections.length} section · token {exam.token_cost}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link className={adminSecondaryButtonClass} href={workspaceHref(program, track, exam.id)}>Edit</Link>
                    <form action={archiveAdminExamAction}>
                      <ContextFields program={program} track={track}/>
                      <input type="hidden" name="id" value={exam.id}/>
                      <button className={adminDangerButtonClass}><Archive size={14}/>Archive</button>
                    </form>
                  </div>
                </div>

                {isDrill ? (
                  <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm font-medium leading-6 text-violet-900">
                    <div className="flex items-start gap-2"><Layers3 size={16} className="mt-1 shrink-0"/><span><strong>Section Drill dikelola otomatis.</strong> Fokus exam mengikuti knowledge node <strong>{drillNode?.name ?? '—'}</strong>; soal di-materialize dari node tersebut dan turunannya.</span></div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {sections.length ? sections.map((section) => (
                        <AdminBadge key={section.id}>{subjectById.get(section.subject_id ?? '')?.code ?? '-'} · {section.question_count ?? 0} soal</AdminBadge>
                      )) : <span className="text-sm font-medium text-slate-500">Belum ada section.</span>}
                    </div>

                    <AdminModal title="Tambah section" description={`Tambahkan section ke ${exam.title}.`} triggerLabel="Tambah section" triggerVariant="secondary" size="lg">
                      <form action={saveAdminExamSectionAction} className="grid gap-4 md:grid-cols-2">
                        <ContextFields program={program} track={track}/>
                        <input type="hidden" name="exam_id" value={exam.id}/>
                        <Field label="Mapel / Subtes">
                          <select className={adminInputClass} name="subject_code">
                            <option value="">Tanpa mapel</option>
                            {data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Judul"><input className={adminInputClass} name="title" required/></Field>
                        <Field label="Urutan"><input className={adminInputClass} name="sort_order" type="number" defaultValue={sections.length + 1}/></Field>
                        <Field label="Jumlah soal"><input className={adminInputClass} name="question_count" type="number" min="1"/></Field>
                        <Field label="Durasi (detik)"><input className={adminInputClass} name="duration_seconds" type="number" min="1"/></Field>
                        <Field label="Passing score"><input className={adminInputClass} name="passing_score" type="number" min="0"/></Field>
                        <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}>Tambah section</button></div>
                      </form>
                    </AdminModal>
                  </div>
                )}
              </AdminCard>
            )
          })}
        </section>
      ) : (
        <AdminCard><AdminEmptyState title="Belum ada exam" description="Gunakan tombol Buat exam. Untuk Drill, pilih Subtes lalu Submateri yang akan diperdalam."/></AdminCard>
      )}
    </div>
  )
}
