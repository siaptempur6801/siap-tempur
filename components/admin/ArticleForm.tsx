'use client'
import dynamic from 'next/dynamic'

import { AdminFormActions } from './forms/AdminFormActions'
import { AdminFormSection } from './forms/AdminFormSection'
import { AdminBreadcrumbs } from './navigation/AdminBreadcrumbs'

import type { ArticleActionState } from '@/app/actions/articles'
import {
  AdminPage,
  AdminPageHeader,
  adminInputClass,
  adminLabelClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { createClient } from '@/lib/utils/supabase/client'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

const ArticleRichTextEditor = dynamic(() => import('./ArticleRichTextEditor'), {
  loading: () => (
    <div role="status" className="min-h-28 animate-pulse rounded-md bg-muted">
      Memuat editor…
    </div>
  ),
})

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
  returnTo: string
  action: (prevState: ArticleActionState, formData: FormData) => Promise<ArticleActionState>
  defaultValues?: ArticleFormValues
}

const initialState: ArticleActionState = { success: false, message: '' }
const ARTICLE_IMAGE_BUCKET = 'article-images'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={adminPrimaryButtonClass}>
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Menyimpan...
        </>
      ) : (
        'Simpan draft'
      )}
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className={adminLabelClass}>{children}</span>
}

export default function ArticleForm({ title, action, defaultValues, returnTo }: ArticleFormProps) {
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
    if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES)
      return void toast.error('Ukuran gambar maksimal 2MB')
    const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (!ALLOWED_IMAGE_TYPES.has(file.type))
      return void toast.error('Format gambar harus JPG, PNG, WebP, atau GIF')

    try {
      setIsUploadingCover(true)
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesi login tidak valid')
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `articles/${user.id}/cover-${Date.now()}-${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from(ARTICLE_IMAGE_BUCKET)
        .upload(fileName, file)
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
    <AdminPage>
      <AdminBreadcrumbs
        items={[{ label: 'Content' }, { label: 'Articles', href: returnTo }, { label: title }]}
      />
      <AdminPageHeader
        title={title}
        description="Tulis dan simpan sebagai draft terlebih dahulu. Status publikasi dikelola dari daftar Articles sesuai permission akun."
        action={
          <Link href={returnTo} className={adminSecondaryButtonClass}>
            Kembali ke Articles
          </Link>
        }
      />

      <section>
        <form data-admin-form className="admin-article-form" action={formAction}>
          <input type="hidden" name="return_to" value={returnTo} />
          {state.message ? (
            <div
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm font-medium text-danger"
            >
              {state.message}
            </div>
          ) : null}

          <AdminFormSection title="Informasi Artikel">
            <label className="space-y-1.5">
              <FieldLabel>Judul</FieldLabel>
              <input
                name="title"
                value={articleTitle}
                onChange={(event) => setArticleTitle(event.target.value)}
                required
                minLength={3}
                maxLength={160}
                className={adminInputClass}
              />
            </label>
            <label className="space-y-1.5">
              <FieldLabel>Slug</FieldLabel>
              <input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                required
                minLength={3}
                maxLength={180}
                placeholder="contoh-artikel-cpns"
                className={adminInputClass}
              />
              <span className="block break-all text-xs font-medium text-muted-foreground">
                URL publik: /blog/{slug || 'slug-artikel'}
              </span>
            </label>
          </AdminFormSection>

          <AdminFormSection title="Kategori & Media">
            <label className="space-y-1.5">
              <FieldLabel>Kategori</FieldLabel>
              <input
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
                placeholder="Tips, Berita, Strategi SKD"
                className={adminInputClass}
              />
            </label>
            <div className="space-y-1.5">
              <label htmlFor="article-cover-image-url">
                <FieldLabel>URL cover artikel</FieldLabel>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className={adminSecondaryButtonClass}
                >
                  {isUploadingCover ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ImageIcon size={16} aria-hidden="true" />
                  )}
                  Upload cover image
                </button>
                <input
                  id="article-cover-image-url"
                  name="cover_image_url"
                  type="url"
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  placeholder="https://..."
                  aria-describedby="article-cover-image-hint"
                  className={adminInputClass}
                />
              </div>
              <input
                type="file"
                ref={coverInputRef}
                onChange={handleCoverUpload}
                accept="image/jpeg, image/png, image/webp, image/gif"
                aria-label="Pilih file cover artikel"
                className="hidden"
              />
              <span
                id="article-cover-image-hint"
                className="block text-xs font-medium text-muted-foreground"
              >
                JPG, PNG, WebP, atau GIF. Maksimal 2MB.
              </span>
            </div>
          </AdminFormSection>

          <label className="block space-y-1.5">
            <FieldLabel>Ringkasan</FieldLabel>
            <textarea
              name="excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              maxLength={320}
              rows={3}
              className={`${adminInputClass} resize-y`}
            />
            <span className="block text-right text-xs font-medium text-muted-foreground">
              {excerpt.length}/320
            </span>
          </label>

          <div className="space-y-1.5">
            <FieldLabel>Konten artikel</FieldLabel>
            <ArticleRichTextEditor content={content} onChange={setContent} />
            <input type="hidden" name="content" value={content} />
          </div>

          <AdminFormActions cancelHref={returnTo}>
            <SubmitButton />
          </AdminFormActions>
        </form>
      </section>
    </AdminPage>
  )
}
