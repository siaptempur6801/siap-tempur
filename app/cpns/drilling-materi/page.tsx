import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Target, Brain, Shield, Rocket } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";

export const metadata: Metadata = {
    title: "Drilling Materi CPNS 2026 - Latihan Soal Per Subtes",
    description: "Fokus perbaiki kelemahanmu dengan Drilling Materi CPNS 2026. Latihan soal spesifik untuk TWK, TIU, dan TKP berulang kali sampai kamu menguasai setiap pola soal.",
    keywords: ["drilling materi cpns", "latihan soal cpns", "belajar cpns per bab", "tryout cpns spesifik", "soal tiu", "soal twk", "soal tkp"],
    alternates: {
        canonical: "https://siaptempur.id/cpns/drilling-materi",
    },
};

export default function DrillingMateriPage() {
    return (
        <div className="min-h-screen bg-[#fdfbf7]">
            <SeoNavbar />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 font-body transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Beranda
                    </Link>

                    {/* Hero Section */}
                    <div className="mb-12 text-center md:text-left">
                        <Badge variant="blue" className="mb-4">Fitur Spesial Siap Tempur</Badge>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-handwriting font-bold mb-4 leading-tight">
                            Drilling Materi CPNS <br className="hidden md:block" />
                            <span className="text-blue-600">Fokus Pada Kelemahanmu</span>
                        </h1>
                        <p className="text-xl text-gray-600 font-handwriting max-w-2xl mx-auto md:mx-0">
                            Punya masalah di soal Deret Angka? Atau sering salah di soal Pilar Negara? Jangan buang waktu mengulang dari awal, fokus hajar bagian yang kamu belum bisa!
                        </p>
                    </div>

                    {/* What is Drilling Card */}
                    <Card variant="binder" className="p-8 mb-16 border-4 border-gray-900">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="bg-yellow-100 p-6 rounded-full border-4 border-yellow-500 shrink-0 shadow-[4px_4px_0px_0px_rgba(234,179,8,1)]">
                                <Target className="w-12 h-12 text-yellow-600" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold font-handwriting mb-3">Apa itu Drilling Materi?</h2>
                                <p className="text-gray-700 font-body text-lg leading-relaxed mb-4">
                                    Berbeda dengan <strong>Full Tryout</strong> yang mensimulasikan 110 soal secara acak, fitur <strong>Drilling Materi</strong> memungkinkan kamu untuk memilih satu topik spesifik dan mengerjakannya berulang-ulang sampai kamu hafal pola penyelesaiannya.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="red">TWK Spesifik</Badge>
                                    <Badge variant="yellow">TIU Spesifik</Badge>
                                    <Badge variant="green">TKP Spesifik</Badge>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Subtests Section */}
                    <div className="mb-16">
                        <h2 className="text-4xl font-handwriting font-bold mb-8 text-center">Pilih Materi Tempurmu</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            
                            {/* TWK Card */}
                            <Card interactive className="p-6 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-red-100 p-3 rounded-lg border-2 border-red-200">
                                        <Shield className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="font-handwriting font-bold text-3xl">TWK</h3>
                                </div>
                                <ul className="space-y-3 font-body text-gray-700 mb-6 flex-1">
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div> Nasionalisme & Integritas</li>
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div> Bela Negara & Pilar Negara</li>
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div> Bahasa Indonesia</li>
                                </ul>
                                <Button asChild variant="outline" className="w-full justify-center">
                                    <Link href="/cpns/twk">Pelajari TWK</Link>
                                </Button>
                            </Card>

                            {/* TIU Card */}
                            <Card interactive className="p-6 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-100 p-3 rounded-lg border-2 border-blue-200">
                                        <Brain className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="font-handwriting font-bold text-3xl">TIU</h3>
                                </div>
                                <ul className="space-y-3 font-body text-gray-700 mb-6 flex-1">
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Verbal (Sinonim, Antonim, Analogi)</li>
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Numerik (Berhitung, Deret, Soal Cerita)</li>
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Figural (Analogi, Ketidaksamaan, Serial)</li>
                                </ul>
                                <Button asChild variant="outline" className="w-full justify-center">
                                    <Link href="/cpns/tiu">Pelajari TIU</Link>
                                </Button>
                            </Card>

                            {/* TKP Card */}
                            <Card interactive className="p-6 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-green-100 p-3 rounded-lg border-2 border-green-200">
                                        <Rocket className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="font-handwriting font-bold text-3xl">TKP</h3>
                                </div>
                                <ul className="space-y-3 font-body text-gray-700 mb-6 flex-1">
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Pelayanan Publik & Jejaring Kerja</li>
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Sosial Budaya & TIK</li>
                                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Profesionalisme & Anti Radikalisme</li>
                                </ul>
                                <Button asChild variant="outline" className="w-full justify-center">
                                    <Link href="/cpns/tkp">Pelajari TKP</Link>
                                </Button>
                            </Card>

                        </div>
                    </div>

                    {/* CTA Section */}
                    <Section dashedBorder="top" pattern="dots" className="text-center rounded-3xl mt-16 bg-white border-4 border-gray-900">
                        <h2 className="text-4xl font-handwriting font-bold mb-4">Mulai Latihan Spesifik Sekarang</h2>
                        <p className="text-gray-600 font-body text-lg mb-8 max-w-lg mx-auto">
                            Gunakan tokenmu untuk membuka akses bebas ke seluruh materi drilling. Semakin sering berlatih, semakin tajam insting menjawab soalmu!
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button asChild size="lg" variant="primary" className="text-xl px-8 py-6">
                                <Link href="/login?returnTo=/cpns/dashboard/drilling-materi">Masuk ke Dashboard Drilling</Link>
                            </Button>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
}
