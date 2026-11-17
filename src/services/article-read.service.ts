import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Pembacaan artikel publik yang di-cache.
 *
 * KENAPA
 *   Artikel adalah konten yang jarang berubah, tetapi setiap permintaan
 *   `/blog`, `/blog/[slug]`, dan `/cpns` menjalankan ulang query yang sama ke
 *   `articles`. Halaman-halaman itu memang dinamis (mereka memeriksa sesi lewat
 *   cookie), sehingga query-nya ikut berjalan setiap kali — padahal datanya
 *   identik untuk semua pengunjung.
 *
 * STRATEGI CACHE
 *   - Apa yang di-cache : daftar artikel terbit, artikel per slug, dan N artikel
 *     terbaru. Hanya konten yang sudah `status = 'published'`.
 *   - Berapa lama       : 300 detik (5 menit).
 *   - Yang membatalkan  : `revalidatePath('/blog')`, `/blog/[slug]`, dan
 *     `/blog/${slug}` yang SUDAH dipanggil setiap kali artikel
 *     dibuat/diperbarui/diarsipkan di `app/actions/articles.ts`. TTL 5 menit
 *     adalah jaring pengaman, bukan satu-satunya mekanisme pembatalan.
 *   - Siapa yang boleh melihat : publik. Query selalu menfilter
 *     `status = 'published'`, jadi tidak ada konten draft yang ikut ter-cache.
 *
 * KEAMANAN
 *   Klien anon stateless tidak membaca cookie dan tidak memakai service role.
 *   RLS membatasi baris ke artikel published; filter eksplisit tetap dipertahankan.
 *   Klien berbasis cookie tidak boleh dipakai di dalam unstable_cache karena cache
 *   ini hanya untuk konten publik yang identik bagi semua pengunjung.
 */

function createPublicArticleClient() {
  return createClient(env.supabaseUrl(), env.supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

const REVALIDATE_SECONDS = 300
const ARTICLE_TAG = 'articles'

export type ArticlePreview = {
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  category: string | null
  cover_image_url: string | null
  published_at: string | null
}

const PREVIEW_COLUMNS = 'title, slug, excerpt, content, category, cover_image_url, published_at'

export const listPublishedArticles = unstable_cache(
  async (): Promise<ArticlePreview[]> => {
    const supabase = createPublicArticleClient()
    const { data, error } = await supabase
      .from('articles')
      .select(PREVIEW_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ArticlePreview[]
  },
  ['articles:published:all'],
  { revalidate: REVALIDATE_SECONDS, tags: [ARTICLE_TAG] },
)

export const listLatestPublishedArticles = unstable_cache(
  async (limit: number): Promise<ArticlePreview[]> => {
    const supabase = createPublicArticleClient()
    const { data, error } = await supabase
      .from('articles')
      .select(PREVIEW_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as ArticlePreview[]
  },
  ['articles:published:latest'],
  { revalidate: REVALIDATE_SECONDS, tags: [ARTICLE_TAG] },
)

/**
 * Varian untuk landing `/cpns`, yang juga menampilkan `id`.
 *
 * Sengaja terpisah dari `listLatestPublishedArticles` karena kolomnya berbeda —
 * menyatukannya berarti salah satu pemanggil menerima kolom yang tidak
 * dibutuhkannya (atau kehilangan kolom yang dibutuhkannya).
 */
export const listLatestPublishedArticleCards = unstable_cache(
  async (limit: number) => {
    const supabase = createPublicArticleClient()
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, cover_image_url, published_at, excerpt, content, category')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },
  ['articles:published:cards'],
  { revalidate: REVALIDATE_SECONDS, tags: [ARTICLE_TAG] },
)

export const getPublishedArticleBySlug = unstable_cache(
  async (slug: string): Promise<ArticlePreview | null> => {
    const supabase = createPublicArticleClient()
    const { data, error } = await supabase
      .from('articles')
      .select(PREVIEW_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw error
    return (data as ArticlePreview | null) ?? null
  },
  ['articles:published:slug'],
  { revalidate: REVALIDATE_SECONDS, tags: [ARTICLE_TAG] },
)
