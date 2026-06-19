import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";

export const metadata: Metadata = {
    title: "Blog & Info CPNS 2026 - Jadwal, Syarat & Tips Lulus",
    description: "Kumpulan artikel, jadwal resmi, persyaratan administrasi, dan tips jitu lulus seleksi SKD & SKB CPNS 2026 dari ahlinya.",
    keywords: ["info cpns 2026", "jadwal cpns 2026", "syarat cpns", "tips lulus cpns", "blog cpns", "artikel skd cpns"],
    alternates: {
        canonical: "https://siaptempur.id/blog",
    },
};

const DUMMY_ARTICLES = [
    {
        title: "Bocoran Jadwal Pendaftaran CPNS 2026 Resmi BKN",
        category: "Berita",
        readTime: "3 min read",
        excerpt: "Pemerintah kembali membuka seleksi CASN/CPNS di tahun 2026. Kapan tepatnya portal SSCASN akan dibuka? Simak bocoran jadwal dari Menpan RB di sini.",
        date: "12 Mar 2026",
        slug: "bocoran-jadwal-cpns-2026"
    },
    {
        title: "5 Syarat Administrasi yang Sering Bikin Gagal Seleksi Berkas",
        category: "Tips",
        readTime: "5 min read",
        excerpt: "Jangan sampai gugur sebelum bertempur! Kesalahan format surat lamaran, meterai, dan resolusi foto sering menjadi momok. Hindari 5 kesalahan fatal ini.",
        date: "05 Mar 2026",
        slug: "syarat-administrasi-gagal-berkas"
    },
    {
        title: "Cara Mendapatkan Poin 5 Terus-Menerus di Soal TKP",
        category: "Strategi SKD",
        readTime: "8 min read",
        excerpt: "TKP (Tes Karakteristik Pribadi) tidak ada jawaban salah, tapi Anda butuh poin 5 untuk lulus passing grade. Pelajari trik psikologis membedah soal TKP.",
        date: "28 Feb 2026",
        slug: "cara-dapat-poin-5-tkp"
    },
    {
        title: "Daftar Instansi Sepi Peminat 2025 yang Bisa Anda Coba Tahun Ini",
        category: "Analisa Data",
        readTime: "6 min read",
        excerpt: "Bermain strategi dalam memilih formasi adalah kunci lulus CPNS. Ini daftar kementerian dan pemda yang selalu kekurangan pelamar setiap tahunnya.",
        date: "15 Feb 2026",
        slug: "instansi-sepi-peminat"
    }
];

export default function BlogIndexPage() {
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
                        {DUMMY_ARTICLES.map((article, index) => (
                            <Card key={index} variant="standard" className="flex flex-col hover:-translate-y-2 transition-transform duration-300">
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge variant={index % 2 === 0 ? "blue" : "red"}>
                                            {article.category}
                                        </Badge>
                                        <div className="flex items-center text-gray-500 text-sm font-body font-bold">
                                            <Clock className="w-4 h-4 mr-1" />
                                            {article.readTime}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold font-handwriting mb-3 line-clamp-2 hover:text-blue-600 transition-colors">
                                        <Link href={`#`}>
                                            {article.title}
                                        </Link>
                                    </h2>
                                    <p className="text-gray-600 font-body mb-6 flex-1 line-clamp-3">
                                        {article.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-gray-100">
                                        <span className="text-sm font-bold text-gray-400 font-body">{article.date}</span>
                                        <Link href={`#`} className="inline-flex items-center text-blue-600 font-bold font-body hover:underline decoration-wavy">
                                            Baca Selengkapnya
                                            <BookOpen className="w-4 h-4 ml-2" />
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

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
