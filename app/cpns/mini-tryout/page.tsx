import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Clock3, Target, Zap } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import SeoNavbar from "@/components/SeoNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
    title: "Mini Tryout CPNS - TWK, TIU & TKP | SiapTempur",
    description:
        "Gunakan mini tryout CPNS untuk mengukur TWK, TIU, atau TKP dalam sesi yang lebih ringkas sebelum melanjutkan ke full tryout.",
};

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Kapan sebaiknya menggunakan mini tryout?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mini tryout cocok ketika kamu ingin mengukur satu bagian dalam sesi yang lebih ringkas sebelum beralih ke full tryout atau latihan fokus.",
            },
        },
        {
            "@type": "Question",
            "name": "Apa bedanya mini tryout dan full tryout?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mini tryout membantu mengukur bagian tertentu dalam sesi yang lebih ringkas, sedangkan full tryout menggabungkan TWK, TIU, dan TKP dalam satu sesi yang lebih lengkap.",
            },
        },
    ],
};

const benefits = [
    {
        icon: Target,
        title: "Fokus pada satu bagian",
        text: "Pilih mini tryout yang sesuai saat kamu ingin mengukur TWK, TIU, atau TKP tanpa harus memulai full tryout.",
        surface: "bg-yellow-50",
    },
    {
        icon: Clock3,
        title: "Sesi lebih ringkas",
        text: "Gunakan mini tryout ketika kamu ingin tetap berlatih tetapi belum ingin mengerjakan sesi penuh.",
        surface: "bg-blue-50",
    },
    {
        icon: BarChart3,
        title: "Gunakan hasil untuk memilih latihan",
        text: "Setelah selesai, lihat hasil yang tersedia dan lanjutkan ke latihan yang paling relevan untukmu.",
        surface: "bg-green-50",
    },
] as const;

export default function MiniTryoutPage() {
    return (
        <main data-experience-mode="marketing" className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 pb-20">
            <StructuredData data={faqSchema} />
            <SeoNavbar />

            <Section paper className="pt-32 pb-20 text-center">
                <div className="max-w-5xl mx-auto px-4">
                    <Badge variant="yellow" className="mb-6 inline-flex items-center gap-2 px-4 py-1">
                        <Zap className="w-4 h-4" /> Mini tryout CPNS
                    </Badge>
                    <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 leading-tight">
                        Ukur satu bagian tanpa harus full tryout.
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                        Gunakan mini tryout untuk melihat kemampuanmu pada bagian tertentu, lalu tentukan apakah kamu perlu latihan fokus atau sudah siap mencoba sesi yang lebih lengkap.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button handwriting={false} size="lg" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/mini-tryout">
                                Mulai mini tryout <ArrowRight className="w-5 h-5" />
                            </Link>
                        </Button>
                        <Button handwriting={false} size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                            <Link href="/cpns/full-tryout">Bandingkan dengan full tryout</Link>
                        </Button>
                    </div>
                </div>
            </Section>

            <Section className="bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 mb-2">Kapan digunakan?</p>
                        <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Saat kamu ingin mengukur, bukan menebak.</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Mini tryout membantu memberi gambaran sebelum kamu menentukan latihan berikutnya.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {benefits.map(({ icon: Icon, title, text, surface }) => (
                            <Card key={title} className={`p-6 border-2 border-gray-900 ${surface}`}>
                                <div className="w-12 h-12 bg-white border-2 border-gray-900 flex items-center justify-center mb-5">
                                    <Icon className="w-6 h-6 text-blue-700" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{title}</h3>
                                <p className="text-gray-600 leading-relaxed">{text}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>

            <Section dashedBorder="both" className="bg-blue-50">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <article className="border-2 border-gray-900 bg-white p-6 shadow-[4px_4px_0_0_#111]">
                            <div className="inline-flex items-center gap-2 text-sm font-black text-yellow-700">
                                <Zap size={18} /> Mini tryout
                            </div>
                            <h2 className="mt-3 text-2xl font-black">Untuk mengukur lebih spesifik</h2>
                            <ul className="mt-5 space-y-3 text-gray-600 font-semibold">
                                <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" /> Pilih bagian yang ingin kamu ukur.</li>
                                <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" /> Sesi lebih ringkas daripada full tryout.</li>
                                <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" /> Cocok sebagai penghubung antara latihan fokus dan full tryout.</li>
                            </ul>
                        </article>

                        <article className="border-2 border-gray-900 bg-white p-6 shadow-[4px_4px_0_0_#111]">
                            <div className="inline-flex items-center gap-2 text-sm font-black text-blue-700">
                                <Clock3 size={18} /> Full tryout
                            </div>
                            <h2 className="mt-3 text-2xl font-black">Untuk mengukur sesi yang lebih lengkap</h2>
                            <ul className="mt-5 space-y-3 text-gray-600 font-semibold">
                                <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" /> TWK, TIU, dan TKP dalam satu sesi.</li>
                                <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" /> Membutuhkan komitmen waktu lebih panjang.</li>
                                <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" /> Gunakan hasilnya sebagai evaluasi persiapan secara keseluruhan.</li>
                            </ul>
                            <Link href="/cpns/full-tryout" className="mt-5 inline-flex items-center gap-2 font-black text-blue-700 hover:underline">
                                Lihat full tryout <ArrowRight size={16} />
                            </Link>
                        </article>
                    </div>
                </div>
            </Section>

            <Section className="bg-white text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Pilih mini tryout dari akunmu.</h2>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        Detail sesi dan kebutuhan token akan ditampilkan sebelum kamu memulai, sehingga kamu bisa memilih latihan yang sesuai tanpa menebak biaya atau aturan akses.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button handwriting={false} size="lg" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/mini-tryout">Lihat mini tryout</Link>
                        </Button>
                        <Button handwriting={false} size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/beli-paket">Lihat paket token</Link>
                        </Button>
                    </div>
                </div>
            </Section>
        </main>
    );
}
