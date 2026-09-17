'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, Square, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteQuestionsBulk } from '@/app/actions/admin'
import QuestionCard, { type Question } from '@/components/admin/QuestionCard'
import { cn } from '@/lib/utils'

interface QuestionBulkActionsProps {
    questions: Question[]
    currentAdminHref: string
}

export default function QuestionBulkActions({
    questions,
    currentAdminHref,
}: QuestionBulkActionsProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const questionIds = useMemo(() => questions.map((question) => question.id), [questions])
    const selectedCount = selectedIds.length
    const allSelected = questionIds.length > 0 && selectedCount === questionIds.length

    const toggleSelected = (questionId: string) => {
        setSelectedIds((current) =>
            current.includes(questionId)
                ? current.filter((id) => id !== questionId)
                : [...current, questionId]
        )
    }

    const toggleAll = () => {
        setSelectedIds(allSelected ? [] : questionIds)
    }

    const handleBulkDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteQuestionsBulk(selectedIds)
            if (result.success) {
                toast.success(result.message)
                setSelectedIds([])
                setShowConfirm(false)
            } else {
                toast.error(result.message)
            }
        } catch {
            toast.error('Gagal menghapus soal terpilih')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <div className="sticky top-3 z-20 flex flex-col gap-3 border-2 border-gray-900 bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100"
                    >
                        {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        {allSelected ? 'Batalkan pilih halaman' : 'Pilih semua halaman'}
                    </button>
                    <span className="text-sm font-bold text-gray-600">
                        {selectedCount} dari {questions.length} soal dipilih
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {selectedCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100"
                        >
                            <X size={16} />
                            Bersihkan
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        disabled={selectedCount === 0 || isDeleting}
                        className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Hapus Terpilih
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {questions.map((question) => {
                    const isSelected = selectedIds.includes(question.id)
                    return (
                        <div
                            key={question.id}
                            className={cn(
                                'grid gap-2',
                                isSelected && 'outline outline-4 outline-gray-900'
                            )}
                        >
                            <label className="flex cursor-pointer items-center gap-2 border-2 border-gray-900 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-900">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelected(question.id)}
                                    className="h-4 w-4 accent-gray-900"
                                />
                                Pilih soal {question.question_code || question.id}
                            </label>
                            <QuestionCard
                                q={question}
                                editHref={`/cpns/admin/edit/${question.id}?returnTo=${encodeURIComponent(currentAdminHref)}`}
                            />
                        </div>
                    )
                })}
            </div>

            {showConfirm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md border-2 border-gray-900 bg-white p-6 st-shadow-lg">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center border-2 border-gray-900 bg-gray-100">
                            <Trash2 className="h-7 w-7 text-gray-900" />
                        </div>
                        <h3 className="font-display text-3xl font-black text-gray-900">
                            Hapus {selectedCount} soal?
                        </h3>
                        <p className="mt-2 text-sm font-medium text-gray-600">
                            Tindakan ini permanen. Jawaban peserta yang terkait dengan soal ini juga akan dibersihkan agar database tetap konsisten.
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                disabled={isDeleting}
                                className="rounded-md border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 transition hover:bg-gray-100 disabled:opacity-60"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
