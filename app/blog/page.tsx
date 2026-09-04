import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Newspaper } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";
import ArticlePreviewCard, { type ArticlePreview } from "@/components/articles/ArticlePreviewCard";
import { createClient } from "@/lib/utils/supabase/server";
import { estimateReadTime, formatArticleDate } from "@/lib/articles";

export const metadata: Metadata = {
    title: "Blog & Info CPNS 2026 - Jadwal, Syarat & Tips Lulus",
    description: "Kumpulan artikel, jadwal resmi, persyaratan administrasi, dan tips lulus seleksi SKD & SKB CPNS 2026 dari SiapTempur.",
    keywords: ["info cpns 2026", "jadwal cpns 2026", "syarat cpns", "tips lulus cpns", "blog cpns", "artikel skd cpns"],
    alternates: {
        canonical: "https://siaptempur.id/blog",
    },
};

function ArticleCover({ article, featured = false }: { article: ArticlePreview; featured?: boolean }) {
    return (
        <div className={featured
            ? "relative min-h-64 overflow-hidden border-b-2 border-[var(--st-ink)] bg-blue-100 lg:min-h-full lg:border-b-0 lg:border-r-2"
            : "relative aspect-[16/9] overflow-hidden border-b-2 border-[var(--st-ink)] bg-blue-100"
        }>
            {article.cover_image_url ? (
                <Image
                    src={article.cover_image_url}
                    alt=""
                    fill
                    loading={featured ? "eager" : "lazy"}
                    sizes={featured ? "(min-width: 1024px) 42vw, 100vw" : "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
            ) : (
                <div className="flex h-full min-h-52 items-center justify-center bg-blue-100 text-blue-300" aria-hidden="true">
                    <BookOpen className={featured ? "h-20 w-20" : "h-14 w-14"} strokeWidth={1.7} />
                </div>
            )}
        </div>
    )
}

export default async function BlogIndexPage() {
    const supabase = await createClient()
    const { data: articles } = await supabase
        .from('articles')
        .select('title, slug, excerpt, content, category, cover_image_url, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

    const rows = (articles as ArticlePreview[] | null) ?? []
    const featured = rows[0]
    const rest = rows.slice(1)

    return (
        <div className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body">
            <SeoNavbar />
            <main className="px-4 pb-20 pt-28 md:px-8 md:pb-28">
                <div className="mx-auto max-w-7xl">
                    <section className="relative grid gap-8 border-b-2 border-dashed border-[var(--st-ink)] pb-12 lg:grid-cols-[1fr_0.72fr] lg:items-end">
                        <div>
                            <div className="st-kicker">
                                <Newspaper size={15} />
                                Artikel SiapTempur
                            </div>
                            <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                                Baca strategi sebelum masuk ruang ujian.
                            </h1>
                            <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                                Kumpulan panduan CPNS, SKD, tryout, dan kebiasaan belajar yang membantu kamu tahu apa yang perlu diperbaiki berikutnya.
                            </p>
                        </div>
                        <div className="st-card-md bg-white p-5 md:p-6">
                            <p className="text-sm font-black uppercase tracking-[0.1em] text-blue-700">Fokus baca</p>
                            <div className="mt-4 grid gap-3 text-sm font-bold text-gray-700">
                                <span className="rounded-2xl bg-blue-50 px-4 py-3">Update seleksi dan persiapan administrasi</span>
                                <span className="rounded-2xl bg-amber-50 px-4 py-3">Strategi latihan TWK, TIU, dan TKP</span>
                                <span className="rounded-2xl bg-emerald-50 px-4 py-3">Cara membaca hasil tryout dan progres</span>
                            </div>
                        </div>
                    </section>

                    {featured ? (
                        <section className="py-10">
                            <article className="st-card-lg group grid min-h-[24rem] overflow-hidden bg-white lg:grid-cols-[0.86fr_1.14fr]">
                                <ArticleCover article={featured} featured />
                                <div className="flex flex-col justify-between p-6 md:p-8 lg:p-10">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-gray-500">
                                            <span className="st-pill bg-[var(--st-yellow-soft)] text-gray-900">{featured.category || "Artikel pilihan"}</span>
                                            <span>{formatArticleDate(featured.published_at)}</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Clock size={15} />
                                                {estimateReadTime(featured.content)}
                                            </span>
                                        </div>
                                        <h2 className="mt-6 font-handwriting text-4xl font-black leading-tight text-gray-950 md:text-5xl">
                                            <Link href={`/blog/${featured.slug}`} className="st-focus transition-colors hover:text-blue-700">
                                                {featured.title}
                                            </Link>
                                        </h2>
                                        <p className="st-muted mt-5 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
                                            {featured.excerpt || "Baca artikel lengkap untuk mendapatkan konteks belajar yang lebih terarah."}
                                        </p>
                                    </div>
                                    <Link href={`/blog/${featured.slug}`} className="st-button mt-8 inline-flex min-h-12 w-fit items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
                                        Baca artikel
                                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </div>
                            </article>
                        </section>
                    ) : null}

                    {rest.length ? (
                        <section className="grid gap-5 border-t border-gray-200 pt-8 md:grid-cols-2 xl:grid-cols-3">
                            {rest.map((article) => (
                                <ArticlePreviewCard key={article.slug} article={article} />
                            ))}
                        </section>
                    ) : null}

                    {!rows.length ? (
                        <section className="st-card-lg mt-10 bg-white p-8 text-center md:p-12">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]">
                                <Newspaper size={26} />
                            </div>
                            <h2 className="st-heading-display mt-5 text-4xl">Artikel segera hadir.</h2>
                            <p className="st-muted mx-auto mt-3 max-w-xl font-semibold leading-relaxed">
                                Tim SiapTempur sedang menyiapkan konten CPNS terbaru. Nanti bagian ini akan otomatis terisi saat artikel dipublikasikan.
                            </p>
                        </section>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
