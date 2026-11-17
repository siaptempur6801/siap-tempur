import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/utils/supabase/server";
import { protectedHref } from "@/lib/protected-href";
import { ArrowRight, BarChart3, CheckCircle2, Clock3, Target, Zap } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import SeoNavbar from "@/components/SeoNavbar";
import { Button } from "@/components/ui/Button";

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
    { icon: Target, title: "Fokus pada satu bagian", text: "Pilih Mini Tryout yang sesuai saat kamu ingin mengukur TWK, TIU, atau TKP tanpa harus memulai Full Tryout.", tone: "bg-yellow-100 text-amber-800" },
    { icon: Clock3, title: "Sesi lebih ringkas", text: "Gunakan Mini Tryout ketika kamu ingin tetap berlatih tetapi belum ingin mengerjakan sesi penuh.", tone: "bg-blue-100 text-blue-700" },
    { icon: BarChart3, title: "Gunakan hasil untuk memilih latihan", text: "Setelah selesai, lihat hasil yang tersedia dan lanjutkan ke latihan yang paling relevan untukmu.", tone: "bg-emerald-100 text-emerald-700" },
] as const;

export default async function MiniTryoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const authed = Boolean(user)

    return (
        <main data-experience-mode="marketing" data-program="cpns" className="st-product min-h-screen pb-20">
            <StructuredData data={faqSchema} />
            <SeoNavbar />

            <section className="relative overflow-hidden border-b-2 border-slate-900 px-4 pb-20 pt-32 text-center md:px-8 md:pb-24">
                <div className="pointer-events-none absolute -left-20 top-28 h-44 w-44 rounded-full border-2 border-dashed border-yellow-500 bg-yellow-50" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-20 bottom-[-4rem] h-56 w-56 -rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                <div className="relative mx-auto max-w-5xl">
                    <span className="st-kicker"><Zap className="h-4 w-4" /> Mini Tryout CPNS</span>
                    <h1 className="st-heading-display mx-auto mt-7 max-w-4xl text-5xl md:text-7xl">Ukur satu bagian tanpa harus Full Tryout.</h1>
                    <p className="st-muted mx-auto mt-6 max-w-3xl text-lg font-semibold leading-relaxed md:text-xl">Gunakan Mini Tryout untuk melihat kemampuanmu pada bagian tertentu, lalu tentukan apakah kamu perlu Latihan Fokus atau sudah siap mencoba sesi yang lebih lengkap.</p>
                    <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="w-full sm:w-auto" asChild>
                            <Link href={protectedHref('/cpns/dashboard/mini-tryout', authed)}>Mulai Mini Tryout <ArrowRight className="h-5 w-5" /></Link>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                            <Link href="/cpns/full-tryout">Bandingkan dengan Full Tryout</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Kapan digunakan?</p>
                        <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Saat kamu ingin mengukur, bukan menebak.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold">Mini Tryout membantu memberi gambaran sebelum kamu menentukan latihan berikutnya.</p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {benefits.map(({ icon: Icon, title, text, tone }) => (
                            <article key={title} className="st-card p-6">
                                <div className={`flex h-12 w-12 items-center justify-center border-2 border-slate-900 ${tone}`}><Icon className="h-6 w-6" /></div>
                                <h3 className="st-heading mt-5 text-xl">{title}</h3>
                                <p className="st-muted mt-3 font-semibold leading-relaxed">{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="st-section-soft px-4 py-16 md:px-8 md:py-20">
                <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
                    <CompareCard icon={<Zap size={18} />} label="Mini Tryout" title="Untuk mengukur lebih spesifik" items={["Pilih bagian yang ingin kamu ukur.", "Sesi lebih ringkas daripada Full Tryout.", "Cocok sebagai penghubung antara Latihan Fokus dan Full Tryout."]} />
                    <CompareCard icon={<Clock3 size={18} />} label="Full Tryout" title="Untuk mengukur sesi yang lebih lengkap" items={["TWK, TIU, dan TKP dalam satu sesi.", "Membutuhkan komitmen waktu lebih panjang.", "Gunakan hasilnya sebagai evaluasi persiapan secara keseluruhan."]} href="/cpns/full-tryout" />
                </div>
            </section>

            <section className="px-4 py-16 text-center md:px-8 md:py-24">
                <div className="mx-auto max-w-3xl">
                    <h2 className="st-heading-display text-4xl md:text-5xl">Pilih Mini Tryout dari akunmu.</h2>
                    <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Detail sesi dan kebutuhan token akan ditampilkan sebelum kamu memulai, sehingga kamu bisa memilih latihan yang sesuai tanpa menebak biaya atau aturan akses.</p>
                    <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="w-full sm:w-auto" asChild><Link href={protectedHref('/cpns/dashboard/mini-tryout', authed)}>Lihat Mini Tryout</Link></Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild><Link href={protectedHref('/cpns/dashboard/beli-paket', authed)}>Lihat paket token</Link></Button>
                    </div>
                </div>
            </section>
        </main>
    );
}

function CompareCard({ icon, label, title, items, href }: { icon: React.ReactNode; label: string; title: string; items: string[]; href?: string }) {
    return (
        <article className="st-card-md p-6">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{icon} {label}</div>
            <h2 className="st-heading mt-3 text-2xl">{title}</h2>
            <ul className="st-muted mt-5 space-y-3 font-semibold">
                {items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> {item}</li>)}
            </ul>
            {href && <Link href={href} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline">Lihat Full Tryout <ArrowRight size={16} /></Link>}
        </article>
    );
}
