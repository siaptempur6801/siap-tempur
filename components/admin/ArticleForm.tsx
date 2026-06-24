'use client'

import { useActionState, useState, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/utils/supabase/client'
import { toast } from 'sonner'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import type { ArticleActionState } from '@/app/actions/articles'
import ArticleRichTextEditor from './ArticleRichTextEditor'

type ArticleFormValues = {
    title?: string | null
    slug?: string | null
    excerpt?: string | null
    content?: string | null
    category?: string | null
    cover_image_url?: string | null
}

interface ArticleFormProps {
    title: string
    action: (prevState: ArticleActionState, formData: FormData) => Promise<ArticleActionState>
    defaultValues?: ArticleFormValues
}

const initialState: ArticleActionState = { success: false, message: '' }

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-2.5 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 disabled:opacity-50"
        >
            {pending ? 'Menyimpan...' : 'Simpan Draft'}
        </button>
    )
}

export default function ArticleForm({ title, action, defaultValues }: ArticleFormProps) {
    const [state, formAction] = useActionState(action, initialState)
    const [articleTitle, setArticleTitle] = useState(defaultValues?.title || '')
    const [slug, setSlug] = useState(defaultValues?.slug || '')
    const [category, setCategory] = useState(defaultValues?.category || '')
    const [excerpt, setExcerpt] = useState(defaultValues?.excerpt || '')
    const [content, setContent] = useState(defaultValues?.content || '')
    const [coverImageUrl, setCoverImageUrl] = useState(defaultValues?.cover_image_url || '')
    const [isUploadingCover, setIsUploadingCover] = useState(false)
    const coverInputRef = useRef<HTMLInputElement>(null)

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const MAX_IMAGE_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024
        if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
            toast.error('Ukuran gambar maksimal 2MB')
            return
        }

        const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            toast.error('Format gambar harus JPG, PNG, WebP, atau GIF')
            return
        }

        try {
            setIsUploadingCover(true)
            const supabase = createClient()
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error('Sesi login tidak valid')

            const fileExt = file.name.split('.').pop() || 'png'
            const fileName = `articles/${user.id}/cover-${Date.now()}-${crypto.randomUUID()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(fileName, file)

            if (uploadError) throw new Error(uploadError.message)

            const { data } = supabase.storage
                .from('question-images')
                .getPublicUrl(fileName)

            setCoverImageUrl(data.publicUrl)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal mengupload cover')
        } finally {
            setIsUploadingCover(false)
            if (coverInputRef.current) {
                coverInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Artikel</p>
                    <h1 className="font-handwriting text-4xl font-black text-gray-900">{title}</h1>
                </div>
                <Link
                    href="/cpns/admin/articles"
                    className="w-fit rounded-md border-2 border-gray-900 bg-white px-4 py-2 font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
                >
                    Kembali
                </Link>
            </div>

            <form action={formAction} className="space-y-5 border-2 border-gray-900 bg-white p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:p-8">
                {state.message && (
                    <div className="rounded-md border-2 border-red-700 bg-red-50 px-4 py-3 font-bold text-red-700">
                        {state.message}
                    </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                        <span className="text-sm font-black text-gray-700">Judul</span>
                        <input
                            name="title"
                            value={articleTitle}
                            onChange={(event) => setArticleTitle(event.target.value)}
                            required
                            minLength={3}
                            maxLength={160}
                            className="w-full rounded-md border-2 border-gray-900 px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-black text-gray-700">Slug</span>
                        <input
                            name="slug"
                            value={slug}
                            onChange={(event) => setSlug(event.target.value)}
                            required
                            minLength={3}
                            maxLength={180}
                            placeholder="contoh-artikel-cpns"
                            className="w-full rounded-md border-2 border-gray-900 px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                        <span className="text-sm font-black text-gray-700">Kategori</span>
                        <input
                            name="category"
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                            maxLength={80}
                            placeholder="Tips, Berita, Strategi SKD"
                            className="w-full rounded-md border-2 border-gray-900 px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-black text-gray-700">Cover Image</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => coverInputRef.current?.click()}
                                disabled={isUploadingCover}
                                className="flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-100 disabled:opacity-50"
                            >
                                {isUploadingCover ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                Upload
                            </button>
                            <input
                                name="cover_image_url"
                                type="url"
                                value={coverImageUrl}
                                onChange={(e) => setCoverImageUrl(e.target.value)}
                                placeholder="https://... atau klik Upload"
                                className="w-full rounded-md border-2 border-gray-900 px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                        <input
                            type="file"
                            ref={coverInputRef}
                            onChange={handleCoverUpload}
                            accept="image/jpeg, image/png, image/webp, image/gif"
                            className="hidden"
                        />
                    </label>
                </div>

                <label className="space-y-2 block">
                    <span className="text-sm font-black text-gray-700">Ringkasan</span>
                    <textarea
                        name="excerpt"
                        value={excerpt}
                        onChange={(event) => setExcerpt(event.target.value)}
                        maxLength={320}
                        rows={3}
                        className="w-full rounded-md border-2 border-gray-900 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </label>

                <label className="space-y-2 block">
                    <span className="text-sm font-black text-gray-700">Konten Artikel</span>
                    <ArticleRichTextEditor content={content} onChange={setContent} />
                    <input type="hidden" name="content" value={content} />
                </label>

                <div className="flex justify-end gap-3 border-t-2 border-dashed border-gray-200 pt-5">
                    <SubmitButton />
                </div>
            </form>
        </div>
    )
}
