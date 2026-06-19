import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Trophy, Users, Calendar, Award } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";

export const metadata: Metadata = {
    title: "Event Tryout Akbar CPNS 2026 - Siap Tempur",
    description: "Ikuti Event Tryout Akbar CPNS Tingkat Nasional. Uji kemampuanmu bersaing dengan ribuan peserta lain, dapatkan ranking nasional, dan raih hadiah beasiswa/token gratis.",
    keywords: ["tryout akbar cpns", "tryout cpns nasional", "event tryout cpns", "tryout gratis cpns", "ranking nasional cpns"],
    alternates: {
        canonical: "https://siaptempur.id/cpns/event",
    },
};

export default function EventPage() {
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
                    <div className="text-center mb-16">
                        <Badge variant="yellow" className="mb-6">🏆 Event Nasional</Badge>
                        <h1 className="text-4xl md:text-6xl font-handwriting font-bold mb-6 leading-tight max-w-4xl mx-auto">
                            Uji Nyali di <span className="text-blue-600">Tryout Akbar</span> <br className="hidden md:block" />
                            Bersaing dengan Ribuan Peserta!
                        </h1>
                        <p className="text-xl text-gray-600 font-handwriting max-w-2xl mx-auto mb-8">
                            Jangan merasa aman kalau cuma jago di tryout biasa. Ikuti event akbar kami, rasakan tekanan kompetisi sebenarnya, dan lihat seberapa jauh kamu dari ranking kelulusan.
                        </p>
                        <Button asChild size="xl" variant="primary" className="animate-bounce">
                            <Link href="/cpns/dashboard/event">Lihat Event Aktif di Dashboard</Link>
                        </Button>
                    </div>

                    {/* Fitur Event */}
                    <div className="grid md:grid-cols-3 gap-8 mb-20">
                        <Card variant="sketch" className="p-8 text-center flex flex-col items-center">
                            <div className="bg-yellow-100 p-4 rounded-full mb-6">
                                <Users className="w-10 h-10 text-yellow-600" />
                            </div>
                            <h3 className="text-2xl font-handwriting font-bold mb-3">Ranking Nasional</h3>
                            <p className="text-gray-600 font-body">Ketahuilah posisimu sesungguhnya dibandingkan puluhan ribu pesaing dari seluruh Indonesia.</p>
                        </Card>
                        
                        <Card variant="sketch" className="p-8 text-center flex flex-col items-center">
                            <div className="bg-red-100 p-4 rounded-full mb-6">
                                <Award className="w-10 h-10 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-handwriting font-bold mb-3">Sistem CAT Asli BKN</h3>
                            <p className="text-gray-600 font-body">UI/UX dan sistem penilaian (Passing Grade) dibuat 100% mirip dengan sistem Computer Assisted Test BKN.</p>
                        </Card>

                        <Card variant="sketch" className="p-8 text-center flex flex-col items-center">
                            <div className="bg-green-100 p-4 rounded-full mb-6">
                                <Trophy className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-handwriting font-bold mb-3">Hadiah & Beasiswa</h3>
                            <p className="text-gray-600 font-body">Top 10 peraih nilai tertinggi berkesempatan mendapatkan token gratis dan merch eksklusif SiapTempur.</p>
                        </Card>
                    </div>

                    {/* CTA Section */}
                    <Section dashedBorder="top" pattern="dots" className="text-center rounded-3xl bg-blue-600 text-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="bg-white/10 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-yellow-300" />
                        </div>
                        <h2 className="text-3xl font-handwriting font-bold mb-4">Tidak Ada Event Aktif Saat Ini?</h2>
                        <p className="text-blue-100 font-body mb-8 max-w-lg mx-auto">
                            Sambil menunggu jadwal Tryout Akbar berikutnya, asah instingmu dengan simulasi mandiri. Beli token sekarang dan latihan kapan pun kamu mau.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button asChild size="lg" variant="white">
                                <Link href="/cpns/full-tryout">Beli Token Tryout</Link>
                            </Button>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
}
