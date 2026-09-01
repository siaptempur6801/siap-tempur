import { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    CheckCircle2,
    Clock3,
    RotateCcw,
    Target,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import SeoNavbar from "@/components/SeoNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
    title: "Full Tryout SKD CPNS | SiapTempur",
    description:
        "Latihan full tryout SKD CPNS untuk TWK, TIU, dan TKP dengan batas waktu, hasil per bagian, pembahasan, dan riwayat pengerjaan.",
};

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Apa yang saya dapat setelah menyelesaikan full tryout?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Setelah sesi selesai, kamu dapat melihat hasil, rincian skor per bagian yang tersedia, dan pembahasan jawaban untuk membantu menentukan latihan berikutnya.",
            },
        },
        {
            "@type": "Question",
            "name": "Apakah saya bisa melanjutkan sesi yang belum selesai?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Jika sesi masih aktif dan dapat dilanjutkan, SiapTempur akan mengarahkan kamu kembali ke sesi tersebut. Ketentuan sesi tetap mengikuti aturan tryout yang sedang digunakan.",
            },
        },
    ],
};

const benefits = [
    {
        icon: Clock3,
        title: "Latihan dengan batas waktu",
        text: "Biasakan mengatur waktu dan mengambil keputusan saat mengerjakan soal dalam sesi penuh.",
        surface: "bg-blue-50",
    },
    {
        icon: Target,
        title: "TWK, TIU, dan TKP",
        text: "Kerjakan tiga bagian SKD dalam satu alur tryout agar hasilmu lebih mudah dibandingkan dan ditinjau.",
        surface: "bg-yellow-50",
    },
    {
        icon: BarChart3,
        title: "Hasil yang mudah dibaca",
        text: "Lihat total skor dan rincian hasil per bagian yang tersedia setelah sesi selesai.",
        surface: "bg-green-50",
    },
    {
        icon: BookOpenCheck,
        title: "Belajar dari pembahasan",
        text: "Tinjau jawaban dan pembahasan untuk memahami bagian yang masih perlu kamu perbaiki.",
        surface: "bg-cyan-50",
    },
] as const;

export default function FullTryoutPage() {
    return (
        <main
            data-experience-mode="marketing"
            className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 pb-20"
        >
            <StructuredData data={faqSchema} />
            <SeoNavbar />

            <Section paper className="pt-32 pb-20 relative overflow-hidden">
                <div className="px-4 text-center max-w-5xl mx-auto">
                    <Badge variant="blue" className="mb-6 inline-flex items-center gap-2 px-4 py-1">
                        <CheckCircle2 className="w-4 h-4" /> Full tryout SKD
                    </Badge>

                    <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 leading-tight text-gray-900">
                        Jangan berhenti di skor.
                        <span className="block text-blue-600">Belajar dari hasil tryout-mu.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                        Kerjakan full tryout TWK, TIU, dan TKP dengan batas waktu. Setelah selesai, lihat hasil dan pembahasan untuk menentukan bagian yang perlu kamu perbaiki berikutnya.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" handwriting={false} className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/tryout">
                                Mulai full tryout <ArrowRight className="w-5 h-5" />
                            </Link>
                        </Button>
                        <Button size="lg" handwriting={false} variant="outline" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/beli-paket">Lihat paket token</Link>
                        </Button>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-gray-500">
                        Kamu akan diminta masuk terlebih dahulu agar sesi dan hasil belajarmu tersimpan.
                    </p>
                </div>
            </Section>

            <Section className="bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700 mb-2">Cara kerjanya</p>
                        <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">
                            Tryout adalah awal dari proses belajar.
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Tujuannya bukan sekadar menyelesaikan banyak soal, tetapi memahami hasil dan memperbaiki bagian yang masih lemah.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {benefits.map(({ icon: Icon, title, text, surface }) => (
                            <Card key={title} className={`p-6 border-2 border-gray-900 ${surface}`}>
                                <div className="w-12 h-12 border-2 border-gray-900 bg-white flex items-center justify-center mb-4">
                                    <Icon className="w-6 h-6 text-blue-700" />
                                </div>
                                <h3 className="font-bold text-xl mb-2">{title}</h3>
                                <p className="text-sm leading-relaxed text-gray-600">{text}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>

            <Section dashedBorder="both" className="bg-blue-50">
                <div className="max-w-5xl mx-auto px-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <Badge variant="yellow" className="mb-4">Setelah tryout</Badge>
                        <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-5 leading-tight">
                            Ubah hasil menjadi langkah belajar berikutnya.
                        </h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Buka hasil tryout, periksa skor setiap bagian, lalu pelajari pembahasan soal. Gunakan informasi itu untuk memilih latihan yang paling relevan sebelum mencoba full tryout lagi.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="border-2 border-gray-900 bg-white p-5 shadow-[3px_3px_0_0_#111]">
                            <BarChart3 className="w-6 h-6 text-blue-700 mb-3" />
                            <div className="text-sm font-black text-gray-500">1. Ukur</div>
                            <div className="mt-1 font-bold">Lihat hasilmu</div>
                        </div>
                        <div className="border-2 border-gray-900 bg-white p-5 shadow-[3px_3px_0_0_#111]">
                            <BookOpenCheck className="w-6 h-6 text-blue-700 mb-3" />
                            <div className="text-sm font-black text-gray-500">2. Pelajari</div>
                            <div className="mt-1 font-bold">Tinjau pembahasan</div>
                        </div>
                        <div className="border-2 border-gray-900 bg-white p-5 shadow-[3px_3px_0_0_#111]">
                            <RotateCcw className="w-6 h-6 text-blue-700 mb-3" />
                            <div className="text-sm font-black text-gray-500">3. Perbaiki</div>
                            <div className="mt-1 font-bold">Latihan lalu coba lagi</div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section className="bg-white">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">
                        Siap mengukur kemampuanmu?
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Mulai full tryout saat kamu siap. Jika token belum tersedia, kamu bisa melihat pilihan paket terlebih dahulu.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" handwriting={false} className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/tryout">
                                Mulai full tryout <ArrowRight className="w-5 h-5" />
                            </Link>
                        </Button>
                        <Button size="lg" handwriting={false} variant="secondary" className="w-full sm:w-auto" asChild>
                            <Link href="/cpns">Kembali ke persiapan CPNS</Link>
                        </Button>
                    </div>
                </div>
            </Section>
        </main>
    );
}
