import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";
import { createClient } from "@/lib/utils/supabase/server";
import { estimateReadTime, formatArticleDate } from "@/lib/articles";

export const metadata: Metadata = {
    title: "Blog & Info CPNS 2026 - Jadwal, Syarat & Tips Lulus",
    description: "Kumpulan artikel, jadwal resmi, persyaratan administrasi, dan tips jitu lulus seleksi SKD & SKB CPNS 2026 dari ahlinya.",
    keywords: ["info cpns 2026", "jadwal cpns 2026", "syarat cpns", "tips lulus cpns", "blog cpns", "artikel skd cpns"],
    alternates: {
        canonical: "https://siaptempur.id/blog",
    },
};

type Article = {
    title: string
    slug: string
    excerpt: string | null
    content: string
    category: string | null
    published_at: string | null
}

export default async function BlogIndexPage() {
    const supabase = await createClient()
    const { data: articles } = await supabase
        .from('articles')
        .select('title, slug, excerpt, content, category, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

    return (
        <div className="min-h-screen bg-[#fdfbf7]">
            <SeoNavbar />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 font-body transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Beranda
                    </Link>

                    {/* Header Section */}
                    <div className="mb-16 border-b-4 border-gray-900 border-dashed pb-12">
                        <h1 className="text-4xl md:text-6xl font-handwriting font-bold mb-6">
                            Jurnal <span className="text-blue-600">Pejuang NIP</span>
                        </h1>
                        <p className="text-xl text-gray-600 font-handwriting max-w-2xl">
                            Temukan semua informasi terbaru seputar rekrutmen CPNS, tips lolos passing grade, hingga strategi memilih formasi yang tepat.
                        </p>
                    </div>

                    {/* Blog List */}
                    <div className="grid md:grid-cols-2 gap-8 mb-16">
                        {(articles as Article[] | null)?.map((article, index) => (
                            <Card key={article.slug} variant="standard" className="flex flex-col hover:-translate-y-2 transition-transform duration-300">
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge variant={index % 2 === 0 ? "blue" : "red"}>
                                            {article.category || 'Artikel'}
                                        </Badge>
                                        <div className="flex items-center text-gray-500 text-sm font-body font-bold">
                                            <Clock className="w-4 h-4 mr-1" />
                                            {estimateReadTime(article.content)}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold font-handwriting mb-3 line-clamp-2 hover:text-blue-600 transition-colors">
                                        <Link href={`/blog/${article.slug}`}>
                                            {article.title}
                                        </Link>
                                    </h2>
                                    <p className="text-gray-600 font-body mb-6 flex-1 line-clamp-3">
                                        {article.excerpt || 'Baca artikel lengkap di Jurnal Pejuang NIP.'}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-gray-100">
                                        <span className="text-sm font-bold text-gray-400 font-body">{formatArticleDate(article.published_at)}</span>
                                        <Link href={`/blog/${article.slug}`} className="inline-flex items-center text-blue-600 font-bold font-body hover:underline decoration-wavy">
                                            Baca Selengkapnya
                                            <BookOpen className="w-4 h-4 ml-2" />
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {(!articles || articles.length === 0) && (
                        <div className="mb-16 border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                            <h2 className="font-handwriting text-3xl font-bold text-gray-900">Artikel segera hadir</h2>
                            <p className="mt-2 font-body text-gray-600">Tim Siap Tempur sedang menyiapkan konten CPNS terbaru.</p>
                        </div>
                    )}

                    {/* Newsletter Section */}
                    <Section pattern="grid" className="rounded-3xl bg-gray-900 text-white text-center p-12">
                        <h2 className="text-3xl font-handwriting font-bold mb-4">Jangan Ketinggalan Info CPNS!</h2>
                        <p className="text-gray-400 font-body mb-8 max-w-lg mx-auto">
                            Dapatkan bocoran tryout, diskon token, dan info pendaftaran SSCASN langsung ke emailmu.
                        </p>
                        <form className="flex flex-col sm:flex-row max-w-md mx-auto gap-4">
                            <input 
                                type="email" 
                                placeholder="Masukkan email kamu..." 
                                className="flex-1 px-4 py-3 rounded border-2 border-gray-700 bg-gray-800 text-white focus:outline-none focus:border-blue-500 font-body"
                            />
                            <button type="button" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold font-body transition-colors whitespace-nowrap">
                                Subscribe
                            </button>
                        </form>
                    </Section>
                </div>
            </main>
        </div>
    );
}
