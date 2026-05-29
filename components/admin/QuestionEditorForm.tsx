'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/utils/supabase/client'
import { createQuestion, updateQuestion } from '@/app/actions/admin'
import { AlertCircle, ArrowLeft, ImageIcon, Info, Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ADMIN_BASE_PATH, OPTION_LABELS, QUESTION_TYPES, type CategoryMap, type OptionLabel, type QuestionType } from '@/lib/admin-dashboard'
import PaperBackground from '@/components/PaperBackground'

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

type ImageState = {
    file: File | null
    preview: string | null
    removed: boolean
}

function createOptionImageState(question?: EditableQuestion): Record<OptionLabel, ImageState> {
    return {
        A: { file: null, preview: question?.options?.[0]?.image_url || null, removed: false },
        B: { file: null, preview: question?.options?.[1]?.image_url || null, removed: false },
        C: { file: null, preview: question?.options?.[2]?.image_url || null, removed: false },
        D: { file: null, preview: question?.options?.[3]?.image_url || null, removed: false },
        E: { file: null, preview: question?.options?.[4]?.image_url || null, removed: false },
    }
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

async function uploadImage(supabase: ReturnType<typeof createClient>, file: File, prefix: string) {
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

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
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(question?.image_url || null)
    const [isImageRemoved, setIsImageRemoved] = useState(false)
    const [optionImages, setOptionImages] = useState<Record<OptionLabel, ImageState>>(() => createOptionImageState(question))

    const categoryOptions = categoryMap[type] || []
    const initialCorrectLabel = getInitialCorrectLabel(question)
    const isEditMode = mode === 'edit'

    const setOptionImage = (label: OptionLabel, nextState: ImageState) => {
        setOptionImages((current) => ({
            ...current,
            [label]: nextState,
        }))
    }

    const handleTypeChange = (nextType: QuestionType) => {
        setType(nextType)
        setSelectedCategory('')
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
            const supabase = createClient()

            for (const label of OPTION_LABELS) {
                const textValue = String(formData.get(`option_${label.toLowerCase()}`) || '').trim()
                const hasImage = Boolean(optionImages[label].file || (optionImages[label].preview && !optionImages[label].removed))

                if (!textValue && !hasImage) {
                    toast.error(`Pilihan ${label} harus punya teks atau gambar`)
                    setLoading(false)
                    return
                }

                if (type === 'TKP') {
                    const scoreValue = Number(formData.get(`score_${label.toLowerCase()}`) || 0)
                    if (!Number.isInteger(scoreValue) || scoreValue < 1 || scoreValue > 5) {
                        toast.error(`Poin pilihan ${label} harus 1 sampai 5`)
                        setLoading(false)
                        return
                    }
                }
            }

            if (isImageRemoved && !imageFile) {
                formData.set('image_url', '')
            } else if (imageFile) {
                const imageUrl = await uploadImage(supabase, imageFile, 'question')
                formData.set('image_url', imageUrl)
            } else if (question?.image_url) {
                formData.set('image_url', question.image_url)
            }

            for (const label of OPTION_LABELS) {
                const optionImage = optionImages[label]
                if (optionImage.file) {
                    const optionImageUrl = await uploadImage(
                        supabase,
                        optionImage.file,
                        `option-${label.toLowerCase()}`
                    )
                    formData.set(`option_${label.toLowerCase()}_image_url`, optionImageUrl)
                    continue
                }

                formData.set(
                    `option_${label.toLowerCase()}_image_url`,
                    optionImage.preview && !optionImage.removed ? optionImage.preview : ''
                )
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
                    <h1 className="font-handwriting text-4xl font-black text-gray-900">
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
                                Tulis rumus dengan format <code>$rumus$</code> atau <code>$$rumus$$</code>.
                                {isEditMode && question ? (
                                    <> Kode soal: <code>{question.question_code || question.id}</code></>
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
                            <textarea
                                name="content"
                                required
                                rows={6}
                                defaultValue={question?.content || ''}
                                className="w-full resize-none rounded-md border-2 border-gray-300 bg-white p-5 text-base font-medium leading-relaxed text-gray-900 outline-none transition focus:border-gray-900 sm:text-lg"
                                placeholder="Tulis pertanyaan utama di sini..."
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                Gambar Soal
                            </label>
                            {imagePreview ? (
                                <div className="relative inline-block max-w-sm border-2 border-gray-900 bg-gray-50 p-2">
                                    <Image
                                        src={imagePreview}
                                        alt="Preview soal"
                                        width={480}
                                        height={320}
                                        unoptimized
                                        className="max-h-48 w-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null)
                                            setImagePreview(null)
                                            setIsImageRemoved(true)
                                        }}
                                        className="absolute -right-3 -top-3 border-2 border-gray-900 bg-gray-900 p-1.5 text-white transition hover:bg-gray-800"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative flex max-w-sm cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-white px-6 py-8 text-center transition hover:bg-gray-100">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0]
                                            if (!file) {
                                                return
                                            }

                                            if (file.size > 2 * 1024 * 1024) {
                                                toast.error('Ukuran gambar maksimal 2MB')
                                                return
                                            }

                                            setImageFile(file)
                                            setImagePreview(URL.createObjectURL(file))
                                            setIsImageRemoved(false)
                                        }}
                                    />
                                    <div className="mb-4 border-2 border-gray-900 bg-gray-100 p-3 text-gray-900">
                                        <ImageIcon size={24} />
                                    </div>
                                    <p className="font-bold text-gray-900">Upload gambar pendukung</p>
                                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, JPEG sampai 2MB</p>
                                </div>
                            )}
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
                                                <textarea
                                                    name={`option_${label.toLowerCase()}`}
                                                    rows={2}
                                                    defaultValue={question?.options?.[index]?.content || ''}
                                                    className="w-full rounded-md border-2 border-gray-300 bg-white p-4 font-medium text-gray-800 outline-none transition focus:border-gray-900"
                                                    placeholder={`Isi pilihan ${label}, atau kosongkan jika memakai gambar`}
                                                />

                                                {optionImages[label].preview ? (
                                                    <div className="relative inline-block max-w-xs border-2 border-gray-900 bg-gray-50 p-2">
                                                        <Image
                                                            src={optionImages[label].preview || ''}
                                                            alt={`Preview pilihan ${label}`}
                                                            width={320}
                                                            height={220}
                                                            unoptimized
                                                            className="max-h-40 w-full object-contain"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setOptionImage(label, { file: null, preview: null, removed: true })}
                                                            className="absolute -right-3 -top-3 border-2 border-gray-900 bg-gray-900 p-1.5 text-white transition hover:bg-gray-800"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative flex max-w-xs cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-white px-4 py-5 text-center transition hover:bg-gray-100">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 cursor-pointer opacity-0"
                                                            onChange={(event) => {
                                                                const file = event.target.files?.[0]
                                                                if (!file) {
                                                                    return
                                                                }

                                                                if (file.size > 2 * 1024 * 1024) {
                                                                    toast.error(`Ukuran gambar pilihan ${label} maksimal 2MB`)
                                                                    return
                                                                }

                                                                setOptionImage(label, {
                                                                    file,
                                                                    preview: URL.createObjectURL(file),
                                                                    removed: false,
                                                                })
                                                            }}
                                                        />
                                                        <div className="mb-3 border-2 border-gray-900 bg-gray-100 p-2 text-gray-900">
                                                            <ImageIcon size={18} />
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            Upload gambar pilihan {label}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">Opsional, maksimal 2MB</p>
                                                    </div>
                                                )}

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
                            <textarea
                                name="explanation"
                                required
                                rows={6}
                                defaultValue={question?.explanation || ''}
                                className="w-full resize-none rounded-md border-2 border-gray-300 bg-gray-50 p-5 font-medium leading-relaxed text-gray-800 outline-none transition focus:border-gray-900 focus:bg-white"
                                placeholder="Jelaskan alasan jawaban atau pendekatan penyelesaian..."
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
