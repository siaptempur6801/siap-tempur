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
        tone: "bg-blue-100 text-blue-700",
    },
    {
        icon: Target,
        title: "TWK, TIU, dan TKP",
        text: "Kerjakan tiga bagian SKD dalam satu alur tryout agar hasilmu lebih mudah dibandingkan dan ditinjau.",
        tone: "bg-yellow-100 text-amber-800",
    },
    {
        icon: BarChart3,
        title: "Hasil yang mudah dibaca",
        text: "Lihat total skor dan rincian hasil per bagian yang tersedia setelah sesi selesai.",
        tone: "bg-emerald-100 text-emerald-700",
    },
    {
        icon: BookOpenCheck,
        title: "Belajar dari pembahasan",
        text: "Tinjau jawaban dan pembahasan untuk memahami bagian yang masih perlu kamu perbaiki.",
        tone: "bg-blue-100 text-blue-800",
    },
] as const;

export default function FullTryoutPage() {
    return (
        <main data-experience-mode="marketing" data-program="cpns" className="st-product min-h-screen pb-20">
            <StructuredData data={faqSchema} />
            <SeoNavbar />

            <section className="relative overflow-hidden border-b-2 border-slate-900 px-4 pb-20 pt-32 md:px-8 md:pb-24">
                <div className="pointer-events-none absolute -left-24 bottom-[-5rem] h-52 w-52 rounded-full border-2 border-dashed border-yellow-500 bg-yellow-50" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-20 top-20 h-60 w-60 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                <div className="relative mx-auto max-w-5xl text-center">
                    <span className="st-kicker"><CheckCircle2 className="h-4 w-4" /> Full Tryout SKD</span>
                    <h1 className="st-heading-display mx-auto mt-7 max-w-4xl text-5xl md:text-7xl">
                        Jangan berhenti di skor.
                        <span className="block text-blue-600">Belajar dari hasil tryout-mu.</span>
                    </h1>
                    <p className="st-muted mx-auto mt-6 max-w-3xl text-lg font-semibold leading-relaxed md:text-xl">
                        Kerjakan Full Tryout TWK, TIU, dan TKP dengan batas waktu. Setelah selesai, lihat hasil dan pembahasan untuk menentukan bagian yang perlu kamu perbaiki berikutnya.
                    </p>
                    <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/tryout">
                                Mulai Full Tryout <ArrowRight className="h-5 w-5" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/beli-paket">Lihat paket token</Link>
                        </Button>
                    </div>
                    <p className="st-muted mt-4 text-sm font-bold">Kamu akan diminta masuk terlebih dahulu agar sesi dan hasil belajarmu tersimpan.</p>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Cara kerjanya</p>
                        <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Tryout adalah awal dari proses belajar.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Tujuannya bukan sekadar menyelesaikan banyak soal, tetapi memahami hasil dan memperbaiki bagian yang masih lemah.</p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {benefits.map(({ icon: Icon, title, text, tone }) => (
                            <article key={title} className="st-card p-6">
                                <div className={`flex h-12 w-12 items-center justify-center border-2 border-slate-900 ${tone}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="st-heading mt-4 text-xl">{title}</h3>
                                <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="st-section-soft px-4 py-16 md:px-8 md:py-20">
                <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <span className="st-kicker">Setelah tryout</span>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Ubah hasil menjadi langkah belajar berikutnya.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Buka hasil tryout, periksa skor setiap bagian, lalu pelajari pembahasan soal. Gunakan informasi itu untuk memilih latihan yang paling relevan sebelum mencoba Full Tryout lagi.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <StepCard icon={<BarChart3 className="h-6 w-6" />} number="1" title="Ukur" text="Lihat hasilmu" />
                        <StepCard icon={<BookOpenCheck className="h-6 w-6" />} number="2" title="Pelajari" text="Tinjau pembahasan" />
                        <StepCard icon={<RotateCcw className="h-6 w-6" />} number="3" title="Perbaiki" text="Latihan lalu coba lagi" />
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="st-heading-display text-4xl md:text-5xl">Siap mengukur kemampuanmu?</h2>
                    <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Mulai Full Tryout saat kamu siap. Jika token belum tersedia, kamu bisa melihat pilihan paket terlebih dahulu.</p>
                    <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="w-full sm:w-auto" asChild>
                            <Link href="/login?returnTo=/cpns/dashboard/tryout">Mulai Full Tryout <ArrowRight className="h-5 w-5" /></Link>
                        </Button>
                        <Button size="lg" variant="secondary" className="w-full sm:w-auto" asChild>
                            <Link href="/cpns">Kembali ke persiapan CPNS</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}

function StepCard({ icon, number, title, text }: { icon: React.ReactNode; number: string; title: string; text: string }) {
    return (
        <article className="st-card p-5">
            <div className="text-blue-700">{icon}</div>
            <div className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">{number}. {title}</div>
            <div className="st-heading mt-1">{text}</div>
        </article>
    );
}
