import Link from 'next/link'
import type { Metadata } from 'next'
import {
    ArrowRight,
    BookOpenCheck,
    CheckCircle2,
    GraduationCap,
    ShieldCheck,
    Sparkles,
    Target,
} from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
    title: 'SiapTempur - Persiapan CPNS & TKA',
    description: 'Satu akun untuk persiapan CPNS/SKD dan TKA SMP dengan tryout, latihan terarah, pembahasan, dan analisis progress.',
    alternates: { canonical: '/' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const productCards = [
    {
        code: 'CPNS / SKD',
        title: 'SiapTempur CPNS',
        description: 'Drill TWK, TIU, TKP, Mini Tryout, Full Tryout SKD, pembahasan, history, dan ranking dalam satu jalur.',
        href: '/cpns',
        cta: 'Lihat CPNS',
        icon: Target,
        badge: 'Production V1',
        accent: 'bg-yellow-200',
    },
    {
        code: 'TKA / SMP',
        title: 'SiapTempur TKA SMP',
        description: 'Full Tryout, Mini Tryout, salah-soal, remedial, mastery, rekomendasi, readiness, dan progress dashboard.',
        href: '/tka',
        cta: 'Lihat TKA',
        icon: GraduationCap,
        badge: 'Production V1',
        accent: 'bg-cyan-200',
    },
] as const

export default async function Index() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <main className="min-h-screen bg-[#fdfbf7] text-gray-900">
            <header className="border-b-2 border-gray-900 bg-[#fdfbf7]/95">
                <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
                    <Link href="/" className="font-handwriting text-3xl font-black tracking-tight">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm font-black md:flex">
                        <Link href="/cpns" className="hover:text-blue-700">CPNS</Link>
                        <Link href="/tka" className="hover:text-blue-700">TKA</Link>
                        <Link href="/blog" className="hover:text-blue-700">Artikel</Link>
                    </nav>
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <Link
                                    href="/cpns/dashboard"
                                    className="hidden border-2 border-gray-900 bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none sm:inline-flex"
                                >
                                    Dashboard CPNS
                                </Link>
                                <Link
                                    href="/tka/smp"
                                    className="border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#3b82f6] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                                >
                                    TKA SMP
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login?returnTo=%2F"
                                    className="border-2 border-gray-900 bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                                >
                                    Masuk
                                </Link>
                                <Link
                                    href="/register?returnTo=%2F"
                                    className="hidden border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#3b82f6] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none sm:inline-flex"
                                >
                                    Daftar Gratis
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden border-b-2 border-gray-900 px-4 py-16 md:px-8 md:py-24">
                <div className="absolute -right-24 top-8 h-64 w-64 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                <div className="absolute -left-20 bottom-6 h-48 w-48 -rotate-6 rounded-full border-2 border-dashed border-yellow-400 bg-yellow-50" aria-hidden="true" />
                <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                        <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-200 px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#111]">
                            <Sparkles size={15} /> Satu akun, dua medan tempur
                        </div>
                        <h1 className="mt-6 max-w-5xl font-handwriting text-5xl font-black leading-[0.98] md:text-7xl">
                            Belajar lebih terarah. Tempur lebih siap.
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg font-semibold leading-relaxed text-gray-600 md:text-xl">
                            SiapTempur menyatukan persiapan CPNS/SKD dan TKA SMP dalam satu akun. Pilih jalurmu, latihan, ikut tryout, lalu lihat bagian mana yang harus diperbaiki berikutnya.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/cpns"
                                className="inline-flex items-center gap-2 border-2 border-gray-900 bg-blue-600 px-5 py-3 font-black text-white shadow-[5px_5px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                            >
                                Mulai dari CPNS <ArrowRight size={18} />
                            </Link>
                            <Link
                                href="/tka"
                                className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-5 py-3 font-black shadow-[5px_5px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                            >
                                Lihat TKA SMP <BookOpenCheck size={18} />
                            </Link>
                        </div>
                    </div>

                    <div className="rotate-1 border-2 border-gray-900 bg-white p-6 shadow-[10px_10px_0_0_#111] md:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Production V1</p>
                        <h2 className="mt-2 font-handwriting text-4xl font-black">Fokus yang sudah siap dipakai.</h2>
                        <div className="mt-6 space-y-4">
                            {[
                                'CPNS: Drill, Mini Tryout, Full SKD, result & pembahasan',
                                'TKA SMP: Full/Mini Tryout, learning loop & readiness',
                                'Satu akun dan progress terpisah per track',
                                'Commerce, event, entitlement, dan Admin Workspace terintegrasi',
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3 border-b border-dashed border-gray-300 pb-4 last:border-b-0 last:pb-0">
                                    <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={20} />
                                    <span className="font-bold leading-relaxed text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-14 md:px-8 md:py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Pilih jalur</span>
                        <h2 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Kamu mau tempur di mana?</h2>
                        <p className="mt-3 font-semibold text-gray-600">Tidak perlu membuat akun berbeda. Satu akun dapat menyimpan progress untuk jalur yang kamu aktifkan.</p>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        {productCards.map((product) => {
                            const Icon = product.icon
                            return (
                                <Link
                                    key={product.code}
                                    href={product.href}
                                    className="group border-2 border-gray-900 bg-white p-6 shadow-[7px_7px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none md:p-8"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className={`flex h-14 w-14 items-center justify-center border-2 border-gray-900 ${product.accent}`}>
                                            <Icon size={29} />
                                        </div>
                                        <span className="border-2 border-gray-900 bg-green-100 px-3 py-1 text-xs font-black uppercase">{product.badge}</span>
                                    </div>
                                    <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-gray-500">{product.code}</p>
                                    <h3 className="mt-1 font-handwriting text-4xl font-black">{product.title}</h3>
                                    <p className="mt-3 min-h-20 font-semibold leading-relaxed text-gray-600">{product.description}</p>
                                    <span className="mt-5 inline-flex items-center gap-2 font-black text-blue-700">
                                        {product.cta} <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="border-y-2 border-gray-900 bg-blue-50 px-4 py-14 md:px-8">
                <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
                    {[
                        { icon: ShieldCheck, title: 'Masuk sekali', text: 'Login email/password atau Google, lalu kembali ke jalur yang tadi kamu pilih.' },
                        { icon: BookOpenCheck, title: 'Aktifkan jalur', text: 'CPNS dan TKA menyimpan konteks, progress, attempt, serta entitlement secara terpisah.' },
                        { icon: CheckCircle2, title: 'Belajar dari hasil', text: 'Tryout bukan titik akhir: pembahasan, salah-soal, remedial, dan readiness membantu menentukan langkah berikutnya.' },
                    ].map(({ icon: Icon, title, text }, index) => (
                        <article key={title} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center border-2 border-gray-900 bg-yellow-200 font-black">{index + 1}</div>
                                <Icon size={22} />
                            </div>
                            <h3 className="mt-4 text-xl font-black">{title}</h3>
                            <p className="mt-2 font-semibold leading-relaxed text-gray-600">{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <footer className="px-4 py-8 md:px-8">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm font-semibold text-gray-600">
                    <span>© SiapTempur Indonesia</span>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/syarat-ketentuan" className="hover:text-gray-900">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-gray-900">Kebijakan Privasi</Link>
                        <Link href="/blog" className="hover:text-gray-900">Artikel</Link>
                    </div>
                </div>
            </footer>
        </main>
    )
}
