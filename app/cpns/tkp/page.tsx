import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, CheckCircle2, UserCheck } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";

export const metadata: Metadata = {
    title: "Latihan Soal TKP CPNS 2026 - Trik Dapat Poin 5",
    description: "Panduan dan latihan soal Tes Karakteristik Pribadi (TKP) CPNS. Pelajari trik mendapatkan poin 5 untuk materi pelayanan publik, jejaring kerja, dan anti radikalisme.",
    keywords: ["tryout tkp cpns", "latihan soal tkp", "materi tkp cpns", "passing grade tkp", "tkp pelayanan publik", "tkp anti radikalisme", "trik poin 5 tkp"],
    alternates: {
        canonical: "https://siaptempur.id/cpns/tkp",
    },
};

export default function TKPPage() {
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
                        <Badge variant="green" className="mb-4">SKD Subtes 3</Badge>
                        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-tight">
                            Latihan Soal TKP CPNS <br className="hidden md:block" />
                            <span className="text-green-600">Tes Karakteristik Pribadi</span>
                        </h1>
                        <p className="text-xl text-gray-600 font-display max-w-2xl">
                            Berbeda dengan TWK dan TIU, tidak ada jawaban "salah" di TKP. Semua opsi memiliki bobot nilai 1 sampai 5. Tapi mampukah kamu konsisten memilih jawaban poin tertinggi?
                        </p>
                    </div>

                    {/* Passing Grade Card */}
                    <Card variant="binder" className="p-8 mb-12">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="bg-blue-100 p-6 rounded-full border-4 border-blue-600 shrink-0">
                                <UserCheck className="w-12 h-12 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold font-display mb-2">Passing Grade TKP: 166 Poin</h2>
                                <p className="text-gray-700 font-body mb-4">
                                    Total ada 45 soal TKP. Untuk lolos ambang batas 166, Anda perlu mendapatkan rata-rata <strong>3,7 poin per soal</strong>. Ini berarti Anda harus mengincar jawaban berpoin 4 atau 5 secara konsisten!
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded border-2 border-gray-900 text-center">
                                        <div className="text-sm text-gray-500 font-bold mb-1">Total Soal</div>
                                        <div className="text-xl font-black">45</div>
                                    </div>
                                    <div className="bg-white p-3 rounded border-2 border-gray-900 text-center">
                                        <div className="text-sm text-gray-500 font-bold mb-1">Skor Maksimal</div>
                                        <div className="text-xl font-black">225</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Materi Section */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-display font-bold mb-6">Fokus Penilaian TKP</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                { title: "Pelayanan Publik", desc: "Perilaku keramahtamahan dalam bekerja yang efektif agar bisa memenuhi kebutuhan dan kepuasan publik." },
                                { title: "Jejaring Kerja", desc: "Kemampuan membangun dan membina hubungan, bekerja sama, berbagi informasi dan berkolaborasi." },
                                { title: "Sosial Budaya", desc: "Mampu beradaptasi dan bekerja secara efektif dalam masyarakat majemuk." },
                                { title: "TIK", desc: "Mampu memanfaatkan teknologi informasi secara efektif untuk meningkatkan kinerja." },
                                { title: "Profesionalisme", desc: "Mampu melaksanakan tugas dan fungsi sesuai dengan tuntutan jabatan." },
                                { title: "Anti Radikalisme", desc: "Menjaring informasi dari individu tentang pengetahuan terhadap anti radikalisme dan toleransi." }
                            ].map((item, i) => (
                                <Card key={i} variant="standard" className="p-5 flex gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-bold font-display text-xl mb-1">{item.title}</h3>
                                        <p className="text-gray-600 font-body text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <Section dashedBorder="top" pattern="dots" className="text-center rounded-3xl mt-16 bg-white border-4 border-gray-900">
                        <h2 className="text-3xl font-display font-bold mb-4">Seberapa Sering Kamu Dapat Poin 5?</h2>
                        <p className="text-gray-600 font-body mb-8 max-w-lg mx-auto">
                            Banyak peserta gagal karena terlalu sering memilih opsi aman (poin 3 atau 4). Latih insting birokrasimu dengan simulasi TKP sesuai standar BKN.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button asChild size="lg" variant="primary">
                                <Link href="/cpns/mini-tryout">Tryout Pendek (TKP)</Link>
                            </Button>
                            <Button asChild size="lg" variant="white">
                                <Link href="/cpns/full-tryout">Simulasi 110 Soal Lengkap</Link>
                            </Button>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
}
