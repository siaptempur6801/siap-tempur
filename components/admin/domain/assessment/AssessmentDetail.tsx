import {
archiveAdminExamAction,
publishAdminExamAction,
saveAdminExamSectionAction
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
adminTableHeadClass
} from '@/components/admin/AdminUi'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminReadinessChecklist } from '@/components/admin/data-display/AdminReadinessChecklist'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import { adminExamTypeLabel,adminQuestionTypeLabel,formatDateTime } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import { PERMISSIONS } from '@/src/auth/permissions'
import { assessmentQuestionPreview } from '@/src/services/admin-assessment-ux.service'
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
  listQuery
}: AssessmentWorkspaceProps & { selected: AssessmentWorkspaceProps['data']['exams'][number] }) {
  const typeById = new Map(data.catalog.examTypes.map((t) => [t.id, t]))
  const exam = selected
  const status = exam.status.toLowerCase()
  const isPublished = ['active', 'scheduled', 'published'].includes(status)
  const tab = params.edit ? 'configuration' : params.tab || 'overview'
  const ready = readiness.get(exam.id)!
  const sections = data.examSections.filter((s) => s.exam_id === exam.id)
  const detailHref = (tab: string) => href({ assessment: exam.id, tab })
  const questionPage = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.question_page || '1', 10) || 1)
  )
  const questionContextHref = `${detailHref('questions')}${questionPage > 1 ? `&question_page=${questionPage}` : ''}`
  const preview =
    tab === 'questions' && permissions.has(PERMISSIONS.QUESTION_MANAGE)
      ? await assessmentQuestionPreview(
          exam.id,
          sections.flatMap((s) => (s.subject_id ? [s.subject_id] : [])),
          questionPage,
          data.drillRules.find((r) => r.blueprintId === exam.blueprint_id)?.knowledgeNodeId
        )
      : null
  const distribution = new URLSearchParams({
    program,
    track,
    exam: exam.id,
    returnTo: detailHref('distribution')
  })
  return (
    <AdminPage>
      <AdminBreadcrumbs
        items={[
          { label: 'Assessment', href: listHref },
          { label: program },
          { label: adminExamTypeLabel(typeById.get(exam.exam_type_id)?.code) },
          { label: exam.title }
        ]}
      />
      <AdminPageHeader
        title={exam.title}
        description={`${program} · ${track} · ${adminExamTypeLabel(typeById.get(exam.exam_type_id)?.code)}`}
        action={
          isPublished ? (
            <Link className={adminPrimaryButtonClass} href={detailHref('distribution')}>
              Distribusikan
            </Link>
          ) : ['draft', 'ready'].includes(status) && ready.ready ? (
            <form action={publishAdminExamAction}>
              <input type="hidden" name="id" value={exam.id} />
              <input type="hidden" name="program_code" value={program} />
              <input type="hidden" name="track_code" value={track} />
              <input type="hidden" name="return_to" value={detailHref('distribution')} />
              <AdminSubmitButton pendingLabel="Mempublikasikan...">Publish Assessment</AdminSubmitButton>
            </form>
          ) : status === 'archived' ? undefined : (
            <Link className={adminPrimaryButtonClass} href={detailHref('configuration')}>
              Siapkan Assessment
            </Link>
          )
        }
      />
      <div className="flex items-center justify-between gap-3">
        <AdminStatusBadge status={exam.status} />
        {status !== 'archived' && (
          <details className="relative">
            <summary className={`${adminSecondaryButtonClass} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}>Lainnya</summary>
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
        )}
      </div>
      <AdminFeedbackBanner ok={params.ok} error={params.error} />
      <AdminTabs
        active={tab}
        tabs={[
          ['overview', 'Ringkasan'],
          ['questions', 'Soal'],
          ['configuration', 'Konfigurasi'],
          ['distribution', 'Distribusi'],
          ['results', 'Hasil']
        ].map(([id, label]) => ({ id, label, href: detailHref(id) }))}
      />
      {tab === 'overview' && (
        <>
          <AdminCard className="p-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              {[
                ['Domain', program],
                ['Jenis', adminExamTypeLabel(typeById.get(exam.exam_type_id)?.code)],
                ['Level', track],
                ['Soal', `${ready.questionCount} soal`],
                ['Durasi', `${Math.ceil((exam.duration_seconds || 0) / 60)} menit`],
                ['Diperbarui', formatDateTime(exam.updated_at)]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </AdminCard>
          <AdminCard className="space-y-4 p-6">
            <h2 className="font-bold">Readiness</h2>
            <AdminReadinessChecklist items={ready.items} />
            <Link
              className={adminSecondaryButtonClass}
              href={detailHref(ready.ready ? 'distribution' : 'questions')}
            >
              {ready.ready ? 'Lanjut ke Distribusi' : 'Lengkapi Soal dan Konfigurasi'}
            </Link>
          </AdminCard>
        </>
      )}
      {tab === 'configuration' && form(exam)}
      {tab === 'questions' && (
        <>
          <AdminCard className="space-y-5 p-6">
            <h2 className="font-bold">Bagian Assessment</h2>
            <p className="text-sm text-muted-foreground">
              {ready.bound
                ? `${ready.bound} soal terikat pada assessment.`
                : 'Soal diambil dari pool subtes sesuai konfigurasi. Preview pool tidak menentukan urutan soal peserta.'}
            </p>
            {sections.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="text-sm font-semibold">
                  {s.title}
                  <p className="text-xs text-muted-foreground">
                    {s.question_count} soal · {Math.ceil((s.duration_seconds || 0) / 60)} menit
                  </p>
                </div>
                {permissions.has(PERMISSIONS.QUESTION_MANAGE) && (
                  <Link
                    className={adminSecondaryButtonClass}
                    href={`/admin/content/questions?${new URLSearchParams({ program, track, subject: data.catalog.subjects.find((subject) => subject.id === s.subject_id)?.code || '', returnTo: questionContextHref })}`}
                  >
                    Lihat Pool Soal
                  </Link>
                )}
              </div>
            ))}
            {typeById.get(exam.exam_type_id)?.code !== 'DRILL' && (
              <AdminModal
                title="Tambah bagian"
                triggerLabel="Tambah bagian"
                triggerVariant="secondary"
                size="lg"
              >
                <form action={saveAdminExamSectionAction} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="program_code" value={program} />
                  <input type="hidden" name="track_code" value={track} />
                  <input type="hidden" name="exam_id" value={exam.id} />
                  <input type="hidden" name="return_to" value={detailHref('questions')} />
                  <AdminField label="Mapel / Subtes">
                    <select className={adminInputClass} name="subject_code" required>
                      {data.catalog.subjects.map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.code} · {s.name}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                  {[
                    ['title', 'Judul', 'text', undefined],
                    ['sort_order', 'Urutan', 'number', sections.length + 1],
                    ['question_count', 'Jumlah soal', 'number', undefined],
                    ['duration_seconds', 'Durasi (detik)', 'number', undefined],
                    ['passing_score', 'Nilai kelulusan', 'number', 0]
                  ].map(([name, label, type, value]) => (
                    <AdminField key={String(name)} label={String(label)}>
                      <input
                        className={adminInputClass}
                        name={String(name)}
                        type={String(type)}
                        min={name === 'passing_score' ? 0 : 1}
                        required
                        defaultValue={value}
                      />
                    </AdminField>
                  ))}
                  <button className={adminPrimaryButtonClass}>Tambah bagian</button>
                </form>
              </AdminModal>
            )}{' '}
          </AdminCard>
          {preview && (
            <AdminCard>
              <h2 className="p-5 font-bold">
                {preview.frozen ? 'Soal Terikat' : 'Preview Pool Soal'}
              </h2>
              <AdminDataTable className="w-full min-w-[700px] text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    {['Soal', 'Jenis', 'Versi', 'Status', 'Aksi'].map((h) => (
                      <AdminTh key={h}>{h}</AdminTh>
                    ))}
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
                      <td className="px-5">
                        <Link
                          className={adminSecondaryButtonClass}
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
            {!ready.ready && (
              <p role="status" className="text-sm text-warning">
                Lengkapi readiness sebelum assessment digunakan.
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: 'Direct',
                  description: 'Tersedia di katalog peserta sesuai status dan aturan akses.',
                  href: detailHref('configuration'),
                  allowed: true
                },
                {
                  title: 'Event',
                  description: 'Gunakan assessment pada event tertentu.',
                  href: `/admin/events?${distribution}&new=1`,
                  allowed: permissions.has(PERMISSIONS.EVENT_MANAGE)
                },
                {
                  title: 'Instansi',
                  description: 'Tugaskan ke instansi atau batch.',
                  href: `/admin/organizations?${distribution}`,
                  allowed: permissions.has(PERMISSIONS.ORGANIZATION_MANAGE)
                }
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
                            : 'Kelola Akses'}
                      </Link>
                    ) : (
                      <p className="text-xs font-semibold text-warning">
                        Belum dapat digunakan. Lengkapi konfigurasi dan status.
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </AdminCard>
        </>
      )}
      {tab === 'results' && (
        <AdminCard>
          <AdminEmptyState
            title="Monitoring Assessment"
            description="Pilih distribusi untuk memantau peserta dan membuka hasil dengan konteks yang benar."
            action={
              <Link className={adminPrimaryButtonClass} href={`/admin/monitoring?${distribution}`}>
                Lihat Monitoring
              </Link>
            }
          />
        </AdminCard>
      )}
    </AdminPage>
  )
}
