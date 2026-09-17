import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Brain, CheckCircle2, Shield, Target, Users } from "lucide-react";
import SeoNavbar from "@/components/SeoNavbar";

export const metadata: Metadata = {
    title: "Latihan Fokus CPNS - TWK, TIU & TKP | SiapTempur",
    description:
        "Pilih latihan fokus CPNS untuk memperdalam TWK, TIU, atau TKP dan gunakan hasilnya sebagai bagian dari persiapan SKD yang lebih terarah.",
    alternates: {
        canonical: "/cpns/drilling-materi",
    },
};

const sections = [
    {
        code: "TWK",
        icon: Shield,
        title: "Latihan fokus TWK",
        text: "Pilih materi TWK yang tersedia ketika kamu ingin memperkuat bagian tertentu sebelum mini atau full tryout.",
        surface: "bg-red-50",
        iconSurface: "bg-red-100 text-red-700",
    },
    {
        code: "TIU",
        icon: Brain,
        title: "Latihan fokus TIU",
        text: "Gunakan latihan TIU untuk memberi perhatian lebih pada materi yang masih membutuhkan banyak latihan.",
        surface: "bg-blue-50",
        iconSurface: "bg-blue-100 text-blue-700",
    },
    {
        code: "TKP",
        icon: Users,
        title: "Latihan fokus TKP",
        text: "Latih TKP secara lebih terarah dan gunakan hasil latihan sebagai bahan evaluasi sebelum sesi berikutnya.",
        surface: "bg-green-50",
        iconSurface: "bg-green-100 text-green-700",
    },
] as const;

export default function DrillingMateriPage() {
    return (
        <div data-experience-mode="marketing" className="min-h-screen bg-[#fdfbf7]">
            <SeoNavbar />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-6xl">
                    <Link href="/cpns" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 font-body font-semibold transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke persiapan CPNS
                    </Link>

                    <section className="mb-14 text-center max-w-4xl mx-auto">
                        <Badge variant="blue" className="mb-5 inline-flex items-center gap-2">
                            <Target className="w-4 h-4" /> Latihan fokus
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-display font-bold mb-5 leading-tight">
                            Perbaiki satu bagian sebelum mencoba semuanya lagi.
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                            Pilih TWK, TIU, atau TKP ketika kamu ingin memberi waktu lebih banyak pada bagian tertentu. Setelah latihan, gunakan hasilnya untuk menentukan apakah kamu perlu mengulang atau lanjut ke tryout.
                        </p>
                        <Button handwriting={false} asChild size="lg" className="mt-8">
                            <Link href="/login?returnTo=/cpns/dashboard/drilling-materi">Mulai latihan fokus</Link>
                        </Button>
                    </section>

                    <Section dashedBorder="both" className="bg-white rounded-2xl border-2 border-gray-900 mb-14">
                        <div className="max-w-4xl mx-auto text-center px-4">
                            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Kapan latihan fokus paling berguna?</h2>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Gunakan latihan fokus setelah kamu menemukan bagian yang masih lemah, saat ingin mempelajari satu jenis materi lebih dalam, atau sebelum mengukur diri lagi lewat mini/full tryout.
                            </p>
                            <div className="mt-7 grid gap-3 md:grid-cols-3 text-left">
                                {[
                                    "Setelah melihat hasil tryout",
                                    "Saat satu bagian terasa lebih sulit",
                                    "Sebelum mencoba tryout berikutnya",
                                ].map((item) => (
                                    <div key={item} className="flex gap-3 border border-gray-300 bg-gray-50 p-4 font-semibold text-gray-700">
                                        <CheckCircle2 className="w-5 h-5 shrink-0 text-green-700" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    <section className="mb-16">
                        <div className="text-center mb-9">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 mb-2">Pilih bagian</p>
                            <h2 className="text-4xl md:text-5xl font-display font-bold">Fokus pada kebutuhanmu hari ini.</h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {sections.map(({ code, icon: Icon, title, text, surface, iconSurface }) => (
                                <Card key={code} className={`p-6 border-2 border-gray-900 flex flex-col ${surface}`}>
                                    <div className={`w-12 h-12 border-2 border-gray-900 flex items-center justify-center ${iconSurface}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-gray-500">{code}</div>
                                    <h3 className="mt-1 text-2xl font-bold">{title}</h3>
                                    <p className="mt-3 flex-1 text-gray-600 leading-relaxed">{text}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                    <Section dashedBorder="top" pattern="dots" className="text-center rounded-2xl bg-blue-50 border-2 border-gray-900">
                        <div className="max-w-3xl mx-auto px-4">
                            <Target className="w-10 h-10 text-blue-700 mx-auto mb-4" />
                            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Mulai dari bagian yang paling membutuhkan perhatian.</h2>
                            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                Masuk ke akunmu untuk melihat materi latihan yang tersedia. Detail akses atau kebutuhan token akan ditampilkan sebelum kamu memulai sesi.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button handwriting={false} asChild size="lg">
                                    <Link href="/login?returnTo=/cpns/dashboard/drilling-materi">Buka latihan fokus</Link>
                                </Button>
                                <Button handwriting={false} asChild size="lg" variant="outline">
                                    <Link href="/cpns/mini-tryout">Lihat mini tryout</Link>
                                </Button>
                            </div>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
}
