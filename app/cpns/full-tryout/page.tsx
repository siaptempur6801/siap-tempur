import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Monitor, Target, CheckCircle2, Award, Activity } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import SeoNavbar from "@/components/SeoNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
    title: "Full Tryout SKD CPNS 2026: Simulasi CAT BKN Asli | SiapTempur",
    description: "Ikuti simulasi Full Tryout SKD CPNS dengan 110 soal, timer 100 menit, sistem CAT BKN, skor otomatis, dan ranking nasional. Siapkan dirimu maksimal dengan SiapTempur.",
};

const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Token Full Tryout SKD CPNS",
    "description": "Token akses untuk mengikuti simulasi Full Tryout SKD CPNS dengan sistem CAT BKN, ranking nasional, dan pembahasan komprehensif.",
    "brand": {
        "@type": "Brand",
        "name": "SiapTempur"
    },
    "offers": {
        "@type": "Offer",
        "url": "https://siaptempur.id/cpns/full-tryout",
        "priceCurrency": "IDR",
        "price": "10000.00",
        "availability": "https://schema.org/InStock"
    }
};

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Berapa lama durasi Full Tryout SKD?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sesuai dengan ketentuan resmi BKN, durasi pengerjaan Full Tryout SKD adalah 100 menit untuk menjawab 110 soal."
            }
        },
        {
            "@type": "Question",
            "name": "Bagaimana sistem penilaian di Full Tryout?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sistem penilaian 100% mengikuti CAT BKN, termasuk ketentuan poin benar/salah pada TWK dan TIU, serta gradasi poin 1-5 pada soal TKP. Nilai akhirnya akan dibandingkan dengan Passing Grade."
            }
        }
    ]
};

export default function FullTryoutPage() {
    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 pb-20">
            <StructuredData data={productSchema} />
            <StructuredData data={faqSchema} />

            <SeoNavbar />

            {/* HERO SECTION */}
            <Section paper className="pt-32 pb-20 text-center relative overflow-hidden">
                <div className="absolute top-10 left-10 md:left-20 opacity-20"><Monitor size={100} /></div>
                <div className="absolute bottom-10 right-10 md:right-20 opacity-20"><Award size={120} /></div>
                
                <Badge variant="blue" className="mb-6 inline-flex items-center gap-2 px-4 py-1 relative z-10">
                    <CheckCircle2 className="w-4 h-4" /> 100% Sesuai Standar BKN
                </Badge>
                <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 max-w-5xl mx-auto leading-tight relative z-10">
                    Simulasi Tryout SKD CPNS Mirip CAT BKN Asli
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-10 font-handwriting leading-relaxed relative z-10">
                    Uji kesiapanmu dengan 110 soal berstandar nasional, 100 menit timer berjalan, dan langsung ketahui apakah kamu melewati Passing Grade atau belum.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                    <Button size="lg" className="w-full sm:w-auto text-xl py-6" asChild>
                        <Link href="/login?returnTo=/cpns/dashboard">Mulai Full Tryout <ArrowRight className="ml-2 w-5 h-5" /></Link>
                    </Button>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto text-xl py-6 border-2 border-gray-900" asChild>
                        <Link href="/login?returnTo=/cpns">Beli Token</Link>
                    </Button>
                </div>
            </Section>

            {/* WHY FULL TRYOUT */}
            <Section className="bg-white">
                <div className="text-center mb-16">
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Mengapa Harus Full Tryout di SiapTempur?</h2>
                    <p className="font-handwriting text-xl text-gray-600 max-w-2xl mx-auto">Dirancang untuk membuatmu terbiasa dengan tekanan ujian yang sesungguhnya.</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    <Card className="p-6 border-2 border-gray-900 bg-blue-50 text-center hover:bg-blue-100 transition-colors">
                        <Monitor className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                        <h3 className="font-handwriting font-bold text-xl mb-2">Interface CAT 100% Mirip BKN</h3>
                        <p className="text-sm text-gray-600">Navigasi soal, tombol ragu-ragu, dan timer dirancang semirip mungkin dengan aslinya.</p>
                    </Card>
                    <Card className="p-6 border-2 border-gray-900 bg-red-50 text-center hover:bg-red-100 transition-colors">
                        <Target className="w-12 h-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-handwriting font-bold text-xl mb-2">Soal HOTS Terupdate</h3>
                        <p className="text-sm text-gray-600">Proporsi soal TWK, TIU, dan TKP diracik sesuai dengan kisi-kisi dan FR tahun terakhir.</p>
                    </Card>
                    <Card className="p-6 border-2 border-gray-900 bg-yellow-50 text-center hover:bg-yellow-100 transition-colors">
                        <Award className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                        <h3 className="font-handwriting font-bold text-xl mb-2">Skor & Ranking Instan</h3>
                        <p className="text-sm text-gray-600">Selesai ujian, skor akhir langsung keluar lengkap dengan status lulus Passing Grade.</p>
                    </Card>
                    <Card className="p-6 border-2 border-gray-900 bg-green-50 text-center hover:bg-green-100 transition-colors">
                        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h3 className="font-handwriting font-bold text-xl mb-2">Pembahasan Super Jelas</h3>
                        <p className="text-sm text-gray-600">Pelajari letak kesalahanmu dengan pembahasan rinci untuk setiap butir soal.</p>
                    </Card>
                </div>
            </Section>

            {/* ANALISIS HASIL */}
            <Section dashedBorder="both" className="bg-[#f0f4f8]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="md:w-1/2">
                        <Badge variant="green" className="mb-4">Fitur Premium</Badge>
                        <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-6 leading-tight">Analisis Kelemahanmu Lebih Cepat</h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Mengerjakan tryout saja tidak cukup jika kamu tidak tahu di mana kelemahanmu. Sistem kami akan menganalisis kecepatan menjawab dan akurasi per subtes.
                        </p>
                        <ul className="space-y-3 text-gray-700 font-medium">
                            <li className="flex items-center gap-2"><Activity className="text-blue-500 w-5 h-5"/> Evaluasi waktu pengerjaan per bagian</li>
                            <li className="flex items-center gap-2"><Activity className="text-blue-500 w-5 h-5"/> Rincian skor TWK, TIU, TKP</li>
                            <li className="flex items-center gap-2"><Activity className="text-blue-500 w-5 h-5"/> Pemetaan kekuatan vs kelemahan materi</li>
                        </ul>
                    </div>
                    <div className="md:w-1/2 w-full">
                        {/* Dummy Spider Chart Graphic */}
                        <div className="bg-white p-6 rounded-xl border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative aspect-square max-w-sm mx-auto flex items-center justify-center">
                            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px] opacity-50"></div>
                            <div className="text-center z-10">
                                <div className="text-6xl mb-4">📊</div>
                                <div className="font-handwriting font-bold text-xl text-gray-800">Visualisasi Analisis Nilai</div>
                                <div className="text-sm text-gray-500 mt-2">(Akan muncul setelah ujian selesai)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* BIAYA TOKEN */}
            <Section className="bg-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="font-handwriting text-4xl font-bold mb-4">1 Token, Akses Selamanya</h2>
                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                        Tidak ada sistem langganan bulanan yang mencekik. Hanya <strong className="bg-yellow-200 px-1">Rp 10.000 / token</strong> untuk sekali ujian SKD komprehensif. Beli sekarang, kerjakan nanti kapanpun kamu siap.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" className="w-full sm:w-auto text-xl py-6 flex-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" asChild>
                            <Link href="/login?returnTo=/cpns">Beli Token</Link>
                        </Button>
                        <Button size="lg" variant="secondary" className="w-full sm:w-auto text-xl py-6 flex-1 border-2 border-gray-900" asChild>
                            <Link href="/cpns#active-event">Cari Event Tryout Akbar</Link>
                        </Button>
                    </div>
                </div>
            </Section>
        </main>
    );
}
