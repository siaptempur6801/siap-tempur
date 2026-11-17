import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/utils/supabase/server'

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
 *   Memakai klien service role karena pembacaan ini tidak bergantung pada
 *   cookie — justru itu tujuannya. Isi yang diambil tetap dibatasi oleh filter
 *   `status = 'published'` yang eksplisit, sama seperti sebelumnya saat query
 *   dijalankan dengan klien anon + RLS.
 *
 * CATATAN PENTING
 *   Klien yang bergantung cookie (`createClient`/`createV2Client`) TIDAK boleh
 *   dipakai di dalam `unstable_cache`: di luar konteks permintaan pembacaan
 *   cookie akan gagal. Karena itu modul ini memakai klien service role.
 */

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
        const supabase = await createAdminClient()
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
        const supabase = await createAdminClient()
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
        const supabase = await createAdminClient()
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
        const supabase = await createAdminClient()
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
