import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import SeoNavbar from '@/components/SeoNavbar'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/utils/supabase/server'
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
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('articles')
        .select('title, slug, excerpt, content, category, cover_image_url, published_at')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

    if (error) {
        logger.warn('[blog-detail-read]', { error: error.message, slug })
        return null
    }

    return data as Article | null
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

export default async function BlogDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const article = await getArticle(slug)

    if (!article) notFound()
    const articleContent = getSafeArticleContent(article)
    const articleHtml = getSafeArticleHtml(article)

    return (
        <div className="min-h-screen bg-[#fdfbf7]">
            <SeoNavbar />
            <main className="pt-24 pb-16">
                <article className="container mx-auto max-w-3xl px-4">
                    <Link href="/blog" className="mb-8 inline-flex items-center font-body text-gray-500 transition-colors hover:text-gray-900">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Blog
                    </Link>

                    <div className="mb-8 border-b-4 border-dashed border-gray-900 pb-8">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Badge variant="blue">{article.category || 'Artikel'}</Badge>
                            <span className="inline-flex items-center text-sm font-bold text-gray-500">
                                <Clock className="mr-1 h-4 w-4" />
                                {estimateReadTime(articleContent)}
                            </span>
                            <span className="text-sm font-bold text-gray-400">{formatArticleDate(article.published_at)}</span>
                        </div>
                        <h1 className="font-handwriting text-4xl font-bold leading-tight text-gray-900 md:text-6xl">
                            {article.title}
                        </h1>
                        {article.excerpt && (
                            <p className="mt-5 font-handwriting text-xl text-gray-600 md:text-2xl">{article.excerpt}</p>
                        )}
                    </div>

                    {article.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={article.cover_image_url}
                            alt={article.title}
                            className="mb-8 max-h-[420px] w-full rounded-md border-2 border-gray-900 object-cover shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
                        />
                    )}

                    <div
                        className="space-y-6 font-body text-lg leading-relaxed text-gray-800 [&_a]:font-bold [&_a]:text-blue-600 [&_a]:hover:underline [&_a]:decoration-wavy [&_blockquote]:border-l-4 [&_blockquote]:border-gray-900 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:my-6 [&_blockquote]:bg-gray-50 [&_blockquote]:py-2 [&_blockquote]:pr-4 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:font-handwriting [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-6 [&_h2]:font-handwriting [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:font-handwriting [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_p]:mb-5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border-2 [&_pre]:border-gray-900 [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-5 [&_img]:mx-auto [&_img]:rounded-md [&_img]:border-2 [&_img]:border-gray-900 [&_img]:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] [&_img]:my-8 [&_mark]:bg-yellow-200 [&_mark]:px-1"
                        dangerouslySetInnerHTML={{ __html: articleHtml }}
                    />
                </article>
            </main>
        </div>
    )
}
