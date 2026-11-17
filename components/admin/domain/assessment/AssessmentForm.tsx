'use client'

import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import { AdminBadge,AdminField,adminInputClass } from '@/components/admin/AdminUi'
import { AdminFormActions } from '@/components/admin/forms/AdminFormActions'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { adminExamTypeLabel,adminStatusLabel } from '@/lib/admin-format'
import { Save } from 'lucide-react'
import { useMemo,useState } from 'react'

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
  drillRule,
  closeHref,
  returnTo,
  canActivate = false
}: {
  action: (formData: FormData) => void | Promise<void>
  program: string
  track: string
  examTypes: ExamFormType[]
  subjects: ExamFormSubject[]
  knowledgeNodes: ExamFormKnowledgeNode[]
  editedExam?: ExamFormExam
  drillRule: ExamFormDrillRule
  closeHref: string
  returnTo?: string
  canActivate?: boolean
}) {
  const typeById = useMemo(() => new Map(examTypes.map((type) => [type.id, type])), [examTypes])
  const editedTypeCode = editedExam ? (typeById.get(editedExam.exam_type_id)?.code ?? '') : ''
  const [examTypeCode, setExamTypeCode] = useState(
    editedTypeCode || examTypes[0]?.code || 'FULL_TRYOUT'
  )
  const initialSubject =
    subjects.find((subject) => subject.id === drillRule?.subjectId) ?? subjects[0]
  const [subjectCode, setSubjectCode] = useState(initialSubject?.code ?? '')
  const subjectByCode = useMemo(
    () => new Map(subjects.map((subject) => [subject.code, subject])),
    [subjects]
  )
  const subjectId = subjectByCode.get(subjectCode)?.id ?? ''
  const nodesForSubject = useMemo(
    () => knowledgeNodes.filter((node) => node.subjectId === subjectId),
    [knowledgeNodes, subjectId]
  )
  const initialNode =
    nodesForSubject.find((node) => node.id === drillRule?.knowledgeNodeId) ?? nodesForSubject[0]
  const [knowledgeNodeId, setKnowledgeNodeId] = useState(initialNode?.id ?? '')
  const selectedNode =
    nodesForSubject.find((node) => node.id === knowledgeNodeId) ?? nodesForSubject[0]
  const initialQuestionCount =
    drillRule?.questionCount ?? Math.min(20, selectedNode?.availableQuestionCount || 20)
  const [questionCount, setQuestionCount] = useState(Math.max(1, initialQuestionCount))
  const [manualTitle, setManualTitle] = useState(Boolean(editedExam?.title))
  const [title, setTitle] = useState(editedExam?.title ?? '')
  const isDrill = examTypeCode === 'DRILL'
  const poolTooSmall =
    isDrill && selectedNode ? questionCount > selectedNode.availableQuestionCount : isDrill

  function updateAutoTitle(nextSubjectCode: string, nextNodeId: string) {
    if (manualTitle) return
    const subject = subjectByCode.get(nextSubjectCode)
    const node = knowledgeNodes.find((item) => item.id === nextNodeId)
    setTitle(generatedDrillTitle(subject, node))
  }

  const form = (
    <form action={action} data-admin-form className="flex w-full max-w-4xl flex-col gap-6">
      <input type="hidden" name="return_to" value={returnTo || closeHref} />
      <input type="hidden" name="program_code" value={program} />
      <input type="hidden" name="track_code" value={track} />
      {editedExam ? <input type="hidden" name="id" value={editedExam.id} /> : null}

      <AdminFormSection
        title="Informasi dasar"
        description="Tipe assessment menentukan pola pengerjaan dan tidak dapat diubah setelah dibuat."
      >
        <AdminField label="Jenis assessment">
          {editedExam ? (
            <>
              <input type="hidden" name="exam_type_code" value={examTypeCode} />
              <div className="flex min-h-11 items-center rounded-lg border border-border bg-muted px-3 text-sm font-medium text-foreground">
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
        >
          <div className="sm:col-span-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Drill mengambil soal dari satu submateri. Bagian assessment dibuat otomatis.
          </div>

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
              poolTooSmall ? 'Jumlah soal melebihi soal yang tersedia pada submateri.' : undefined
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
        title="Aturan pengerjaan"
        description="Atur durasi dan cara assessment dikerjakan peserta."
        columns={3}
      >
        <AdminField label="Durasi (detik)" hint="Contoh: 1200 detik sama dengan 20 menit.">
          <input
            className={adminInputClass}
            name="duration_seconds"
            type="number"
            min="1"
            required
            defaultValue={editedExam?.duration_seconds ?? (isDrill ? 1200 : '')}
          />
        </AdminField>

        <AdminField label="Batas percobaan" hint="Berapa kali peserta boleh mengerjakan.">
          <input
            className={adminInputClass}
            name="attempt_limit"
            type="number"
            min="1"
            required
            defaultValue={editedExam?.attempt_limit ?? 1}
          />
        </AdminField>

        <AdminField label="Urutan soal" hint="Acak soal untuk tiap peserta.">
          <select
            className={adminInputClass}
            name="question_order"
            defaultValue={editedExam?.question_order || 'random'}
          >
            <option value="random">Acak</option>
            <option value="fixed">Tetap</option>
          </select>
        </AdminField>
      </AdminFormSection>

      <AdminFormSection
        title="Akses peserta"
        description="Pilih model akses dan biaya token yang diperlukan."
      >
        <AdminField label="Akses" hint="Gratis, Freemium, atau Premium.">
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

        <AdminField label="Biaya token" hint="Isi 0 jika assessment tidak memakai token.">
          <input
            className={adminInputClass}
            name="token_cost"
            type="number"
            min="0"
            defaultValue={editedExam?.token_cost ?? 0}
          />
        </AdminField>
      </AdminFormSection>

      <AdminFormSection
        title="Status"
        description="Tentukan apakah assessment masih disiapkan atau sudah tersedia untuk peserta."
        columns={1}
      >
        <AdminField
          label="Ketersediaan"
          hint="Draft belum tersedia bagi peserta. Status lain mengikuti readiness dan aturan akses."
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
              ...(editedExam?.status === 'archived' ? ['archived'] : [])
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

      <AdminFormActions cancelHref={closeHref}>
        <AdminSubmitButton disabled={poolTooSmall || (isDrill && !selectedNode)}>
          <Save size={16} />
          {editedExam ? 'Simpan perubahan' : 'Simpan assessment'}
        </AdminSubmitButton>
      </AdminFormActions>
    </form>
  )
  return form
}
