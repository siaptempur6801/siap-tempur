import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { estimateReadTime, formatArticleDate } from '@/lib/articles'
import { cn } from '@/lib/utils'

export type ArticlePreview = {
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: string | null
  cover_image_url: string | null
  published_at: string | null
}

export default function ArticlePreviewCard({
  article,
  className,
}: {
  article: ArticlePreview
  className?: string
}) {
  return (
    <article
      className={cn(
        'st-card-md group relative flex min-h-[28rem] flex-col overflow-hidden bg-white transition-transform duration-200 hover:-translate-y-1',
        className,
      )}
    >
      <Link
        href={`/blog/${article.slug}`}
        className="absolute inset-0 z-10 rounded-st-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        aria-label={`Baca artikel ${article.title}`}
      />

      <div className="relative aspect-[16/9] overflow-hidden border-b-2 border-[var(--st-ink)] bg-blue-100">
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt=""
            fill
            loading="lazy"
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full min-h-52 items-center justify-center bg-blue-100 text-blue-300"
            aria-hidden="true"
          >
            <BookOpen className="h-14 w-14" strokeWidth={1.7} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="st-pill bg-blue-50 text-blue-700">{article.category || 'Artikel'}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <Clock size={14} />
            {estimateReadTime(article.content)}
          </span>
        </div>
        <h3 className="mt-5 line-clamp-3 text-xl font-black leading-snug text-gray-950 transition-colors group-hover:text-blue-700 md:text-2xl">
          {article.title}
        </h3>
        <p className="st-muted mt-3 line-clamp-3 flex-1 text-sm font-semibold leading-relaxed">
          {article.excerpt ||
            'Baca artikel lengkap untuk mendapatkan informasi persiapan ujian yang lebih detail.'}
        </p>
        <div
          className="mt-6 flex items-center justify-between gap-3 border-t border-gray-200 pt-4"
          aria-hidden="true"
        >
          <span className="text-xs font-bold text-gray-500">
            {formatArticleDate(article.published_at)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700">
            Baca
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  )
}
