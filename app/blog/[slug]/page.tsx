import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Newspaper } from 'lucide-react'
import SeoNavbar from '@/components/SeoNavbar'
import ReadingProgress from '@/components/blog/ReadingProgress'
import ArticleToc from '@/components/blog/ArticleToc'
import { buildArticleToc } from '@/lib/article-toc'
import { getPublishedArticleBySlug } from '@/src/services/article-read.service'
import { estimateReadTime, formatArticleDate } from '@/lib/articles'
import { escapeHtml, sanitizeArticleHtml } from '@/lib/article-sanitize'
import { logger } from '@/lib/logger'

type Article = {
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: string | null
  cover_image_url: string | null
  published_at: string | null
}

async function getArticle(slug: string) {
  try {
    // Di-cache 5 menit; dibatalkan lewat `revalidatePath('/blog/${slug}')`
    // pada setiap penulisan artikel.
    return (await getPublishedArticleBySlug(slug)) as Article | null
  } catch (error) {
    logger.warn('[blog-detail-read]', {
      error: error instanceof Error ? error.message : String(error),
      slug,
    })
    return null
  }
}

function getSafeArticleContent(article: Article) {
  return typeof article.content === 'string' ? article.content : ''
}

function getSafeArticleHtml(article: Article) {
  const content = getSafeArticleContent(article)

  try {
    return sanitizeArticleHtml(content)
  } catch (error) {
    logger.warn('[blog-detail-sanitize]', {
      error: error instanceof Error ? error.message : String(error),
      slug: article.slug,
    })
    return escapeHtml(content).replace(/\n/g, '<br />')
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return {
      title: 'Artikel tidak ditemukan',
    }
  }

  return {
    title: article.title,
    description: article.excerpt || `Artikel CPNS dari Siap Tempur: ${article.title}`,
    alternates: {
      canonical: `https://siaptempur.id/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      type: 'article',
      publishedTime: article.published_at || undefined,
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) notFound()
  const articleContent = getSafeArticleContent(article)
  // `articleHtml` dipakai untuk render; daftar isi dibangun dari HTML yang sama agar
  // `id` heading dan tautan daftar isi selalu sinkron.
  const { html: articleHtml, items: tocItems } = buildArticleToc(getSafeArticleHtml(article))

  return (
    <div className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body">
      <SeoNavbar />
      <ReadingProgress />
      <main className="px-4 pb-20 pt-28 md:px-8 md:pb-28">
        <article className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="st-focus inline-flex min-h-11 items-center gap-2 rounded-xl px-1 font-black text-gray-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            Kembali ke Blog
          </Link>

          <header className="mt-8 border-b-2 border-dashed border-[var(--st-ink)] pb-8 md:pb-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="st-kicker">
                <Newspaper size={15} />
                {article.category || 'Artikel'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500">
                <Clock size={16} />
                {estimateReadTime(articleContent)}
              </span>
              <span className="text-sm font-bold text-gray-400">
                {formatArticleDate(article.published_at)}
              </span>
            </div>
            <h1 className="st-heading-display mt-6 text-5xl sm:text-6xl md:text-7xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="st-muted mt-6 max-w-3xl text-lg font-semibold leading-relaxed md:text-xl">
                {article.excerpt}
              </p>
            )}
          </header>

          {article.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="my-8 max-h-[440px] w-full rounded-st-lg border-2 border-[var(--st-ink)] object-cover st-shadow-md md:my-10"
            />
          )}

          <ArticleToc items={tocItems} />

          <div className="st-card-lg mt-8 bg-white p-5 md:p-8">
            <div
              className="font-body text-base font-medium leading-8 text-gray-800 md:text-lg [&_a]:font-black [&_a]:text-blue-700 [&_a]:underline [&_a]:decoration-wavy [&_a]:decoration-2 [&_blockquote]:my-7 [&_blockquote]:rounded-2xl [&_blockquote]:border-2 [&_blockquote]:border-[var(--st-ink)] [&_blockquote]:bg-[var(--st-yellow-soft)] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:font-semibold [&_blockquote]:italic [&_code]:rounded-lg [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-black [&_h2]:leading-tight [&_h2]:text-gray-950 md:[&_h2]:text-4xl [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-black [&_h3]:leading-tight [&_h3]:text-gray-950 [&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:text-xl [&_h4]:font-black [&_img]:mx-auto [&_img]:my-8 [&_img]:rounded-2xl [&_img]:border-2 [&_img]:border-[var(--st-ink)] [&_img]:st-shadow-md [&_li]:mb-2 [&_mark]:bg-[var(--st-yellow)] [&_mark]:px-1 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border-2 [&_pre]:border-[var(--st-ink)] [&_pre]:bg-slate-950 [&_pre]:p-5 [&_pre]:text-gray-100 [&_strong]:font-black [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </div>
        </article>
      </main>
    </div>
  )
}
