'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/utils/supabase/client'
import type { ArticleActionState } from '@/app/actions/articles'
import ArticleRichTextEditor from './ArticleRichTextEditor'
import {
    AdminCard,
    AdminPageHeader,
    adminInputClass,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'

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
const ARTICLE_IMAGE_BUCKET = 'article-images'

function SubmitButton() {
    const { pending } = useFormStatus()
    return <button type="submit" disabled={pending} className={adminPrimaryButtonClass}>{pending ? <><Loader2 size={16} className="animate-spin"/>Menyimpan...</> : 'Simpan draft'}</button>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{children}</span>
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
        if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) return void toast.error('Ukuran gambar maksimal 2MB')
        const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) return void toast.error('Format gambar harus JPG, PNG, WebP, atau GIF')

        try {
            setIsUploadingCover(true)
            const supabase = createClient()
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error('Sesi login tidak valid')
            const fileExt = file.name.split('.').pop() || 'png'
            const fileName = `articles/${user.id}/cover-${Date.now()}-${crypto.randomUUID()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from(ARTICLE_IMAGE_BUCKET).upload(fileName, file)
            if (uploadError) throw new Error(uploadError.message)
            const { data } = supabase.storage.from(ARTICLE_IMAGE_BUCKET).getPublicUrl(fileName)
            setCoverImageUrl(data.publicUrl)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal mengupload cover')
        } finally {
            setIsUploadingCover(false)
            if (coverInputRef.current) coverInputRef.current.value = ''
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-10">
            <AdminPageHeader
                title={title}
                description="Tulis dan simpan sebagai draft terlebih dahulu. Status publikasi dikelola dari daftar Articles sesuai permission akun."
                action={<Link href="/admin/content/articles" className={adminSecondaryButtonClass}>Kembali ke Articles</Link>}
            />

            <AdminCard className="p-5 sm:p-6 lg:p-7">
                <form action={formAction} className="space-y-6">
                    {state.message ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{state.message}</div> : null}

                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="space-y-1.5"><FieldLabel>Judul</FieldLabel><input name="title" value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} required minLength={3} maxLength={160} className={adminInputClass}/></label>
                        <label className="space-y-1.5"><FieldLabel>Slug</FieldLabel><input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required minLength={3} maxLength={180} placeholder="contoh-artikel-cpns" className={adminInputClass}/><span className="block text-xs font-medium text-slate-400">URL publik: /blog/{slug || 'slug-artikel'}</span></label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="space-y-1.5"><FieldLabel>Kategori</FieldLabel><input name="category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="Tips, Berita, Strategi SKD" className={adminInputClass}/></label>
                        <label className="space-y-1.5"><FieldLabel>Cover image</FieldLabel><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover} className={adminSecondaryButtonClass}>{isUploadingCover ? <Loader2 size={16} className="animate-spin"/> : <ImageIcon size={16}/>}Upload</button><input name="cover_image_url" type="url" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="https://... atau klik Upload" className={adminInputClass}/></div><input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/jpeg, image/png, image/webp, image/gif" className="hidden"/><span className="block text-xs font-medium text-slate-400">JPG, PNG, WebP, atau GIF. Maksimal 2MB.</span></label>
                    </div>

                    <label className="block space-y-1.5"><FieldLabel>Ringkasan</FieldLabel><textarea name="excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} maxLength={320} rows={3} className={`${adminInputClass} resize-y`}/><span className="block text-right text-xs font-medium text-slate-400">{excerpt.length}/320</span></label>

                    <label className="block space-y-1.5"><FieldLabel>Konten artikel</FieldLabel><ArticleRichTextEditor content={content} onChange={setContent}/><input type="hidden" name="content" value={content}/></label>

                    <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end"><Link href="/admin/content/articles" className={adminSecondaryButtonClass}>Batal</Link><SubmitButton/></div>
                </form>
            </AdminCard>
        </div>
    )
}
