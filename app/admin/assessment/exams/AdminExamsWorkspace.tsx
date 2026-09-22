import Link from 'next/link'
import { Archive, Layers3 } from 'lucide-react'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminExamsService } from '@/src/services/admin-exams.service'
import {
  archiveAdminExamAction,
  saveAdminExamAction,
  saveAdminExamSectionAction,
} from '@/app/actions/admin-exams'
import AdminExamFormModal from '@/components/admin/AdminExamFormModal'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import AdminModal from '@/components/admin/AdminModal'
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFeedbackBanner,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  adminDangerButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { adminExamTypeLabel } from '@/lib/admin-format'

export type AdminExamsSearchParams = {
  ok?: string
  error?: string
  edit?: string
  program?: string
  track?: string
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

  // Otorisasi dulu, query kemudian — pola yang sama dengan
  // `AdminOperationsWorkspace`. Sebelumnya keduanya dijalankan serentak
  // (`Promise.all`), sehingga peran tanpa `exam.manage` tetap menunggu seluruh
  // query exam + section + pool soal selesai hanya untuk disuguhi "Akses tidak
  // tersedia". Selain boros, waktu muat halaman ikut membocorkan seberapa berat
  // data di baliknya.
  const authorization = await authorizationService.getCurrentAuthorization()
  const permissions = new Set(authorization?.permissions ?? [])
  const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE)
  if (!canExams) {
    return (
      <AdminPage>
        <AdminPageHeader title="Ujian" description="Kelola konfigurasi ujian dan bagian untuk konteks aktif."/>
        <AdminCard><AdminEmptyState title="Akses tidak tersedia" description="Akun ini tidak memiliki permission exam.manage."/></AdminCard>
      </AdminPage>
    )
  }

  const data = await adminExamsService.getWorkspace(requestedContext)
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
    <AdminPage>
      <AdminPageHeader
        title="Ujian"
        description={`Kelola ujian untuk ${data.catalog.program.name} / ${data.catalog.track.name}. Latihan materi berfokus pada satu submateri; tryout lengkap menggunakan beberapa bagian.`}
        action={pageAction}
      />

      <AdminFeedbackBanner ok={params.ok} error={params.error}/>

      {data.exams.length ? (
        <section className="space-y-5">
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
                      <AdminBadge variant={isDrill ? 'violet' : 'blue'}>{adminExamTypeLabel(typeCode)}</AdminBadge>
                      <AdminStatusBadge status={exam.status}/>
                    </div>
                    {isDrill ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <AdminBadge variant="blue">{drillSubject?.code ?? '?'} → {drillNode?.name ?? 'Submateri belum terhubung'}</AdminBadge>
                        <span>{drillRule?.questionCount ?? 0} soal Drill</span>
                        <span>·</span>
                        <span>{drillNode?.availableQuestionCount ?? 0} soal tersedia</span>
                        <span>·</span>
                        <span>{exam.duration_seconds ?? 0} detik</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-slate-500">{sections.length} bagian · {exam.token_cost} token</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link className={adminSecondaryButtonClass} href={workspaceHref(program, track, exam.id)} aria-label={`Ubah ujian ${exam.title}`}>Ubah</Link>
                    <form action={archiveAdminExamAction}>
                      <ContextFields program={program} track={track}/>
                      <input type="hidden" name="id" value={exam.id}/>
                      <ConfirmSubmit
                        message={`Ujian “${exam.title}” akan diarsipkan.`}
                        detail={isDrill
                          ? 'Drill ini tidak lagi muncul di jalur belajar peserta.'
                          : `${sections.length} bagian dan pengaturannya tetap tersimpan, tetapi ujian tidak lagi ditawarkan ke peserta.`}
                        confirmLabel="Arsipkan ujian"
                      trigger={<button type="button" className={adminDangerButtonClass}><Archive size={14}/>Arsipkan</button>}
                      />
                    </form>
                  </div>
                </div>

                {isDrill ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm font-medium leading-6 text-blue-900">
                    <div className="flex items-start gap-2"><Layers3 size={16} className="mt-1 shrink-0"/><span><strong>Bagian latihan dikelola otomatis.</strong> Fokus ujian mengikuti materi <strong>{drillNode?.name ?? '—'}</strong>; soal diambil dari materi tersebut dan turunannya.</span></div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {sections.length ? sections.map((section) => (
                        <AdminBadge key={section.id}>{subjectById.get(section.subject_id ?? '')?.code ?? '-'} · {section.question_count ?? 0} soal</AdminBadge>
                      )) : <span className="text-sm font-medium text-slate-500">Belum ada bagian.</span>}
                    </div>

                    <AdminModal title="Tambah bagian" description={`Tambahkan bagian ke ${exam.title}.`} triggerLabel="Tambah bagian" triggerVariant="secondary" size="lg">
                      <form action={saveAdminExamSectionAction} className="grid gap-4 md:grid-cols-2">
                        <ContextFields program={program} track={track}/>
                        <input type="hidden" name="exam_id" value={exam.id}/>
                        <AdminField label="Mapel / Subtes">
                          <select className={adminInputClass} name="subject_code">
                            <option value="">Tanpa mapel</option>
                            {data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}
                          </select>
                        </AdminField>
                        <AdminField label="Judul"><input className={adminInputClass} name="title" required/></AdminField>
                        <AdminField label="Urutan"><input className={adminInputClass} name="sort_order" type="number" defaultValue={sections.length + 1}/></AdminField>
                        <AdminField label="Jumlah soal"><input className={adminInputClass} name="question_count" type="number" min="1"/></AdminField>
                        <AdminField label="Durasi (detik)"><input className={adminInputClass} name="duration_seconds" type="number" min="1"/></AdminField>
                        <AdminField label="Nilai kelulusan"><input className={adminInputClass} name="passing_score" type="number" min="0"/></AdminField>
                        <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}>Tambah bagian</button></div>
                      </form>
                    </AdminModal>
                  </div>
                )}
              </AdminCard>
            )
          })}
        </section>
      ) : (
        <AdminCard><AdminEmptyState title="Belum ada ujian" description="Gunakan tombol Buat ujian. Untuk latihan materi, pilih subtes lalu submateri yang akan diperdalam."/></AdminCard>
      )}
    </AdminPage>
  )
}
