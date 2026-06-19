import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target, Clock, Zap, CheckCircle2, ChevronRight, Coins } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import SeoNavbar from "@/components/SeoNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
    title: "Mini Tryout CPNS: Latihan Soal TWK, TIU, TKP Singkat | SiapTempur",
    description: "Latihan soal CPNS singkat dan fleksibel dengan Mini Tryout. Fokus kerjakan TWK, TIU, atau TKP kapan saja. Cocok untuk cicil belajar di tengah kesibukan.",
};

const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Token Mini Tryout SKD CPNS",
    "description": "Token akses untuk mengikuti simulasi Mini Tryout CPNS per subtes (TWK/TIU/TKP) secara spesifik.",
    "brand": {
        "@type": "Brand",
        "name": "SiapTempur"
    },
    "offers": {
        "@type": "Offer",
        "url": "https://siaptempur.id/cpns/mini-tryout",
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
            "name": "Apa bedanya Mini Tryout dan Full Tryout?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mini Tryout adalah latihan cepat per subtes (TWK/TIU/TKP) dengan jumlah soal lebih sedikit, sedangkan Full Tryout adalah simulasi lengkap 110 soal dalam 100 menit dengan sistem CAT BKN."
            }
        },
        {
            "@type": "Question",
            "name": "Berapa lama durasi pengerjaan Mini Tryout?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Durasi disesuaikan dengan jenis subtes, biasanya berkisar antara 15 hingga 30 menit, sangat cocok dikerjakan di sela-sela kesibukan."
            }
        }
    ]
};

export default function MiniTryoutPage() {
    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 pb-20">
            <StructuredData data={productSchema} />
            <StructuredData data={faqSchema} />

            <SeoNavbar />

            {/* HERO SECTION */}
            <Section paper className="pt-32 pb-20 text-center">
                <Badge variant="yellow" className="mb-6 inline-flex items-center gap-2 px-4 py-1">
                    <Zap className="w-4 h-4" /> Latihan Cepat & Fleksibel
                </Badge>
                <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
                    Cicil Belajar CPNS Kapanpun dengan Mini Tryout
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-10 font-handwriting leading-relaxed">
                    Punya waktu cuma 15 menit? Manfaatkan untuk fokus sikat soal TWK, TIU, atau TKP. Belajar CPNS jadi lebih fleksibel dan bebas stres.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" className="w-full sm:w-auto text-xl py-6" asChild>
                        <Link href="/login?returnTo=/cpns/dashboard">Mulai Mini Tryout <ArrowRight className="ml-2 w-5 h-5" /></Link>
                    </Button>
                </div>
            </Section>

            {/* APA ITU MINI TRYOUT */}
            <Section className="bg-white">
                <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                    <div>
                        <h2 className="font-handwriting text-4xl font-bold mb-6">Apa Itu Mini Tryout?</h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Banyak pejuang CPNS gagal karena memaksakan diri belajar 110 soal sekaligus padahal sedang sibuk. Mini Tryout dirancang untuk memecah materi raksasa SKD menjadi porsi-porsi kecil yang mudah dicerna.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-500 shrink-0 mt-1" />
                                <div>
                                    <strong className="block text-gray-900">Pilih Subtes Sendiri</strong>
                                    <span className="text-gray-600 text-sm">Bisa pilih khusus TWK, TIU, atau TKP sesuai materi yang belum kamu kuasai.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-500 shrink-0 mt-1" />
                                <div>
                                    <strong className="block text-gray-900">Waktu Singkat</strong>
                                    <span className="text-gray-600 text-sm">Hanya butuh 15-30 menit. Cocok dikerjakan saat jam istirahat kantor atau nunggu dosen.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <Card className="bg-blue-50 border-2 border-blue-200 p-8 transform rotate-2">
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded border border-gray-200 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded text-red-600 flex items-center justify-center font-bold font-handwriting">TWK</div>
                                    <div>
                                        <div className="font-bold">Mini Tryout Nasionalisme</div>
                                        <div className="text-xs text-gray-500">30 Soal • 20 Menit</div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">Kerjakan</Button>
                            </div>
                            <div className="bg-white p-4 rounded border flex justify-between items-center shadow-sm border-blue-500 ring-2 ring-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded text-blue-600 flex items-center justify-center font-bold font-handwriting">TIU</div>
                                    <div>
                                        <div className="font-bold">Mini Tryout Silogisme</div>
                                        <div className="text-xs text-gray-500">25 Soal • 25 Menit</div>
                                    </div>
                                </div>
                                <Button size="sm">Sedang Dikerjakan</Button>
                            </div>
                            <div className="bg-white p-4 rounded border border-gray-200 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded text-green-600 flex items-center justify-center font-bold font-handwriting">TKP</div>
                                    <div>
                                        <div className="font-bold">Mini Tryout Pelayanan Publik</div>
                                        <div className="text-xs text-gray-500">35 Soal • 25 Menit</div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">Kerjakan</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </Section>

            {/* MINI VS FULL */}
            <Section dashedBorder="both" className="bg-[#f0f4f8]">
                <div className="text-center mb-12">
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Mini Tryout vs Full Tryout</h2>
                    <p className="font-handwriting text-xl text-gray-600 max-w-2xl mx-auto">Ketahui mana yang kamu butuhkan hari ini.</p>
                </div>
                <div className="max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-0 border-4 border-gray-900 rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                        <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200 bg-yellow-50">
                            <h3 className="font-handwriting text-3xl font-bold mb-6 text-yellow-700 flex items-center gap-2"><Target /> Mini Tryout</h3>
                            <ul className="space-y-4 text-gray-700 font-medium">
                                <li className="flex justify-between border-b border-gray-200 pb-2"><span>Tujuan</span> <strong>Latihan Topik Spesifik</strong></li>
                                <li className="flex justify-between border-b border-gray-200 pb-2"><span>Jumlah Soal</span> <strong>20 - 35 Soal</strong></li>
                                <li className="flex justify-between border-b border-gray-200 pb-2"><span>Durasi</span> <strong>15 - 30 Menit</strong></li>
                                <li className="flex justify-between border-b border-gray-200 pb-2"><span>Sistem Penilaian</span> <strong>Skor Per Subtes</strong></li>
                                <li className="flex justify-between pb-2"><span>Kelebihan</span> <strong>Fleksibel, bisa nyicil</strong></li>
                            </ul>
                        </div>
                        <div className="p-8 bg-blue-50">
                            <h3 className="font-handwriting text-3xl font-bold mb-6 text-blue-700 flex items-center gap-2"><Clock /> Full Tryout</h3>
                            <ul className="space-y-4 text-gray-700 font-medium">
                                <li className="flex justify-between border-b border-blue-200 pb-2"><span>Tujuan</span> <strong>Simulasi & Mental Ujian</strong></li>
                                <li className="flex justify-between border-b border-blue-200 pb-2"><span>Jumlah Soal</span> <strong>110 Soal Lengkap</strong></li>
                                <li className="flex justify-between border-b border-blue-200 pb-2"><span>Durasi</span> <strong>100 Menit</strong></li>
                                <li className="flex justify-between border-b border-blue-200 pb-2"><span>Sistem Penilaian</span> <strong>Passing Grade BKN</strong></li>
                                <li className="flex justify-between pb-2"><span>Kelebihan</span> <strong>Ukur Ranking Nasional</strong></li>
                            </ul>
                            <div className="mt-6 text-center">
                                <Link href="/cpns/full-tryout" className="text-blue-600 font-bold hover:underline inline-flex items-center">Pelajari Full Tryout <ChevronRight size={16} /></Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* BIAYA TOKEN */}
            <Section className="bg-white text-center">
                <div className="max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Coins className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h2 className="font-handwriting text-4xl font-bold mb-4">Gunakan Token dengan Bijak</h2>
                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                        Akses Mini Tryout sangat mudah. Cukup gunakan token yang sudah kamu beli. <br/> <strong>1 Token bisa digunakan untuk mengakses 1 paket Mini Tryout pilihanmu.</strong>
                    </p>
                    <Button size="lg" className="w-full sm:w-auto text-xl py-6" asChild>
                        <Link href="/login?returnTo=/cpns">Beli Token Sekarang</Link>
                    </Button>
                </div>
            </Section>
        </main>
    );
}
