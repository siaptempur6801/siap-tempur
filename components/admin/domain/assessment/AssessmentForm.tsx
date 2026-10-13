'use client'

import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import {
  AdminBadge,
  AdminField,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { AdminFormActions } from '@/components/admin/forms/AdminFormActions'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { adminExamTypeLabel, adminStatusLabel } from '@/lib/admin-format'
import { isTkaTokenAssessment } from '@/src/tka/context'
import { Pencil, Save } from 'lucide-react'
import { useMemo, useState } from 'react'

export type ExamFormExam = {
  id: string
  exam_type_id: string
  title: string
  slug: string
  duration_seconds: number | null
  attempt_limit: number | null
  question_order: string
  result_visibility: string
  access_type: string
  status: string
  token_cost: number
}

export type ExamFormType = { id: string; code: string; name: string }
export type ExamFormSubject = { id: string; code: string; name: string }
export type ExamFormKnowledgeNode = {
  id: string
  subjectId: string
  parentId: string | null
  code: string | null
  name: string
  nodeType: string
  depth: number
  sortOrder: number
  availableQuestionCount: number
}

export type ExamFormDrillRule = {
  subjectId: string
  knowledgeNodeId: string
  questionCount: number
} | null

function generatedDrillTitle(subject?: ExamFormSubject, node?: ExamFormKnowledgeNode) {
  if (!subject || !node) return ''
  return `Drill ${subject.code} · ${node.name}`
}

export default function AssessmentForm({
  action,
  program,
  track,
  examTypes,
  subjects,
  knowledgeNodes,
  editedExam,
  editedSection,
  drillRule,
  closeHref,
  returnTo,
  canActivate = false,
}: {
  action: (formData: FormData) => void | Promise<void>
  program: string
  track: string
  examTypes: ExamFormType[]
  subjects: ExamFormSubject[]
  knowledgeNodes: ExamFormKnowledgeNode[]
  editedExam?: ExamFormExam
  editedSection?: {
    subjectId: string | null
    title: string
    questionCount: number | null
    config: Record<string, unknown> | null
  }
  drillRule: ExamFormDrillRule
  closeHref: string
  returnTo?: string
  canActivate?: boolean
}) {
  const typeById = useMemo(() => new Map(examTypes.map((type) => [type.id, type])), [examTypes])
  const editedTypeCode = editedExam ? (typeById.get(editedExam.exam_type_id)?.code ?? '') : ''
  const [examTypeCode, setExamTypeCode] = useState(
    editedTypeCode || examTypes[0]?.code || 'FULL_TRYOUT',
  )
  const initialSubject =
    subjects.find((subject) => subject.id === drillRule?.subjectId) ??
    subjects.find((subject) => subject.id === editedSection?.subjectId) ??
    subjects[0]
  const [subjectCode, setSubjectCode] = useState(initialSubject?.code ?? '')
  const subjectByCode = useMemo(
    () => new Map(subjects.map((subject) => [subject.code, subject])),
    [subjects],
  )
  const subjectId = subjectByCode.get(subjectCode)?.id ?? ''
  const nodesForSubject = useMemo(
    () => knowledgeNodes.filter((node) => node.subjectId === subjectId),
    [knowledgeNodes, subjectId],
  )
  const initialNode =
    nodesForSubject.find((node) => node.id === drillRule?.knowledgeNodeId) ??
    nodesForSubject.find((node) => node.id === editedSection?.config?.knowledge_node_id) ??
    nodesForSubject.find((node) => node.name === editedSection?.title) ??
    (editedExam && editedTypeCode === 'DRILL' ? undefined : nodesForSubject[0])
  const [knowledgeNodeId, setKnowledgeNodeId] = useState(initialNode?.id ?? '')
  const selectedNode =
    nodesForSubject.find((node) => node.id === knowledgeNodeId) ??
    (editedExam && editedTypeCode === 'DRILL' && !drillRule ? undefined : nodesForSubject[0])
  const initialQuestionCount =
    editedSection?.questionCount ??
    drillRule?.questionCount ??
    Math.min(20, selectedNode?.availableQuestionCount || 20)
  const [questionCount, setQuestionCount] = useState(Math.max(1, initialQuestionCount))
  const [manualTitle, setManualTitle] = useState(Boolean(editedExam?.title))
  const [title, setTitle] = useState(editedExam?.title ?? '')
  const [isEditing, setIsEditing] = useState(!editedExam)
  const isDrill = examTypeCode === 'DRILL'
  const needsManualDrillSelection = Boolean(
    isDrill && editedExam && editedSection && !drillRule && !initialNode,
  )
  const requiresTkaToken =
    program.toUpperCase() === 'TKA' &&
    track.toUpperCase() === 'SMP' &&
    isTkaTokenAssessment('SMP', examTypeCode)
  const poolTooSmall =
    isDrill && (!selectedNode || questionCount > selectedNode.availableQuestionCount)

  function updateAutoTitle(nextSubjectCode: string, nextNodeId: string) {
    if (manualTitle) return
    const subject = subjectByCode.get(nextSubjectCode)
    const node = knowledgeNodes.find((item) => item.id === nextNodeId)
    setTitle(generatedDrillTitle(subject, node))
  }

  const form = (
    <form
      action={action}
      data-admin-form
      className="admin-assessment-form flex w-full flex-col gap-6 rounded-lg border border-border bg-card p-5 sm:p-6"
    >
      <input type="hidden" name="return_to" value={returnTo || closeHref} />
      <input type="hidden" name="program_code" value={program} />
      <input type="hidden" name="track_code" value={track} />
      {editedExam ? <input type="hidden" name="id" value={editedExam.id} /> : null}

      <AdminFormSection
        title="Informasi dasar"
        description="Tipe assessment menentukan pola pengerjaan dan tidak dapat diubah setelah dibuat."
        showDivider={false}
      >
        <AdminField label="Jenis assessment">
          {editedExam ? (
            <>
              <input type="hidden" name="exam_type_code" value={examTypeCode} />
              <div className="flex h-9 items-center rounded-lg border border-border bg-muted px-3 text-sm font-medium text-foreground max-md:h-11">
                {adminExamTypeLabel(examTypeCode)}
              </div>
            </>
          ) : (
            <select
              className={adminInputClass}
              name="exam_type_code"
              value={examTypeCode}
              onChange={(event) => {
                const nextType = event.target.value
                setExamTypeCode(nextType)
                if (nextType === 'DRILL' && !manualTitle) {
                  setTitle(generatedDrillTitle(subjectByCode.get(subjectCode), selectedNode))
                }
              }}
            >
              {examTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {adminExamTypeLabel(type.code)}
                </option>
              ))}
            </select>
          )}
        </AdminField>

        <AdminField label="Nama assessment">
          <input
            className={adminInputClass}
            name="title"
            required
            value={title}
            onChange={(event) => {
              setManualTitle(true)
              setTitle(event.target.value)
            }}
            placeholder={
              isDrill
                ? generatedDrillTitle(subjectByCode.get(subjectCode), selectedNode)
                : 'Masukkan nama assessment'
            }
          />
        </AdminField>

        <details className="sm:col-span-2">
          <summary className="w-fit cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            Pengaturan lanjutan
          </summary>
          <div className="mt-3 max-w-lg">
            <AdminField
              label="Slug URL"
              hint="Opsional. Kosongkan agar dibuat otomatis dari nama assessment."
            >
              <input
                className={adminInputClass}
                name="slug"
                defaultValue={editedExam?.slug || ''}
                placeholder="judul-assessment"
              />
            </AdminField>
          </div>
        </details>
      </AdminFormSection>

      {isDrill ? (
        <AdminFormSection
          title="Pengaturan Drill"
          description="Tentukan subtes, submateri, dan jumlah soal yang tersedia untuk latihan ini."
          showDivider={false}
        >
          <div className="sm:col-span-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Drill mengambil soal dari satu submateri. Bagian assessment dibuat otomatis.
          </div>
          {needsManualDrillSelection ? (
            <p
              role="status"
              className="sm:col-span-2 rounded-lg border border-warning-border bg-warning-muted px-4 py-3 text-sm text-warning"
            >
              Submateri dari bagian assessment lama belum dapat dicocokkan. Pilih submateri yang
              benar sebelum menyimpan agar konfigurasi Drill tidak berubah ke topik yang keliru.
            </p>
          ) : null}

          <AdminField label="Subtes / mata pelajaran" className="sm:col-span-2">
            <select
              className={adminInputClass}
              name="subject_code"
              value={subjectCode}
              onChange={(event) => {
                const nextSubjectCode = event.target.value
                const nextSubjectId = subjectByCode.get(nextSubjectCode)?.id
                const nextNode = knowledgeNodes.find((node) => node.subjectId === nextSubjectId)
                setSubjectCode(nextSubjectCode)
                setKnowledgeNodeId(nextNode?.id ?? '')
                const nextCount = Math.min(20, nextNode?.availableQuestionCount || 20)
                setQuestionCount(Math.max(1, nextCount))
                updateAutoTitle(nextSubjectCode, nextNode?.id ?? '')
              }}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.code}>
                  {subject.code} · {subject.name}
                </option>
              ))}
            </select>
          </AdminField>

          {/* Field ini berisi badge + meta tambahan di bawah select, jadi dibungkus
                div (bukan label) agar klik badge tidak memicu select. */}
          <AdminField label="Submateri" as="div">
            <select
              className={adminInputClass}
              aria-label="Submateri"
              name="knowledge_node_id"
              value={selectedNode?.id ?? ''}
              onChange={(event) => {
                const nextNodeId = event.target.value
                const nextNode = nodesForSubject.find((node) => node.id === nextNodeId)
                setKnowledgeNodeId(nextNodeId)
                if (nextNode && questionCount > nextNode.availableQuestionCount) {
                  setQuestionCount(Math.max(1, Math.min(20, nextNode.availableQuestionCount || 1)))
                }
                updateAutoTitle(subjectCode, nextNodeId)
              }}
              required
            >
              {!selectedNode ? <option value="">Pilih submateri</option> : null}
              {nodesForSubject.map((node) => (
                <option key={node.id} value={node.id} disabled={node.availableQuestionCount === 0}>
                  {'— '.repeat(Math.max(0, node.depth))}
                  {node.name} · {node.availableQuestionCount} soal
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AdminBadge variant={selectedNode?.availableQuestionCount ? 'green' : 'red'}>
                {selectedNode?.availableQuestionCount ?? 0} soal tersedia
              </AdminBadge>
              {selectedNode ? (
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedNode.nodeType}
                  {selectedNode.code ? ` · ${selectedNode.code}` : ''}
                </span>
              ) : null}
            </div>
          </AdminField>

          <AdminField
            label="Jumlah soal"
            fieldId="exam-question-count"
            error={
              poolTooSmall
                ? selectedNode
                  ? 'Jumlah soal melebihi soal yang tersedia pada submateri.'
                  : 'Pilih submateri untuk melanjutkan.'
                : undefined
            }
          >
            <input
              id="exam-question-count"
              className={adminInputClass}
              name="question_count"
              type="number"
              min="1"
              max={Math.max(1, selectedNode?.availableQuestionCount ?? 1)}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value) || 1)}
              required
            />
          </AdminField>
        </AdminFormSection>
      ) : null}

      <AdminFormSection
        title="Pengerjaan dan akses peserta"
        description="Atur waktu, jumlah percobaan, urutan soal, dan cara peserta mengakses assessment."
        columns={3}
        showDivider={false}
      >
        <AdminField
          label="Durasi pengerjaan (detik)"
          hint="Masukkan detik. Contoh: 1.800 detik = 30 menit."
        >
          <input
            className={adminInputClass}
            name="duration_seconds"
            type="number"
            min="1"
            required
            defaultValue={editedExam?.duration_seconds ?? (isDrill ? 1200 : '')}
          />
        </AdminField>

        <AdminField label="Batas percobaan" hint="Jumlah kesempatan untuk setiap peserta.">
          <input
            className={adminInputClass}
            name="attempt_limit"
            type="number"
            min="1"
            required
            defaultValue={editedExam?.attempt_limit ?? 1}
          />
        </AdminField>

        <AdminField label="Urutan soal" hint="Acak urutan soal untuk setiap peserta.">
          <select
            className={adminInputClass}
            name="question_order"
            defaultValue={editedExam?.question_order || 'random'}
          >
            <option value="random">Acak</option>
            <option value="fixed">Tetap</option>
          </select>
        </AdminField>
        <div className="sm:col-span-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">Akses peserta</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Tentukan model akses dan biaya token untuk assessment ini.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Model akses" hint="Pilih gratis, freemium, atau premium.">
              <select
                className={adminInputClass}
                name="access_type"
                defaultValue={editedExam?.access_type || 'FREE'}
              >
                <option value="FREE">Gratis</option>
                <option value="FREEMIUM">Freemium</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </AdminField>

            <AdminField
              label="Biaya token"
              hint={
                requiresTkaToken
                  ? 'Assessment TKA SMP yang aktif memakai minimal 1 token per sesi.'
                  : 'Isi 0 jika assessment tidak memakai token.'
              }
            >
              <input
                className={adminInputClass}
                name="token_cost"
                type="number"
                min={requiresTkaToken ? '1' : '0'}
                defaultValue={editedExam?.token_cost ?? 0}
              />
            </AdminField>
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Ketersediaan"
        description="Atur tahap assessment di workspace dan tentukan apakah peserta dapat mengaksesnya."
        columns={2}
        showDivider={false}
      >
        <AdminField
          label="Status assessment"
          hint="Draft belum tersedia bagi peserta. Status aktif mengikuti kesiapan dan aturan akses."
          className="sm:max-w-md"
        >
          <select
            className={adminInputClass}
            name="status"
            defaultValue={editedExam?.status || 'draft'}
          >
            {[
              'draft',
              'ready',
              'active',
              'scheduled',
              ...(editedExam?.status === 'published' ? ['published'] : []),
              ...(editedExam?.status === 'archived' ? ['archived'] : []),
            ].map((status) => (
              <option
                key={status}
                value={status}
                disabled={
                  ['ready', 'active', 'scheduled', 'published'].includes(status) &&
                  !canActivate &&
                  !isDrill &&
                  editedExam?.status !== status
                }
              >
                {adminStatusLabel(status)}
              </option>
            ))}
          </select>
        </AdminField>
      </AdminFormSection>

      <input
        type="hidden"
        name="result_visibility"
        value={editedExam?.result_visibility || 'instant'}
      />

      {editedExam ? (
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            className={adminSecondaryButtonClass}
            onClick={() => {
              setExamTypeCode(editedTypeCode || examTypes[0]?.code || 'FULL_TRYOUT')
              setSubjectCode(initialSubject?.code ?? '')
              setKnowledgeNodeId(initialNode?.id ?? '')
              setQuestionCount(Math.max(1, initialQuestionCount))
              setManualTitle(Boolean(editedExam.title))
              setTitle(editedExam.title)
              setIsEditing(false)
            }}
          >
            Batal
          </button>
          <AdminSubmitButton disabled={poolTooSmall || (isDrill && !selectedNode)}>
            <Save size={16} />
            Simpan perubahan
          </AdminSubmitButton>
        </div>
      ) : (
        <AdminFormActions cancelHref={closeHref}>
          <AdminSubmitButton disabled={poolTooSmall || (isDrill && !selectedNode)}>
            <Save size={16} />
            Simpan assessment
          </AdminSubmitButton>
        </AdminFormActions>
      )}
    </form>
  )

  if (editedExam && !isEditing) {
    const subject = subjects.find(
      (item) => item.id === (drillRule?.subjectId ?? editedSection?.subjectId),
    )
    const questionCountLabel = editedSection?.questionCount ?? drillRule?.questionCount
    const accessLabel =
      {
        FREE: 'Gratis',
        FREEMIUM: 'Freemium',
        PREMIUM: 'Premium',
      }[editedExam.access_type.toUpperCase()] ?? editedExam.access_type

    return (
      <div className="flex w-full flex-col gap-4">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Identitas assessment</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{editedExam.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {adminExamTypeLabel(editedTypeCode)}
              </p>
            </div>
            <button
              type="button"
              className={adminPrimaryButtonClass}
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={16} />
              Edit konfigurasi
            </button>
          </div>
        </section>

        {isDrill ? (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Sumber soal Drill</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Subtes</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {subject ? `${subject.code} · ${subject.name}` : 'Belum dipilih'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Submateri</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {selectedNode?.name ?? editedSection?.title ?? 'Belum dipilih'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Jumlah soal</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {questionCountLabel ?? 'Belum ditentukan'}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Pengerjaan, akses, dan ketersediaan
          </h2>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Durasi</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {editedExam.duration_seconds == null
                  ? 'Tidak dibatasi'
                  : `${Math.ceil(editedExam.duration_seconds / 60)} menit`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Batas percobaan</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {editedExam.attempt_limit ?? 'Tidak dibatasi'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Urutan soal</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {editedExam.question_order === 'random' ? 'Acak' : 'Tetap'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Model akses</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{accessLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Biaya token</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{editedExam.token_cost}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status assessment</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {adminStatusLabel(editedExam.status)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    )
  }

  return form
}
