import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, CheckCircle2, Calculator } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";

export const metadata: Metadata = {
    title: "Latihan Soal TIU CPNS 2026 - Trik Cepat & Pembahasan",
    description: "Kuasai materi Tes Intelegensia Umum (TIU) CPNS 2026. Latihan soal analogi, silogisme, deret angka, dan soal cerita dengan trik cepat hitung untuk mencapai passing grade.",
    keywords: ["tryout tiu cpns", "latihan soal tiu", "materi tiu cpns", "passing grade tiu", "tiu deret angka", "tiu silogisme", "trik hitung cepat tiu"],
    alternates: {
        canonical: "https://siaptempur.id/cpns/tiu",
    },
};

export default function TIUPage() {
    return (
        <div className="min-h-screen bg-[#fdfbf7]">
            <SeoNavbar />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 font-body transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Beranda
                    </Link>

                    {/* Hero Section */}
                    <div className="mb-12">
                        <Badge variant="blue" className="mb-4">SKD Subtes 2</Badge>
                        <h1 className="text-4xl md:text-5xl font-handwriting font-bold mb-4 leading-tight">
                            Latihan Soal TIU CPNS <br className="hidden md:block" />
                            <span className="text-blue-600">Tes Intelegensia Umum</span>
                        </h1>
                        <p className="text-xl text-gray-600 font-handwriting max-w-2xl">
                            Tes yang menguras paling banyak waktu. Kuasai kemampuan verbal, numerik, dan figural dengan trik hitung cepat agar tidak kehabisan waktu di ujian CAT sebenarnya.
                        </p>
                    </div>

                    {/* Passing Grade Card */}
                    <Card variant="binder" className="p-8 mb-12">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="bg-blue-100 p-6 rounded-full border-4 border-blue-600 shrink-0">
                                <Calculator className="w-12 h-12 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold font-handwriting mb-2">Passing Grade TIU: 80 Poin</h2>
                                <p className="text-gray-700 font-body mb-4">
                                    Dari total 35 soal TIU, Anda wajib menjawab benar minimal <strong>16 soal</strong> (masing-masing bernilai 5 poin). Skor salah adalah 0. TIU sering menjadi <i>killer subtest</i> bagi peserta CPNS!
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded border-2 border-gray-900 text-center">
                                        <div className="text-sm text-gray-500 font-bold mb-1">Total Soal</div>
                                        <div className="text-xl font-black">35</div>
                                    </div>
                                    <div className="bg-white p-3 rounded border-2 border-gray-900 text-center">
                                        <div className="text-sm text-gray-500 font-bold mb-1">Skor Maksimal</div>
                                        <div className="text-xl font-black">175</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Materi Section */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-handwriting font-bold mb-6">Materi Uji TIU (Sesuai Permenpan RB)</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            {[
                                { title: "Kemampuan Verbal", desc: "Analogi (perbandingan dua konsep), Silogisme (penarikan kesimpulan), dan Analitis (analisa informasi kompleks)." },
                                { title: "Kemampuan Numerik", desc: "Berhitung dasar, Deret Angka, Perbandingan Kuantitatif, dan Soal Cerita matematika." },
                                { title: "Kemampuan Figural", desc: "Analogi gambar, Ketidaksamaan (mencari gambar berbeda), dan Serial gambar (pola lanjutan)." }
                            ].map((item, i) => (
                                <Card key={i} variant="standard" className="p-5">
                                    <CheckCircle2 className="w-6 h-6 text-blue-500 mb-3" />
                                    <h3 className="font-bold font-handwriting text-xl mb-2">{item.title}</h3>
                                    <p className="text-gray-600 font-body text-sm leading-relaxed">{item.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <Section dashedBorder="top" pattern="dots" className="text-center rounded-3xl mt-16 bg-white border-4 border-gray-900">
                        <h2 className="text-3xl font-handwriting font-bold mb-4">Latih Kecepatan Hitungmu!</h2>
                        <p className="text-gray-600 font-body mb-8 max-w-lg mx-auto">
                            Rata-rata Anda hanya punya <strong>54 detik</strong> untuk menjawab 1 soal TIU. Tes kecepatan dan ketepatanmu menggunakan sistem CAT BKN kami.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button asChild size="lg" variant="primary">
                                <Link href="/cpns/mini-tryout">Coba Mini Tryout (TIU)</Link>
                            </Button>
                            <Button asChild size="lg" variant="white">
                                <Link href="/cpns/full-tryout">Mulai Tryout Full</Link>
                            </Button>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
}
