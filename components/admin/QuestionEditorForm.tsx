'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/utils/supabase/client'
import { createQuestion, updateQuestion } from '@/app/actions/admin'
import { AlertCircle, ArrowLeft, Info, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ADMIN_BASE_PATH, OPTION_LABELS, QUESTION_TYPES, type CategoryMap, type OptionLabel, type QuestionType } from '@/lib/admin-dashboard'
import PaperBackground from '@/components/PaperBackground'
import QuestionBlockEditor from '@/components/admin/QuestionBlockEditor'
import {
    legacyQuestionToBlocks,
    serializeQuestionBlocks,
    type QuestionContentBlock,
} from '@/lib/admin-question-blocks'

interface QuestionOption {
    id: string
    content: string
    image_url?: string | null
    is_correct: boolean
    score_value: number
}

export interface EditableQuestion {
    id: string
    question_code?: string
    type: QuestionType
    category: string | null
    content: string
    explanation: string | null
    image_url?: string | null
    options: QuestionOption[]
}

interface QuestionEditorFormProps {
    categoryMap: CategoryMap
    mode: 'create' | 'edit'
    question?: EditableQuestion
    returnHref?: string
}

function getInitialCorrectLabel(question?: EditableQuestion): OptionLabel {
    if (!question?.options?.length) {
        return 'A'
    }

    const explicitCorrect = question.options.find((option) => option.is_correct)
    if (explicitCorrect) {
        return OPTION_LABELS[question.options.indexOf(explicitCorrect)] || 'A'
    }

    const bestScored = [...question.options].sort((left, right) => right.score_value - left.score_value)[0]
    return OPTION_LABELS[question.options.indexOf(bestScored)] || 'A'
}

function createInitialOptionBlocks(question?: EditableQuestion): Record<OptionLabel, QuestionContentBlock[]> {
    return {
        A: legacyQuestionToBlocks(question?.options?.[0]?.content, question?.options?.[0]?.image_url),
        B: legacyQuestionToBlocks(question?.options?.[1]?.content, question?.options?.[1]?.image_url),
        C: legacyQuestionToBlocks(question?.options?.[2]?.content, question?.options?.[2]?.image_url),
        D: legacyQuestionToBlocks(question?.options?.[3]?.content, question?.options?.[3]?.image_url),
        E: legacyQuestionToBlocks(question?.options?.[4]?.content, question?.options?.[4]?.image_url),
    }
}

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function uploadImage(supabase: ReturnType<typeof createClient>, file: File, prefix: string) {
    if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
        throw new Error('Ukuran gambar maksimal 2MB')
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error('Format gambar harus JPG, PNG, WebP, atau GIF')
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(fileName, file)

    if (uploadError) {
        throw new Error(uploadError.message)
    }

    const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(fileName)

    return data.publicUrl
}

export default function QuestionEditorForm({
    categoryMap,
    mode,
    question,
    returnHref = ADMIN_BASE_PATH,
}: QuestionEditorFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState<QuestionType>(question?.type || 'TWK')
    const [selectedCategory, setSelectedCategory] = useState(question?.category || '')
    const [contentBlocks, setContentBlocks] = useState<QuestionContentBlock[]>(() => legacyQuestionToBlocks(question?.content, question?.image_url))
    const [explanationBlocks, setExplanationBlocks] = useState<QuestionContentBlock[]>(() => legacyQuestionToBlocks(question?.explanation, null))
    const [optionBlocks, setOptionBlocks] = useState<Record<OptionLabel, QuestionContentBlock[]>>(() => createInitialOptionBlocks(question))

    const categoryOptions = categoryMap[type] || []
    const initialCorrectLabel = getInitialCorrectLabel(question)
    const isEditMode = mode === 'edit'

    const handleTypeChange = (nextType: QuestionType) => {
        setType(nextType)
        setSelectedCategory('')
    }

    const handleUploadBlockImage = async (file: File, prefix: string) => {
        const supabase = createClient()
        return uploadImage(supabase, file, prefix)
    }

    const setOptionBlockList = (label: OptionLabel, blocks: QuestionContentBlock[]) => {
        setOptionBlocks(current => ({
            ...current,
            [label]: blocks,
        }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        formData.set('type', type)

        if (!selectedCategory) {
            toast.error('Pilih materi terlebih dahulu')
            setLoading(false)
            return
        }

        try {
            const serializedContent = serializeQuestionBlocks(contentBlocks)
            const serializedExplanation = serializeQuestionBlocks(explanationBlocks)

            if (!serializedContent.trim()) {
                toast.error('Narasi pertanyaan tidak boleh kosong')
                setLoading(false)
                return
            }

            if (!serializedExplanation.trim()) {
                toast.error('Pembahasan tidak boleh kosong')
                setLoading(false)
                return
            }

            formData.set('content', serializedContent)
            formData.set('explanation', serializedExplanation)
            formData.set('image_url', '')

            for (const label of OPTION_LABELS) {
                const optionContent = serializeQuestionBlocks(optionBlocks[label])

                if (!optionContent.trim()) {
                    toast.error(`Pilihan ${label} harus punya isi block`)
                    setLoading(false)
                    return
                }

                formData.set(`option_${label.toLowerCase()}`, optionContent)
                formData.set(`option_${label.toLowerCase()}_image_url`, '')

                if (type === 'TKP') {
                    const scoreValue = Number(formData.get(`score_${label.toLowerCase()}`) || 0)
                    if (!Number.isInteger(scoreValue) || scoreValue < 1 || scoreValue > 5) {
                        toast.error(`Poin pilihan ${label} harus 1 sampai 5`)
                        setLoading(false)
                        return
                    }
                }
            }

            const result = isEditMode && question
                ? await updateQuestion(question.id, formData)
                : await createQuestion(formData)

            if (!result.success) {
                toast.error(result.message)
                return
            }

            toast.success(result.message)
            router.push(returnHref)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(isEditMode ? 'Gagal mengupdate soal' : 'Gagal membuat soal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full pb-10">
            <Link
                href={returnHref}
                className="inline-flex items-center rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
            >
                <ArrowLeft size={18} className="mr-2" />
                Kembali ke dashboard admin
            </Link>

            <div className="relative mt-6 overflow-hidden border-2 border-gray-900 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <PaperBackground />
                <div className="relative z-10 border-b-2 border-gray-900 bg-gray-100/90 px-6 py-5 sm:px-8">
                    <h1 className="font-display text-4xl font-black text-gray-900">
                        {isEditMode ? 'Edit Soal' : 'Buat Soal Baru'}
                    </h1>
                    <p className="mt-1 text-sm font-medium text-gray-600">
                        {isEditMode
                            ? 'Perbarui soal tanpa mengubah struktur form admin.'
                            : 'Gunakan struktur yang sama untuk semua soal agar bank soal tetap konsisten.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="relative z-10 divide-y-2 divide-gray-200">
                    <div className="mx-4 mt-4 flex gap-3 border-2 border-gray-900 bg-gray-100 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:mx-8">
                        <Info className="mt-0.5 shrink-0 text-gray-900" size={18} />
                        <div className="space-y-1 text-sm">
                            <p className="font-bold text-gray-900">
                                {isEditMode ? 'Mode edit aktif' : 'Mode tambah soal'}
                            </p>
                            <p className="text-gray-700">
                                Susun soal dengan block teks, gambar, matematika, dan jarak. Gunakan block matematika untuk rumus agar tampil rapi di tryout.
                                {isEditMode && question ? (
                                    <> Kode soal: <code>{question.question_code || question.id}</code>.</>
                                ) : null}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8 p-5 sm:p-8">
                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                    Tipe Soal
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {QUESTION_TYPES.map((questionType) => (
                                        <button
                                            key={questionType}
                                            type="button"
                                            onClick={() => handleTypeChange(questionType)}
                                            className={cn(
                                                'rounded-md border-2 px-4 py-3 text-sm font-bold transition',
                                                type === questionType
                                                    ? 'border-gray-900 bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]'
                                                    : 'border-gray-900 bg-white text-gray-700 hover:bg-gray-100'
                                            )}
                                        >
                                            {questionType}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                    Materi
                                </label>
                                <select
                                    name="category"
                                    required
                                    value={selectedCategory}
                                    onChange={(event) => setSelectedCategory(event.target.value)}
                                    className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                >
                                    <option value="" disabled>
                                        {categoryOptions.length > 0 ? 'Pilih materi...' : 'Belum ada materi'}
                                    </option>
                                    {selectedCategory && !categoryOptions.includes(selectedCategory) ? (
                                        <option value={selectedCategory}>{selectedCategory} (tersimpan)</option>
                                    ) : null}
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                {categoryOptions.length === 0 ? (
                                    <p className="text-xs font-bold text-gray-600">
                                        Tambahkan materi di halaman konfigurasi tryout sebelum membuat soal baru.
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                Narasi Pertanyaan
                            </label>
                            <QuestionBlockEditor
                                blocks={contentBlocks}
                                onChange={setContentBlocks}
                                onUploadImage={handleUploadBlockImage}
                                uploadPrefix="question"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                    Pilihan Jawaban
                                </label>
                                <span className="text-xs font-medium text-gray-500">
                                    {type === 'TKP'
                                        ? 'Pilih opsi terbaik, lalu isi bobot poin tiap opsi.'
                                        : 'Pilih satu jawaban yang benar.'}
                                </span>
                            </div>

                            <div className="grid gap-4">
                                {OPTION_LABELS.map((label, index) => (
                                    <div key={label} className="flex flex-col gap-4 border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                                        <div className="flex items-start gap-4">
                                            <div className="pt-1">
                                                <input
                                                    type="radio"
                                                    name="correct_answer"
                                                    value={label}
                                                    id={`correct-answer-${label}`}
                                                    required
                                                    defaultChecked={initialCorrectLabel === label}
                                                    className="peer sr-only"
                                                />
                                                <label
                                                    htmlFor={`correct-answer-${label}`}
                                                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-2 border-gray-900 bg-white font-bold text-gray-600 transition peer-checked:bg-gray-900 peer-checked:text-white"
                                                >
                                                    {label}
                                                </label>
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                <QuestionBlockEditor
                                                    blocks={optionBlocks[label]}
                                                    onChange={(blocks) => setOptionBlockList(label, blocks)}
                                                    onUploadImage={handleUploadBlockImage}
                                                    uploadPrefix={`option-${label.toLowerCase()}`}
                                                />

                                                {type === 'TKP' ? (
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                                            Poin
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name={`score_${label.toLowerCase()}`}
                                                            min="1"
                                                            max="5"
                                                            required
                                                            defaultValue={question?.options?.[index]?.score_value || 1}
                                                            className="w-20 rounded-md border-2 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800 outline-none transition focus:border-gray-900"
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {type === 'TKP' ? (
                                <div className="flex gap-3 border-2 border-gray-900 bg-gray-100 p-4">
                                    <AlertCircle className="mt-0.5 shrink-0 text-gray-900" size={18} />
                                    <p className="text-sm font-medium text-gray-800">
                                        Soal TKP tetap butuh satu opsi terbaik untuk tampilan review admin, tetapi
                                        penilaian mengikuti poin 1 sampai 5 yang Anda isi.
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                Pembahasan
                            </label>
                            <QuestionBlockEditor
                                blocks={explanationBlocks}
                                onChange={setExplanationBlocks}
                                onUploadImage={handleUploadBlockImage}
                                uploadPrefix="explanation"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t-2 border-gray-900 bg-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                        <button
                            type="button"
                            onClick={() => router.push(returnHref)}
                            className="rounded-md px-4 py-3 text-sm font-bold text-gray-600 transition hover:text-gray-900"
                        >
                            Batalkan
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-6 py-3 font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {isEditMode ? 'Simpan Perubahan' : 'Simpan Soal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
