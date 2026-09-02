import Link from 'next/link'
import type { Metadata } from 'next'
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    CheckCircle2,
    ClipboardCheck,
    GraduationCap,
    Layers3,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Target,
    Trophy,
    Zap,
} from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
    title: 'SiapTempur - Persiapan CPNS & TKA',
    description: 'Satu akun untuk persiapan CPNS/SKD dan TKA SMP dengan latihan, tryout, pembahasan, analisis hasil, dan rekomendasi belajar.',
    alternates: { canonical: '/' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const productCards = [
    {
        code: 'CPNS / SKD',
        title: 'SiapTempur CPNS',
        description: 'Persiapan SKD yang lebih terarah untuk TWK, TIU, dan TKP. Mulai dari latihan, mini tryout, full tryout, sampai evaluasi hasil.',
        href: '/cpns',
        cta: 'Lihat persiapan CPNS',
        icon: Target,
        surface: 'bg-[var(--st-blue-soft)]',
        badge: 'TWK · TIU · TKP',
        features: ['Drill per materi', 'Mini & full tryout', 'Analisis hasil belajar'],
    },
    {
        code: 'TKA / SMP',
        title: 'SiapTempur TKA SMP',
        description: 'Latihan dan tryout TKA dalam alur belajar yang membantu kamu menemukan bagian yang perlu diperkuat sebelum ujian.',
        href: '/tka',
        cta: 'Lihat persiapan TKA',
        icon: GraduationCap,
        surface: 'bg-[var(--st-green-soft)]',
        badge: 'TKA SMP',
        features: ['Latihan per mapel', 'Mini & full tryout', 'Pembahasan & evaluasi'],
    },
] as const

const featureCards = [
    {
        icon: Layers3,
        title: 'Latihan terarah',
        description: 'Fokus ke bagian yang memang ingin kamu latih, bukan mengerjakan soal secara acak tanpa arah.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: Zap,
        title: 'Mini Tryout',
        description: 'Ukur kemampuan pada bagian tertentu dengan sesi yang lebih ringkas sebelum masuk ke simulasi penuh.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
    {
        icon: ClipboardCheck,
        title: 'Full Tryout',
        description: 'Kerjakan simulasi lebih lengkap untuk melihat kesiapanmu dalam kondisi yang lebih mendekati ujian.',
        surface: 'bg-[var(--st-green-soft)]',
    },
    {
        icon: BookOpenCheck,
        title: 'Pembahasan soal',
        description: 'Jangan berhenti di skor. Pelajari kembali jawaban dan pahami bagian yang masih membuatmu keliru.',
        surface: 'bg-white',
    },
    {
        icon: BarChart3,
        title: 'Rapor & analisis',
        description: 'Lihat hasil belajarmu dengan lebih jelas supaya kamu tahu bagian kuat dan bagian yang perlu dikejar.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: RotateCcw,
        title: 'Ulang yang masih salah',
        description: 'Kembali ke soal atau area yang masih lemah agar sesi berikutnya benar-benar memperbaiki kemampuanmu.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
] as const

const learningSteps = [
    {
        number: '01',
        title: 'Pilih jalur ujian',
        text: 'Masuk ke CPNS/SKD atau TKA dari satu akun SiapTempur.',
        icon: Target,
    },
    {
        number: '02',
        title: 'Latihan & ukur kemampuan',
        text: 'Kerjakan latihan, mini tryout, atau full tryout sesuai kebutuhanmu.',
        icon: BrainCircuit,
    },
    {
        number: '03',
        title: 'Baca hasilnya',
        text: 'Lihat nilai, pembahasan, dan bagian yang masih membutuhkan perhatian.',
        icon: BarChart3,
    },
    {
        number: '04',
        title: 'Perbaiki lalu ulangi',
        text: 'Gunakan hasil tadi untuk menentukan latihan berikutnya, bukan mulai lagi dari nol.',
        icon: RotateCcw,
    },
] as const

const faqs = [
    {
        question: 'Apakah akun CPNS dan TKA berbeda?',
        answer: 'Tidak. Satu akun SiapTempur dapat digunakan untuk jalur CPNS dan TKA yang tersedia. Progres setiap jalur tetap tersimpan sesuai aktivitas belajarmu.',
    },
    {
        question: 'Saya harus mulai dari latihan atau tryout?',
        answer: 'Kamu bisa menyesuaikan dengan kondisi. Kalau ingin mengetahui kemampuan lebih dulu, mulai dari tryout atau tes yang tersedia. Kalau sudah tahu bagian yang lemah, lanjutkan dengan latihan yang lebih spesifik.',
    },
    {
        question: 'Apakah SiapTempur hanya menampilkan skor?',
        answer: 'Tidak. Arah produknya adalah membantu kamu belajar dari hasil: melihat bagian yang perlu diperbaiki, membaca pembahasan, dan kembali berlatih dengan lebih terarah.',
    },
    {
        question: 'Apakah saya bisa mulai gratis?',
        answer: 'Kamu bisa membuat akun tanpa biaya. Ketersediaan latihan, tryout gratis, token, atau paket belajar mengikuti produk dan program yang sedang tersedia di masing-masing jalur.',
    },
] as const

export default async function Index() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <main className="st-product min-h-screen overflow-hidden bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <header className="relative z-50 px-4 pt-4 md:px-8 md:pt-6">
                <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 rounded-2xl border-2 border-[var(--st-ink)] bg-white/95 px-4 shadow-[3px_3px_0_var(--st-ink)] backdrop-blur md:px-5">
                    <Link href="/" className="st-focus shrink-0 font-handwriting text-2xl font-black tracking-tight md:text-3xl">
                        Siap<span className="text-blue-600">Tempur</span>.
                    </Link>

                    <nav className="hidden items-center gap-1 text-sm font-black lg:flex" aria-label="Navigasi utama">
                        <Link href="#produk" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Program</Link>
                        <Link href="#cara-belajar" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Cara belajar</Link>
                        <Link href="#fitur" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Fitur</Link>
                        <Link href="/blog" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Artikel</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <Link
                                    href="/cpns/dashboard"
                                    className="st-focus hidden min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:inline-flex"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="#produk"
                                    className="st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white"
                                >
                                    Pilih program
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login?returnTo=%2F"
                                    className="st-focus inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:px-4"
                                >
                                    Masuk
                                </Link>
                                <Link
                                    href="/register?returnTo=%2F"
                                    className="st-button hidden min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white sm:inline-flex"
                                >
                                    Daftar gratis
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <section className="relative px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
                <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-16 top-6 h-52 w-44 rotate-12 rounded-[2rem] border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]" aria-hidden="true" />

                <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
                    <div>
                        <div className="st-kicker"><Sparkles size={15} /> Satu akun · CPNS & TKA</div>
                        <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Jangan cuma banyak latihan. <span className="text-blue-600">Tahu apa yang harus diperbaiki.</span>
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            SiapTempur membantu kamu belajar lebih terarah lewat latihan, tryout, pembahasan, dan hasil yang bisa dipakai untuk menentukan langkah belajar berikutnya.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="#produk"
                                className="st-button inline-flex min-h-12 items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white"
                            >
                                Pilih jalur belajar <ArrowRight size={18} />
                            </Link>
                            {!user && (
                                <Link
                                    href="/register?returnTo=%2F"
                                    className="st-button inline-flex min-h-12 items-center gap-2 bg-white px-5 py-3 font-black text-gray-900"
                                >
                                    Buat akun gratis
                                </Link>
                            )}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-gray-600">
                            {['Satu akun untuk semua jalur', 'Progres belajar tersimpan', 'Belajar dari hasil'].map((item) => (
                                <span key={item} className="inline-flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-600" /> {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="st-card-lg relative bg-white p-5 md:p-7">
                        <div className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 border-x border-white/60 bg-[var(--st-yellow)]/80" aria-hidden="true" />

                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Rute belajar SiapTempur</p>
                                <h2 className="st-heading-display mt-2 text-4xl">Belajar → ukur → perbaiki.</h2>
                            </div>
                            <div className="flex gap-2">
                                <span className="st-pill bg-[var(--st-blue-soft)]">CPNS</span>
                                <span className="st-pill bg-[var(--st-green-soft)]">TKA</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            {[
                                { icon: Target, title: 'Mulai dari tujuanmu', text: 'Pilih program dan bagian yang ingin kamu kuasai.', surface: 'bg-[var(--st-blue-soft)]' },
                                { icon: ClipboardCheck, title: 'Kerjakan latihan atau tryout', text: 'Ukur kemampuanmu lewat sesi yang sesuai kebutuhan.', surface: 'bg-[var(--st-yellow-soft)]' },
                                { icon: BarChart3, title: 'Baca hasil dan pembahasan', text: 'Temukan bagian yang sudah kuat dan yang masih lemah.', surface: 'bg-[var(--st-green-soft)]' },
                                { icon: RotateCcw, title: 'Balik lagi dengan arah yang jelas', text: 'Fokuskan latihan berikutnya pada hal yang perlu diperbaiki.', surface: 'bg-white' },
                            ].map(({ icon: Icon, title, text, surface }, index) => (
                                <div key={title} className={`flex gap-4 rounded-2xl border-2 border-[var(--st-ink)] p-4 ${surface}`}>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white font-black">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Icon size={18} />
                                            <h3 className="font-black">{title}</h3>
                                        </div>
                                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="produk" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="st-kicker">Pilih program</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Satu tempat belajar, dua tujuan berbeda.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">
                            Pilih jalur yang sedang kamu persiapkan. Akunnya tetap satu, progresnya tetap rapi.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-6 lg:grid-cols-2">
                        {productCards.map((product) => {
                            const Icon = product.icon
                            return (
                                <Link
                                    key={product.code}
                                    href={product.href}
                                    className="st-card-lg st-focus group relative overflow-hidden bg-white p-6 transition-transform hover:-translate-y-1 md:p-8"
                                >
                                    <div className={`absolute right-0 top-0 h-36 w-36 translate-x-12 -translate-y-12 rounded-full border-2 border-dashed border-[var(--st-ink)]/25 ${product.surface}`} aria-hidden="true" />
                                    <div className="relative">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${product.surface}`}>
                                                <Icon size={27} />
                                            </div>
                                            <span className="st-pill bg-white">{product.badge}</span>
                                        </div>
                                        <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{product.code}</p>
                                        <h3 className="st-heading-display mt-2 text-4xl md:text-5xl">{product.title}</h3>
                                        <p className="st-muted mt-4 max-w-xl font-semibold leading-relaxed">{product.description}</p>

                                        <div className="mt-6 grid gap-2 sm:grid-cols-3">
                                            {product.features.map((feature) => (
                                                <span key={feature} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
                                                    <CheckCircle2 size={16} className="shrink-0 text-green-600" /> {feature}
                                                </span>
                                            ))}
                                        </div>

                                        <span className="mt-7 inline-flex items-center gap-2 font-black text-blue-700">
                                            {product.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                        </span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl rounded-[2rem] border-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] p-6 shadow-[5px_5px_0_var(--st-ink)] md:p-10 lg:p-12">
                    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <div className="st-kicker bg-white">Kenapa SiapTempur?</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Karena skor saja belum cukup untuk bikin kamu berkembang.</h2>
                            <p className="st-muted mt-4 font-semibold leading-relaxed">
                                Yang kamu butuhkan setelah mengerjakan soal adalah jawaban atas pertanyaan sederhana: sekarang aku harus belajar apa?
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {[
                                { icon: BrainCircuit, title: 'Tidak belajar secara acak', text: 'Pilih latihan berdasarkan tujuan dan bagian yang memang ingin kamu perbaiki.' },
                                { icon: BarChart3, title: 'Hasil lebih mudah dibaca', text: 'Nilai dipakai sebagai bahan evaluasi, bukan sekadar angka setelah ujian selesai.' },
                                { icon: Trophy, title: 'Progres punya arah', text: 'Setiap sesi menjadi petunjuk untuk menentukan latihan berikutnya.' },
                            ].map(({ icon: Icon, title, text }) => (
                                <article key={title} className="rounded-2xl border-2 border-[var(--st-ink)] bg-white p-5 shadow-[3px_3px_0_var(--st-ink)]">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)]">
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="mt-5 text-lg font-black">{title}</h3>
                                    <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="cara-belajar" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                        <div className="lg:sticky lg:top-28 lg:self-start">
                            <div className="st-kicker">Cara belajar</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Bukan jalan lurus. Belajar itu siklus.</h2>
                            <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">
                                Kamu mengukur kemampuan, membaca hasil, memperbaiki bagian yang lemah, lalu mengukur lagi. SiapTempur dirancang mengikuti pola itu.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {learningSteps.map(({ number, title, text, icon: Icon }) => (
                                <article key={number} className="st-card-md flex gap-4 bg-white p-5 md:gap-6 md:p-6">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] font-handwriting text-2xl font-black">
                                        {number}
                                    </div>
                                    <div className="pt-1">
                                        <div className="flex items-center gap-2">
                                            <Icon size={21} />
                                            <h3 className="text-xl font-black md:text-2xl">{title}</h3>
                                        </div>
                                        <p className="st-muted mt-2 font-semibold leading-relaxed">{text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="fitur" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Yang kamu dapat</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Dari latihan sampai tahu harus mengulang apa.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">
                            Fitur tersedia menyesuaikan jalur dan program yang kamu gunakan, tetapi semuanya dibangun untuk satu tujuan: membuat sesi belajar berikutnya lebih jelas.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {featureCards.map(({ icon: Icon, title, description, surface }) => (
                            <article key={title} className="st-card-md bg-white p-5 md:p-6">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${surface}`}>
                                    <Icon size={23} />
                                </div>
                                <h3 className="mt-5 text-xl font-black">{title}</h3>
                                <p className="st-muted mt-2 font-semibold leading-relaxed">{description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="st-card-lg overflow-hidden bg-white">
                        <div className="grid lg:grid-cols-2">
                            <div className="border-b-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-6 md:p-10 lg:border-b-0 lg:border-r-2">
                                <div className="st-kicker bg-white">Satu akun</div>
                                <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Ganti tujuan belajar tanpa bikin akun baru.</h2>
                                <p className="st-muted mt-4 font-semibold leading-relaxed">
                                    Kamu bisa menggunakan akun yang sama untuk produk SiapTempur yang tersedia. Setiap jalur tetap punya pengalaman dan progres belajarnya sendiri.
                                </p>
                                <div className="mt-6 space-y-3">
                                    {[
                                        'Satu identitas akun untuk CPNS dan TKA',
                                        'Hasil dan progres tersimpan sesuai jalur',
                                        'Tidak perlu mengingat akun yang berbeda-beda',
                                    ].map((item) => (
                                        <div key={item} className="flex items-start gap-3 font-bold text-gray-700">
                                            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-green-600" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 md:p-10">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pilih sesuai targetmu</p>
                                <div className="mt-5 space-y-3">
                                    <Link href="/cpns" className="st-focus group flex items-center justify-between gap-4 rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] p-4 hover:bg-blue-100">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white"><Target size={21} /></div>
                                            <div><p className="font-black">Persiapan CPNS / SKD</p><p className="st-muted mt-0.5 text-sm font-semibold">TWK, TIU, TKP dan evaluasi hasil</p></div>
                                        </div>
                                        <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={19} />
                                    </Link>
                                    <Link href="/tka" className="st-focus group flex items-center justify-between gap-4 rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-green-soft)] p-4 hover:bg-green-100">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white"><GraduationCap size={21} /></div>
                                            <div><p className="font-black">Persiapan TKA SMP</p><p className="st-muted mt-0.5 text-sm font-semibold">Latihan, tryout, pembahasan dan evaluasi</p></div>
                                        </div>
                                        <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={19} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <div className="st-kicker">Pertanyaan umum</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Sebelum mulai, mungkin ini yang kamu cari.</h2>
                    </div>

                    <div className="mt-10 space-y-3">
                        {faqs.map(({ question, answer }) => (
                            <details key={question} className="st-card-md group bg-white p-5 open:bg-[var(--st-yellow-soft)]">
                                <summary className="st-focus flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-black marker:hidden">
                                    <span>{question}</span>
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--st-ink)] bg-white text-lg transition-transform group-open:rotate-45">+</span>
                                </summary>
                                <p className="st-muted mt-3 max-w-3xl pr-10 font-semibold leading-relaxed">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20 pt-10 md:px-8 md:pb-28">
                <div className="mx-auto max-w-7xl rounded-[2rem] border-2 border-[var(--st-ink)] bg-blue-600 px-6 py-10 text-white shadow-[6px_6px_0_var(--st-ink)] md:px-10 md:py-14">
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.1em]">
                                <Sparkles size={14} /> Mulai dari targetmu
                            </div>
                            <h2 className="mt-5 max-w-3xl font-handwriting text-4xl font-black leading-tight md:text-6xl">Ujianmu boleh berat. Cara belajarnya jangan dibuat lebih rumit.</h2>
                            <p className="mt-4 max-w-2xl font-semibold leading-relaxed text-blue-100">Pilih CPNS atau TKA, mulai latihan, lalu gunakan hasilnya untuk belajar dengan arah yang lebih jelas.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 lg:flex-col">
                            <Link href="/cpns" className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black text-gray-900">
                                Mulai CPNS <ArrowRight size={18} />
                            </Link>
                            <Link href="/tka" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-white bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800">
                                Mulai TKA <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t-2 border-[var(--st-ink)] bg-white px-4 py-8 md:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/" className="font-handwriting text-2xl font-black">Siap<span className="text-blue-600">Tempur</span>.</Link>
                        <p className="st-muted mt-1 text-sm font-semibold">Belajar lebih terarah untuk menghadapi ujian dengan lebih siap.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-gray-600">
                        <Link href="/cpns" className="hover:text-blue-700">CPNS</Link>
                        <Link href="/tka" className="hover:text-blue-700">TKA</Link>
                        <Link href="/blog" className="hover:text-blue-700">Artikel</Link>
                        <Link href="/syarat-ketentuan" className="hover:text-blue-700">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-blue-700">Privasi</Link>
                    </div>
                </div>
                <div className="mx-auto mt-6 max-w-7xl border-t border-gray-200 pt-5 text-xs font-semibold text-gray-500">© SiapTempur Indonesia</div>
            </footer>
        </main>
    )
}
