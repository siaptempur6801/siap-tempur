import {
  archiveAdminExamAction,
  publishAdminExamAction,
  saveAdminExamSectionAction,
} from '@/app/actions/admin-exams'
import AdminModal from '@/components/admin/AdminModal'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import {
  AdminCard,
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTh,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminReadinessChecklist } from '@/components/admin/data-display/AdminReadinessChecklist'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import {
  adminExamTypeLabel,
  adminQuestionTypeLabel,
  adminStatusLabel,
  formatDateTime,
} from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import { PERMISSIONS } from '@/src/auth/permissions'
import { assessmentKindForExamType } from '@/src/domain/assessment'
import { assessmentQuestionPreview } from '@/src/services/admin-assessment-ux.service'
import { drillRuleForExam } from '@/src/services/admin-exams.service'
import { Pencil } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

import type { AssessmentWorkspaceProps } from './AssessmentWorkspaceTypes'
const PATH = '/admin/assessments'
export default async function AssessmentDetail({
  selected,
  data,
  params,
  program,
  track,
  permissions,
  readiness,
  eligibleIds,
  listHref,
  href,
  form,
  listQuery,
}: AssessmentWorkspaceProps & { selected: AssessmentWorkspaceProps['data']['exams'][number] }) {
  const typeById = new Map(data.catalog.examTypes.map((t) => [t.id, t]))
  const exam = selected
  const status = exam.status.toLowerCase()
  const isPublished = ['active', 'scheduled', 'published'].includes(status)
  const examTypeCode = typeById.get(exam.exam_type_id)?.code ?? ''
  const isDistributableType = assessmentKindForExamType(examTypeCode) !== null
  const tab = params.edit ? 'configuration' : params.tab || 'overview'
  const ready = readiness.get(exam.id)!
  const sections = data.examSections.filter((s) => s.exam_id === exam.id)
  const isDrill = typeById.get(exam.exam_type_id)?.code === 'DRILL'
  const drillRule = isDrill
    ? drillRuleForExam(exam, sections, data.drillRules, data.drillNodes)
    : undefined
  const detailHref = (tab: string) => href({ assessment: exam.id, tab })
  const nextMissingReadiness = ready.items.find((item) => !item.ready && !item.informational)
  const nextSetupTab =
    nextMissingReadiness &&
    [
      'Soal dikonfigurasi',
      'Scoring dikonfigurasi',
      'Taksonomi valid',
      'Konten tersedia sesuai konfigurasi',
    ].includes(nextMissingReadiness.label)
      ? 'questions'
      : 'configuration'
  const sectionForm = (section?: (typeof sections)[number]) => {
    const passingScore = Number(section?.config?.passing_score ?? 0)

    return (
      <form action={saveAdminExamSectionAction} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="program_code" value={program} />
        <input type="hidden" name="track_code" value={track} />
        <input type="hidden" name="exam_id" value={exam.id} />
        <input type="hidden" name="return_to" value={detailHref('questions')} />
        {section ? <input type="hidden" name="id" value={section.id} /> : null}
        <AdminField label="Mapel / Subtes">
          <select
            className={adminInputClass}
            name="subject_code"
            defaultValue={
              data.catalog.subjects.find((subject) => subject.id === section?.subject_id)?.code
            }
            required
          >
            {data.catalog.subjects.map((subject) => (
              <option key={subject.id} value={subject.code}>
                {subject.code} · {subject.name}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Judul bagian">
          <input
            className={adminInputClass}
            name="title"
            required
            defaultValue={section?.title ?? ''}
          />
        </AdminField>
        <AdminField label="Urutan">
          <input
            className={adminInputClass}
            name="sort_order"
            type="number"
            min="0"
            required
            defaultValue={section?.sort_order ?? sections.length + 1}
          />
        </AdminField>
        <AdminField label="Jumlah soal">
          <input
            className={adminInputClass}
            name="question_count"
            type="number"
            min="1"
            required
            defaultValue={section?.question_count ?? ''}
          />
        </AdminField>
        <AdminField
          label="Durasi bagian (detik)"
          hint="Opsional. Kosongkan agar mengikuti durasi assessment. Contoh: 1.800 detik = 30 menit."
        >
          <input
            className={adminInputClass}
            name="duration_seconds"
            type="number"
            min="1"
            defaultValue={section?.duration_seconds ?? ''}
          />
        </AdminField>
        <AdminField label="Nilai kelulusan" hint="Isi 0 bila tidak ada ambang kelulusan khusus.">
          <input
            className={adminInputClass}
            name="passing_score"
            type="number"
            min="0"
            required
            defaultValue={Number.isFinite(passingScore) ? passingScore : 0}
          />
        </AdminField>
        {isPublished ? (
          <p
            role="status"
            className="rounded-lg border border-warning-border bg-warning-muted px-4 py-3 text-sm text-warning sm:col-span-2"
          >
            Assessment ini sudah {adminStatusLabel(status).toLowerCase()}. Perubahan akan tersimpan
            pada assessment ini; periksa kembali kesiapan setelah menyimpan.
          </p>
        ) : null}
        <div className="flex justify-end sm:col-span-2">
          <AdminSubmitButton pendingLabel="Menyimpan...">
            {section ? 'Simpan bagian' : 'Tambah bagian'}
          </AdminSubmitButton>
        </div>
      </form>
    )
  }
  const questionPage = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.question_page || '1', 10) || 1),
  )
  const questionContextHref = `${detailHref('questions')}${questionPage > 1 ? `&question_page=${questionPage}` : ''}`
  const preview =
    tab === 'questions' && permissions.has(PERMISSIONS.QUESTION_MANAGE)
      ? await assessmentQuestionPreview(
          exam.id,
          sections.flatMap((s) => (s.subject_id ? [s.subject_id] : [])),
          questionPage,
          drillRule?.knowledgeNodeId,
        )
      : null
  const distribution = new URLSearchParams({
    program,
    track,
    exam: exam.id,
    returnTo: detailHref('distribution'),
  })
  const headerAction =
    tab === 'distribution' ||
    tab === 'results' ||
    status === 'archived' ? undefined : isPublished && eligibleIds.has(exam.id) ? (
      <Link className={adminPrimaryButtonClass} href={detailHref('distribution')}>
        Distribusikan
      </Link>
    ) : isPublished && isDistributableType ? (
      <Link className={adminPrimaryButtonClass} href={detailHref('questions')}>
        Periksa kesiapan
      </Link>
    ) : isPublished ? (
      <Link className={adminPrimaryButtonClass} href={detailHref('distribution')}>
        Lihat distribusi
      </Link>
    ) : ['draft', 'ready'].includes(status) && ready.ready ? (
      <form action={publishAdminExamAction}>
        <input type="hidden" name="id" value={exam.id} />
        <input type="hidden" name="program_code" value={program} />
        <input type="hidden" name="track_code" value={track} />
        <input type="hidden" name="return_to" value={detailHref('distribution')} />
        <AdminSubmitButton pendingLabel="Menerbitkan...">Terbitkan Assessment</AdminSubmitButton>
      </form>
    ) : (
      <Link className={adminPrimaryButtonClass} href={detailHref(nextSetupTab)}>
        {nextSetupTab === 'questions' ? 'Lengkapi soal' : 'Atur konfigurasi'}
      </Link>
    )
  const archiveAction =
    status !== 'archived' ? (
      <details className="relative">
        <summary
          className={`${adminSecondaryButtonClass} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}
        >
          Lainnya
        </summary>
        <form
          action={archiveAdminExamAction}
          className="absolute right-0 z-10 mt-2 rounded-lg border bg-card p-3"
        >
          <input type="hidden" name="id" value={exam.id} />
          <input type="hidden" name="program_code" value={program} />
          <input type="hidden" name="track_code" value={track} />
          <input type="hidden" name="return_to" value={detailHref('overview')} />
          <ConfirmSubmit
            message={`Arsipkan ${exam.title}?`}
            confirmLabel="Arsipkan Assessment"
            trigger={
              <button type="button" className={adminSecondaryButtonClass}>
                Arsipkan
              </button>
            }
          />
        </form>
      </details>
    ) : null
  const pageActions =
    headerAction || archiveAction ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {headerAction}
        {archiveAction}
      </div>
    ) : undefined
  const addSectionAction =
    typeById.get(exam.exam_type_id)?.code !== 'DRILL' ? (
      <AdminModal
        title="Tambah bagian"
        triggerLabel="Tambah bagian"
        triggerVariant="secondary"
        size="lg"
      >
        {sectionForm()}
      </AdminModal>
    ) : null
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Assessment', href: listHref }, { label: exam.title }]} />
      <AdminPageHeader
        title={exam.title}
        description={`${adminExamTypeLabel(typeById.get(exam.exam_type_id)?.code)} · Kelola soal, konfigurasi, distribusi, dan hasil.`}
        action={pageActions}
      />
      <div className="flex items-center gap-3">
        <AdminStatusBadge status={exam.status} />
      </div>
      <AdminFeedbackBanner ok={params.ok} error={params.error} />
      <AdminTabs
        active={tab}
        tabs={[
          ['overview', 'Ringkasan'],
          ['questions', 'Soal'],
          ['configuration', 'Konfigurasi'],
          ['distribution', 'Distribusi'],
          ['results', 'Hasil'],
        ].map(([id, label]) => ({ id, label, href: detailHref(id) }))}
      />
      {tab === 'overview' && (
        <>
          <AdminCard className="p-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              {[
                ['Soal', `${ready.questionCount} soal`],
                [
                  'Durasi',
                  exam.duration_seconds
                    ? `${Math.ceil(exam.duration_seconds / 60)} menit`
                    : 'Belum diatur',
                ],
                ['Diperbarui', formatDateTime(exam.updated_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </AdminCard>
          <AdminCard className="space-y-4 p-6">
            <h2 className="font-bold">Kesiapan penggunaan</h2>
            <AdminReadinessChecklist items={ready.items} />
          </AdminCard>
        </>
      )}
      {tab === 'configuration' && form(exam)}
      {tab === 'questions' && (
        <>
          <AdminCard className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">Bagian Assessment</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ready.bound
                    ? `${ready.bound} soal terikat pada assessment.`
                    : 'Soal diambil dari pool subtes sesuai konfigurasi. Preview pool tidak menentukan urutan soal peserta.'}
                </p>
              </div>
              {addSectionAction}
            </div>
            {sections.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="text-sm font-semibold">
                  {s.title}
                  <p className="text-xs text-muted-foreground">
                    {s.question_count} soal
                    {s.duration_seconds && s.duration_seconds > 0
                      ? ` · ${Math.ceil(s.duration_seconds / 60)} menit`
                      : ' · Mengikuti durasi assessment'}
                    {s.config?.passing_score != null
                      ? ` · Nilai lulus ${String(s.config.passing_score)}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminModal
                    title={`Edit bagian: ${s.title}`}
                    description="Perbarui mapel, jumlah soal, durasi, dan nilai kelulusan bagian ini."
                    triggerLabel={`Edit ${s.title}`}
                    triggerVariant="secondary"
                    triggerIcon={<Pencil size={16} aria-hidden="true" />}
                    size="lg"
                  >
                    {sectionForm(s)}
                  </AdminModal>
                  {permissions.has(PERMISSIONS.QUESTION_MANAGE) && (
                    <Link
                      className={adminSecondaryButtonClass}
                      href={`/admin/content/questions?${new URLSearchParams({ program, track, subject: data.catalog.subjects.find((subject) => subject.id === s.subject_id)?.code || '', returnTo: questionContextHref })}`}
                    >
                      Lihat Pool Soal
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </AdminCard>
          {preview && (
            <AdminCard>
              <h2 className="p-5 font-bold">
                {preview.frozen ? 'Soal Terikat' : 'Preview Pool Soal'}
              </h2>
              <AdminDataTable className="w-full min-w-[700px] text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    {['Soal', 'Jenis', 'Versi', 'Status'].map((h) => (
                      <AdminTh key={h}>{h}</AdminTh>
                    ))}
                    <AdminTh align="right">Aksi</AdminTh>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.rows.map((q) => (
                    <tr key={q.id}>
                      <td className="max-w-lg px-5 py-4">
                        <p className="font-semibold">{q.question_code}</p>
                        <p className="mt-1 line-clamp-3 text-muted-foreground">
                          {String(q.stem)
                            .replace(/<[^>]*>/g, ' ')
                            .slice(0, 240)}
                        </p>
                      </td>
                      <td className="px-4">{adminQuestionTypeLabel(q.question_type)}</td>
                      <td className="px-4">{q.bound_version}</td>
                      <td className="px-4">
                        <AdminStatusBadge status={q.status} />
                      </td>
                      <td className="px-5 text-right">
                        <Link
                          className={adminTableActionClass}
                          href={`/admin/content/questions?${new URLSearchParams({ program, track, edit: String(q.id), returnTo: questionContextHref })}`}
                        >
                          Lihat Soal
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminDataTable>
              <AdminPagination
                pathname={PATH}
                pageKey="question_page"
                params={{ ...Object.fromEntries(listQuery), assessment: exam.id, tab: 'questions' }}
                summary={adminPageSummary(questionPage, preview.rows.length, preview.total)}
                noun="soal"
              />
            </AdminCard>
          )}
        </>
      )}
      {tab === 'distribution' && (
        <>
          <AdminCard className="space-y-4 p-6">
            <h2 className="font-bold">Distribusikan Assessment</h2>
            {!isDistributableType ? (
              <div
                role="status"
                className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm"
              >
                <p className="font-semibold">
                  Jenis assessment ini belum didukung untuk distribusi baru.
                </p>
                <p className="text-muted-foreground">
                  Jenis assessment ditetapkan saat dibuat dan tidak dapat diubah. Untuk distribusi
                  baru, buat Tryout, Mini Tryout, atau Drill.
                </p>
                <Link className={adminSecondaryButtonClass} href={href({ new: '1' })}>
                  Buat assessment yang didukung
                </Link>
              </div>
            ) : !ready.ready ? (
              <p role="status" className="text-sm text-warning">
                Kesiapan belum lengkap.{' '}
                <Link className="font-semibold underline" href={detailHref('questions')}>
                  Periksa soal
                </Link>{' '}
                dan{' '}
                <Link className="font-semibold underline" href={detailHref('configuration')}>
                  konfigurasi
                </Link>{' '}
                sebelum didistribusikan.
              </p>
            ) : !eligibleIds.has(exam.id) && ['draft', 'ready'].includes(status) ? (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4"
              >
                <p className="text-sm text-muted-foreground">
                  Assessment siap, tetapi perlu dipublikasikan sebelum jalur distribusi tersedia.
                </p>
                <form action={publishAdminExamAction}>
                  <input type="hidden" name="id" value={exam.id} />
                  <input type="hidden" name="program_code" value={program} />
                  <input type="hidden" name="track_code" value={track} />
                  <input type="hidden" name="return_to" value={detailHref('distribution')} />
                  <AdminSubmitButton pendingLabel="Menerbitkan...">
                    Terbitkan Assessment
                  </AdminSubmitButton>
                </form>
              </div>
            ) : !eligibleIds.has(exam.id) ? (
              <p role="status" className="text-sm text-warning">
                Status atau isi assessment belum memenuhi syarat katalog distribusi. Tinjau kembali
                konfigurasi dan ketersediaan soal.
              </p>
            ) : null}
            {isDistributableType && (
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    title: 'Katalog peserta',
                    description: 'Tersedia di katalog peserta sesuai status dan aturan akses.',
                    href: detailHref('configuration'),
                    allowed: true,
                  },
                  {
                    title: 'Event',
                    description: 'Gunakan assessment pada event tertentu.',
                    href: `/admin/events?${distribution}&new=1`,
                    allowed: permissions.has(PERMISSIONS.EVENT_MANAGE),
                  },
                  {
                    title: 'Instansi',
                    description: 'Tugaskan ke instansi atau batch.',
                    href: `/admin/organizations?${distribution}`,
                    allowed: permissions.has(PERMISSIONS.ORGANIZATION_MANAGE),
                  },
                ]
                  .filter((c) => c.allowed)
                  .map((c) => (
                    <div key={c.title} className="space-y-3 rounded-lg border p-5">
                      <h3 className="font-bold">{c.title}</h3>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                      {eligibleIds.has(exam.id) ? (
                        <Link
                          data-assessment-id={exam.id}
                          className={adminSecondaryButtonClass}
                          href={c.href}
                        >
                          {c.title === 'Event'
                            ? 'Buat Event'
                            : c.title === 'Instansi'
                              ? 'Tugaskan ke Instansi'
                              : 'Atur akses katalog'}
                        </Link>
                      ) : (
                        <p className="text-xs font-semibold text-warning">
                          {!ready.ready
                            ? 'Selesaikan kesiapan terlebih dahulu.'
                            : ['draft', 'ready'].includes(status)
                              ? 'Terbitkan assessment terlebih dahulu.'
                              : 'Periksa status dan ketersediaan soal.'}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </AdminCard>
        </>
      )}
      {tab === 'results' && (
        <AdminCard>
          <AdminEmptyState
            title="Hasil mengikuti distribusi"
            description="Peserta masuk melalui Event atau penugasan Instansi. Buka Distribusi untuk memilih jalur, lalu pantau peserta dari workspace tujuan."
            action={
              <Link className={adminPrimaryButtonClass} href={detailHref('distribution')}>
                Pilih distribusi
              </Link>
            }
          />
        </AdminCard>
      )}
    </AdminPage>
  )
}
