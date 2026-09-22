'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Save } from 'lucide-react'
import AdminModal from '@/components/admin/AdminModal'
import {
  AdminBadge,
  AdminField,
  adminInputClass,
  adminPrimaryButtonClass,
} from '@/components/admin/AdminUi'
import { adminExamTypeLabel, adminStatusLabel } from '@/lib/admin-format'

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

/** Group field form di dalam modal — memecah mega-form menjadi section yang dapat dipindai. */
function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</legend>
      {description ? <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p> : null}
      <div className="mt-3 grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function generatedDrillTitle(subject?: ExamFormSubject, node?: ExamFormKnowledgeNode) {
  if (!subject || !node) return ''
  return `Drill ${subject.code} · ${node.name}`
}

export default function AdminExamFormModal({
  action,
  program,
  track,
  examTypes,
  subjects,
  knowledgeNodes,
  editedExam,
  drillRule,
  closeHref,
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
}) {
  const typeById = useMemo(() => new Map(examTypes.map((type) => [type.id, type])), [examTypes])
  const editedTypeCode = editedExam ? typeById.get(editedExam.exam_type_id)?.code ?? '' : ''
  const [examTypeCode, setExamTypeCode] = useState(editedTypeCode || examTypes[0]?.code || 'FULL_TRYOUT')
  const initialSubject = subjects.find((subject) => subject.id === drillRule?.subjectId) ?? subjects[0]
  const [subjectCode, setSubjectCode] = useState(initialSubject?.code ?? '')
  const subjectByCode = useMemo(() => new Map(subjects.map((subject) => [subject.code, subject])), [subjects])
  const subjectId = subjectByCode.get(subjectCode)?.id ?? ''
  const nodesForSubject = useMemo(
    () => knowledgeNodes.filter((node) => node.subjectId === subjectId),
    [knowledgeNodes, subjectId],
  )
  const initialNode = nodesForSubject.find((node) => node.id === drillRule?.knowledgeNodeId) ?? nodesForSubject[0]
  const [knowledgeNodeId, setKnowledgeNodeId] = useState(initialNode?.id ?? '')
  const selectedNode = nodesForSubject.find((node) => node.id === knowledgeNodeId) ?? nodesForSubject[0]
  const initialQuestionCount = drillRule?.questionCount ?? Math.min(20, selectedNode?.availableQuestionCount || 20)
  const [questionCount, setQuestionCount] = useState(Math.max(1, initialQuestionCount))
  const [manualTitle, setManualTitle] = useState(Boolean(editedExam?.title))
  const [title, setTitle] = useState(editedExam?.title ?? '')
  const isDrill = examTypeCode === 'DRILL'
  const poolTooSmall = isDrill && selectedNode ? questionCount > selectedNode.availableQuestionCount : isDrill

  function updateAutoTitle(nextSubjectCode: string, nextNodeId: string) {
    if (manualTitle) return
    const subject = subjectByCode.get(nextSubjectCode)
    const node = knowledgeNodes.find((item) => item.id === nextNodeId)
    setTitle(generatedDrillTitle(subject, node))
  }

  return (
    <AdminModal
      title={editedExam ? 'Ubah ujian' : 'Buat ujian'}
      description={isDrill ? 'Latihan materi digunakan untuk mendalami satu submateri. Soal dibatasi oleh materi yang dipilih.' : 'Konfigurasi ujian untuk konteks aktif.'}
      triggerLabel="Buat ujian"
      defaultOpen={Boolean(editedExam)}
      closeHref={closeHref}
      size="xl"
    >
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="program_code" value={program}/>
        <input type="hidden" name="track_code" value={track}/>
        {editedExam ? <input type="hidden" name="id" value={editedExam.id}/> : null}

        <FormSection title="Identitas" description="Tipe ujian menentukan bentuk pengerjaan dan tidak dapat diubah setelah ujian dibuat.">
          <AdminField label="Tipe ujian">
            {editedExam ? (
              <>
                <input type="hidden" name="exam_type_code" value={examTypeCode}/>
                <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
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
                {examTypes.map((type) => <option key={type.id} value={type.code}>{adminExamTypeLabel(type.code)}</option>)}
              </select>
            )}
          </AdminField>

          <AdminField label="Status" hint="Draf tidak terlihat peserta; Aktif langsung ditawarkan.">
            <select className={adminInputClass} name="status" defaultValue={editedExam?.status || 'draft'}>
              {['draft', 'active', 'scheduled', 'archived'].map((status) => <option key={status} value={status}>{adminStatusLabel(status)}</option>)}
            </select>
          </AdminField>

          <AdminField label="Judul" className="md:col-span-2">
            <input
              className={adminInputClass}
              name="title"
              required
              value={title}
              onChange={(event) => {
                setManualTitle(true)
                setTitle(event.target.value)
              }}
              placeholder={isDrill ? generatedDrillTitle(subjectByCode.get(subjectCode), selectedNode) : 'Judul ujian'}
            />
          </AdminField>

          <AdminField label="Slug" hint="Kosongkan untuk dibuat otomatis dari judul." className="md:col-span-2">
            <input className={adminInputClass} name="slug" defaultValue={editedExam?.slug || ''} placeholder="judul-exam"/>
          </AdminField>
        </FormSection>

        {isDrill ? (
        <FormSection title="Fokus latihan" description="Latihan mengambil soal dari satu submateri; cetak biru dan bagian internal dibuat otomatis.">
            <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><BookOpen size={18}/></div>
                <div>
                  <div className="font-extrabold text-blue-950">Drill = pendalaman submateri</div>
                  <p className="mt-1 text-sm font-medium leading-6 text-blue-800">Pilih subtes seperti TWK/TIU/TKP, lalu pilih submaterinya. Sistem membuat satu cetak biru dan satu bagian internal secara otomatis.</p>
                </div>
              </div>
            </div>

            <AdminField label="Subtes">
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
                {subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}
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
                    {'— '.repeat(Math.max(0, node.depth))}{node.name} · {node.availableQuestionCount} soal
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <AdminBadge variant={selectedNode?.availableQuestionCount ? 'green' : 'red'}>{selectedNode?.availableQuestionCount ?? 0} soal tersedia</AdminBadge>
                {selectedNode ? <span className="text-xs font-semibold text-slate-500">{selectedNode.nodeType}{selectedNode.code ? ` · ${selectedNode.code}` : ''}</span> : null}
              </div>
            </AdminField>

            <AdminField
              label="Jumlah soal Drill"
              fieldId="exam-question-count"
              error={poolTooSmall ? 'Jumlah soal melebihi soal yang tersedia pada submateri.' : undefined}
            >
              <input
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
          </FormSection>
        ) : null}

        <FormSection title="Pengerjaan" description="Aturan dasar saat peserta mengerjakan ujian ini.">
          <AdminField label="Durasi (detik)" hint="1200 detik = 20 menit.">
            <input className={adminInputClass} name="duration_seconds" type="number" min="1" required defaultValue={editedExam?.duration_seconds ?? (isDrill ? 1200 : '')}/>
          </AdminField>

          <AdminField label="Batas percobaan" hint="Berapa kali peserta boleh mengerjakan.">
            <input className={adminInputClass} name="attempt_limit" type="number" min="1" required defaultValue={editedExam?.attempt_limit ?? 1}/>
          </AdminField>

          <AdminField label="Urutan soal">
            <select className={adminInputClass} name="question_order" defaultValue={editedExam?.question_order || 'random'}>
              <option value="random">Acak</option>
              <option value="fixed">Tetap</option>
            </select>
          </AdminField>
        </FormSection>

        <FormSection title="Akses & token" description="Token hanya ditarik untuk akses berbayar; biarkan 0 untuk akses gratis.">
          <AdminField label="Akses">
            <select className={adminInputClass} name="access_type" defaultValue={editedExam?.access_type || 'FREE'}>
              <option value="FREE">Gratis</option>
              <option value="FREEMIUM">Freemium</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </AdminField>

          <AdminField label="Biaya token" hint="0 untuk akses gratis.">
            <input className={adminInputClass} name="token_cost" type="number" min="0" defaultValue={editedExam?.token_cost ?? 0}/>
          </AdminField>
        </FormSection>

        <input type="hidden" name="result_visibility" value={editedExam?.result_visibility || 'instant'}/>

        <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4">
          <button className={adminPrimaryButtonClass} disabled={poolTooSmall || (isDrill && !selectedNode)}>
            <Save size={16}/>{editedExam ? 'Simpan perubahan' : 'Simpan ujian'}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
