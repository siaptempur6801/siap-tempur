import Link from 'next/link'
import type { Metadata } from 'next'
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    GraduationCap,
    Layers3,
    Menu,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Target,
    Trophy,
    Zap,
} from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
    title: 'SiapTempur - Persiapan CPNS & TKA SD, SMP, SMA',
    description: 'Satu akun untuk persiapan CPNS/SKD dan TKA jenjang SD, SMP, hingga SMA dengan latihan, tryout, pembahasan, analisis hasil, drill, dan remedial yang lebih terarah.',
    alternates: { canonical: '/' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const productCards = [
    {
        code: 'CPNS / SKD',
        title: 'SiapTempur CPNS',
        description: 'Persiapan SKD untuk TWK, TIU, dan TKP dengan jalur belajar dari latihan sampai evaluasi hasil.',
        href: '/cpns',
        cta: 'Lihat program CPNS',
        icon: Target,
        surface: 'bg-[var(--st-blue-soft)]',
        topics: ['TWK', 'TIU', 'TKP'],
        features: ['Drill per materi', 'Mini & Full Tryout', 'Rapor & remedial'],
    },
    {
        code: 'TKA / SD · SMP · SMA',
        title: 'SiapTempur TKA',
        description: 'Persiapan TKA untuk jenjang SD, SMP, dan SMA dengan latihan, tryout, pembahasan, analisis hasil, serta fokus belajar berikutnya.',
        href: '/tka',
        cta: 'Lihat program TKA',
        icon: GraduationCap,
        surface: 'bg-[var(--st-green-soft)]',
        topics: ['TKA SD', 'TKA SMP', 'TKA SMA'],
        features: ['Drill per kompetensi', 'Mini & Full Tryout', 'Pembahasan & remedial'],
    },
] as const

const audienceCards = [
    {
        title: 'Baru mulai persiapan',
        text: 'Kamu butuh jalur yang jelas untuk tahu harus mulai dari mana dan apa yang perlu diprioritaskan.',
        icon: Target,
    },
    {
        title: 'Sering tryout, skor terasa stagnan',
        text: 'Kamu sudah banyak mengerjakan soal, tapi belum punya pola perbaikan setelah melihat hasil.',
        icon: BarChart3,
    },
    {
        title: 'Sudah tahu kelemahan, bingung latihan apa',
        text: 'Kamu ingin langsung kembali ke materi atau kompetensi yang memang masih perlu dikuatkan.',
        icon: BrainCircuit,
    },
] as const

const learningSteps = [
    {
        number: '01',
        title: 'Kerjakan latihan atau tryout',
        text: 'Mulai dari drill, mini tryout, atau full tryout sesuai tujuanmu.',
        icon: ClipboardCheck,
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        number: '02',
        title: 'Buka hasil dan pembahasan',
        text: 'Jangan berhenti di angka. Lihat bagian yang sudah kuat dan yang masih perlu perhatian.',
        icon: BarChart3,
        surface: 'bg-[var(--st-yellow-soft)]',
    },
    {
        number: '03',
        title: 'Temukan fokus berikutnya',
        text: 'Gunakan hasil untuk menentukan materi, kompetensi, atau soal yang sebaiknya kamu ulang.',
        icon: BrainCircuit,
        surface: 'bg-[var(--st-green-soft)]',
    },
    {
        number: '04',
        title: 'Drill, remedial, lalu ukur lagi',
        text: 'Perbaiki bagian yang lemah dan kembali mengukur perkembanganmu dengan sesi berikutnya.',
        icon: RotateCcw,
        surface: 'bg-white',
    },
] as const

const featureCards = [
    {
        icon: Layers3,
        title: 'Drill terarah',
        description: 'Latih bagian yang lebih spesifik ketika kamu sudah tahu area yang perlu diperbaiki.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: Zap,
        title: 'Mini Tryout',
        description: 'Ukur bagian tertentu dengan sesi yang lebih ringkas sebelum masuk ke simulasi penuh.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
    {
        icon: ClipboardCheck,
        title: 'Full Tryout',
        description: 'Simulasikan ujian lebih lengkap untuk melihat kesiapanmu secara menyeluruh.',
        surface: 'bg-[var(--st-green-soft)]',
    },
    {
        icon: BookOpenCheck,
        title: 'Pembahasan soal',
        description: 'Pelajari kembali jawaban agar kesalahan tidak hanya tercatat, tetapi benar-benar dipahami.',
        surface: 'bg-white',
    },
    {
        icon: BarChart3,
        title: 'Rapor & analisis',
        description: 'Baca hasil dengan lebih jelas untuk mengenali bagian kuat, lemah, dan fokus belajar berikutnya.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: RotateCcw,
        title: 'Soal salah & remedial',
        description: 'Kembali ke bagian yang belum tuntas agar proses belajar terus bergerak, bukan berhenti di skor.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
] as const

const faqs = [
    {
        question: 'Apakah membuat akun SiapTempur gratis?',
        answer: 'Ya. Kamu dapat membuat akun tanpa biaya. Akses latihan, tryout, token, atau paket tertentu mengikuti program yang sedang tersedia pada masing-masing jalur.',
    },
    {
        question: 'Apakah akun CPNS dan TKA berbeda?',
        answer: 'Tidak. Satu akun SiapTempur dapat digunakan untuk program CPNS dan TKA yang tersedia. Progres setiap jalur tetap tersimpan sesuai aktivitas belajarmu.',
    },
    {
        question: 'Saya harus mulai dari drill atau tryout?',
        answer: 'Kalau belum tahu kemampuanmu, mulai dari tryout atau tes yang tersedia. Kalau sudah tahu bagian yang lemah, drill lebih cocok untuk latihan yang lebih fokus.',
    },
    {
        question: 'Apakah ada pembahasan setelah mengerjakan soal?',
        answer: 'Program SiapTempur dirancang agar hasil tidak berhenti di skor. Pembahasan dan evaluasi tersedia sesuai tipe latihan atau tryout yang kamu kerjakan.',
    },
    {
        question: 'Apakah soal yang salah bisa dipelajari lagi?',
        answer: 'Pada alur belajar yang mendukungnya, kamu dapat kembali ke soal salah, fokus belajar, atau remedial agar kesalahan menjadi bahan latihan berikutnya.',
    },
    {
        question: 'Bagaimana token dan paket belajar bekerja?',
        answer: 'Token atau paket digunakan sesuai produk dan program yang tersedia. Detail harga dan akses ditampilkan pada jalur CPNS atau TKA sehingga kamu bisa melihatnya sebelum memilih.',
    },
    {
        question: 'Apakah progres saya tersimpan?',
        answer: 'Ya. Saat menggunakan akun, sesi dan hasil belajar yang didukung akan tersimpan sehingga kamu dapat melanjutkan proses belajar dari progres sebelumnya.',
    },
] as const

const proofItems = ['Drill', 'Mini Tryout', 'Full Tryout', 'Pembahasan', 'Rapor', 'Remedial'] as const

export default async function Index() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    const primaryHref = user ? '#produk' : '/register?returnTo=%2F'
    const primaryLabel = user ? 'Pilih program' : 'Mulai belajar gratis'

    return (
        <main className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <header className="sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4">
                <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/90 px-4 shadow-[3px_3px_0_var(--st-ink)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-5">
                    <Link href="/" className="st-focus shrink-0 font-handwriting text-2xl font-black tracking-tight md:text-3xl">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                    </Link>

                    <nav className="hidden items-center gap-1 text-sm font-black lg:flex" aria-label="Navigasi utama">
                        <Link href="#produk" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Program</Link>
                        <Link href="#beda" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Kenapa berbeda</Link>
                        <Link href="#cara-belajar" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Cara kerja</Link>
                        <Link href="#fitur" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Fitur</Link>
                        <Link href="/blog" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Artikel</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <Link href="/cpns/dashboard" className="st-focus hidden min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:inline-flex">
                                Dashboard
                            </Link>
                        ) : (
                            <Link href="/login?returnTo=%2F" className="st-focus hidden min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:inline-flex">
                                Masuk
                            </Link>
                        )}

                        <Link href={primaryHref} className="st-button hidden min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white sm:inline-flex">
                            {primaryLabel}
                        </Link>

                        <details className="group relative lg:hidden">
                            <summary className="st-focus flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white marker:hidden" aria-label="Buka navigasi">
                                <Menu size={20} />
                            </summary>
                            <div className="absolute right-0 top-full mt-3 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border-2 border-[var(--st-ink)] bg-white p-3 shadow-[4px_4px_0_var(--st-ink)]">
                                <nav className="grid gap-1 text-sm font-black" aria-label="Navigasi mobile">
                                    <Link href="#produk" className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">Program</Link>
                                    <Link href="#beda" className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">Kenapa berbeda</Link>
                                    <Link href="#cara-belajar" className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">Cara kerja</Link>
                                    <Link href="#fitur" className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">Fitur</Link>
                                    <Link href="/blog" className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">Artikel</Link>
                                </nav>
                                <div className="mt-2 grid gap-2 border-t border-gray-200 pt-3 sm:hidden">
                                    {!user && <Link href="/login?returnTo=%2F" className="st-focus flex min-h-11 items-center justify-center rounded-xl font-black hover:bg-gray-100">Masuk</Link>}
                                    <Link href={primaryHref} className="st-button flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white">
                                        {primaryLabel}
                                    </Link>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </header>

            <section className="relative px-4 pb-14 pt-12 md:px-8 md:pb-20 md:pt-16">
                <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-16 top-6 h-52 w-44 rotate-12 rounded-[2rem] border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]" aria-hidden="true" />

                <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
                    <div>
                        <div className="st-kicker"><Sparkles size={15} /> Satu akun · CPNS & TKA</div>
                        <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Jangan cuma tahu skormu. <span className="text-blue-600">Tahu apa yang harus diperbaiki.</span>
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            Untuk CPNS maupun TKA SD, SMP, dan SMA, SiapTempur menghubungkan latihan, tryout, pembahasan, analisis hasil, dan latihan ulang menjadi satu siklus belajar yang lebih terarah.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={primaryHref} className="st-button inline-flex min-h-12 items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
                                {primaryLabel} <ArrowRight size={18} />
                            </Link>
                            <Link href="#produk" className="st-focus inline-flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 font-black text-gray-700 hover:bg-white">
                                Lihat program <ChevronDown size={18} />
                            </Link>
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Contoh tampilan produk</p>
                                <h2 className="st-heading-display mt-2 text-4xl">Rapor belajarmu.</h2>
                            </div>
                            <span className="st-pill bg-[var(--st-yellow-soft)]">Preview</span>
                        </div>

                        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black">Hasil terakhir</p>
                                    <p className="st-muted mt-0.5 text-xs font-semibold">Contoh bagaimana hasil membantu menentukan fokus.</p>
                                </div>
                                <BarChart3 size={21} className="text-blue-600" />
                            </div>
                            <div className="mt-4 space-y-2.5">
                                {[
                                    { label: 'TWK', status: 'Perlu fokus', width: 'w-[42%]', tone: 'bg-amber-400' },
                                    { label: 'TIU', status: 'Mulai stabil', width: 'w-[68%]', tone: 'bg-blue-500' },
                                    { label: 'TKP', status: 'Pertahankan', width: 'w-[84%]', tone: 'bg-green-500' },
                                ].map((item) => (
                                    <div key={item.label} className="grid grid-cols-[2.6rem_1fr_auto] items-center gap-3">
                                        <span className="text-xs font-black">{item.label}</span>
                                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                            <div className={`h-full rounded-full ${item.width} ${item.tone}`} />
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-500">{item.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-3 rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white">
                                    <BrainCircuit size={19} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">Fokus berikutnya</p>
                                    <p className="mt-1 font-black">Perkuat bagian yang masih lemah lewat drill terarah.</p>
                                    <p className="st-muted mt-1 text-sm font-semibold">Setelah itu, ukur lagi lewat tryout atau remedial yang tersedia.</p>
                                </div>
                            </div>
                        </div>

                        <p className="st-muted mt-3 text-center text-xs font-semibold">Preview bersifat ilustratif untuk menjelaskan alur produk, bukan data pengguna nyata.</p>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-10 md:px-8 md:pb-14">
                <div className="mx-auto max-w-7xl rounded-2xl border border-gray-200 bg-white/70 px-4 py-4 md:px-6">
                    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-between">
                        <span className="mr-2 text-xs font-black uppercase tracking-[0.12em] text-gray-500">Satu siklus belajar</span>
                        {proofItems.map((item, index) => (
                            <div key={item} className="flex items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700">{item}</span>
                                {index < proofItems.length - 1 && <ArrowRight size={14} className="hidden text-gray-300 md:block" />}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="produk" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="st-kicker">Pilih program</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Satu tempat belajar, dua tujuan berbeda.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Pilih jalur yang sedang kamu persiapkan. Akunnya tetap satu, pengalaman belajarnya menyesuaikan targetmu.</p>
                    </div>

                    <div className="mt-10 grid gap-6 lg:grid-cols-2">
                        {productCards.map((product) => {
                            const Icon = product.icon
                            return (
                                <Link key={product.code} href={product.href} data-testid={`program-card-${product.href.replace('/', '')}`} className="st-card-lg st-focus group relative overflow-hidden bg-white p-6 transition-transform hover:-translate-y-1 md:p-8">
                                    <div className={`absolute right-0 top-0 h-40 w-40 translate-x-14 -translate-y-14 rounded-full border-2 border-dashed border-[var(--st-ink)]/25 ${product.surface}`} aria-hidden="true" />
                                    <div className="relative">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${product.surface}`}><Icon size={27} /></div>
                                            <span className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{product.code}</span>
                                        </div>
                                        <h3 className="st-heading-display mt-6 text-4xl md:text-5xl">{product.title}</h3>
                                        <p className="st-muted mt-3 max-w-xl font-semibold leading-relaxed">{product.description}</p>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {product.topics.map((topic) => <span key={topic} className={`st-pill ${product.surface}`}>{topic}</span>)}
                                        </div>

                                        <div className="mt-6 grid gap-2 sm:grid-cols-3">
                                            {product.features.map((feature) => (
                                                <span key={feature} className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700">
                                                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" /> {feature}
                                                </span>
                                            ))}
                                        </div>

                                        <span className="mt-7 inline-flex items-center gap-2 font-black text-blue-700">{product.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section id="beda" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border-2 border-[var(--st-ink)] bg-white shadow-[5px_5px_0_var(--st-ink)]">
                    <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                        <div className="bg-[var(--st-blue-soft)] p-6 md:p-10 lg:p-12">
                            <div className="st-kicker bg-white">Bukan cuma tryout</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Tryout bukan akhir sesi belajar.</h2>
                            <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">Nilai baru berguna ketika kamu tahu harus melakukan apa setelah melihatnya. Itu yang ingin dihubungkan SiapTempur.</p>
                        </div>

                        <div className="grid gap-4 p-6 md:grid-cols-2 md:p-10 lg:p-12">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">Kalau berhenti di skor</p>
                                <div className="mt-5 space-y-3 text-sm font-bold text-gray-600">
                                    {['Kerjakan soal', 'Lihat nilai', 'Selesai dan mulai lagi tanpa arah yang jelas'].map((item, index) => (
                                        <div key={item} className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs">{index + 1}</span><span>{item}</span></div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-5">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Alur SiapTempur</p>
                                <div className="mt-5 space-y-3 text-sm font-black text-gray-800">
                                    {['Kerjakan & ukur kemampuan', 'Baca hasil dan pembahasan', 'Temukan bagian yang perlu diperbaiki', 'Drill / remedial lalu ukur lagi'].map((item, index) => (
                                        <div key={item} className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--st-ink)] bg-white text-xs">{index + 1}</span><span>{item}</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Untuk siapa?</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Kalau salah satunya terasa familiar, SiapTempur dibuat untuk masalah itu.</h2>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {audienceCards.map(({ title, text, icon: Icon }) => (
                            <article key={title} className="rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--st-blue-soft)] text-blue-700"><Icon size={22} /></div>
                                <h3 className="mt-5 text-xl font-black">{title}</h3>
                                <p className="st-muted mt-2 font-semibold leading-relaxed">{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="cara-belajar" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
                        <div className="lg:sticky lg:top-28 lg:self-start">
                            <div className="st-kicker">Lihat cara kerjanya</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Belajar → ukur → perbaiki → ukur lagi.</h2>
                            <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">Empat langkah ini menjadi cerita utama produk. Kamu tidak harus menebak apa yang harus dilakukan setelah selesai mengerjakan soal.</p>
                            <Link href={primaryHref} className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">{primaryLabel} <ArrowRight size={17} /></Link>
                        </div>

                        <div className="space-y-4">
                            {learningSteps.map(({ number, title, text, icon: Icon, surface }, index) => (
                                <article key={number} className={`relative rounded-2xl border-2 border-[var(--st-ink)] p-5 md:p-6 ${surface} ${index === 0 || index === learningSteps.length - 1 ? 'shadow-[3px_3px_0_var(--st-ink)]' : ''}`}>
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] bg-white font-handwriting text-2xl font-black">{number}</div>
                                        <div className="pt-1">
                                            <div className="flex items-center gap-2"><Icon size={21} /><h3 className="text-xl font-black md:text-2xl">{title}</h3></div>
                                            <p className="st-muted mt-2 font-semibold leading-relaxed">{text}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="fitur" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Yang kamu dapat</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Fitur yang menyambung satu sama lain, bukan kumpulan menu.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Ketersediaan fitur menyesuaikan jalur dan program, tetapi semuanya diarahkan untuk membuat sesi belajar berikutnya lebih jelas.</p>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {featureCards.map(({ icon: Icon, title, description, surface }, index) => (
                            <article key={title} className={`rounded-2xl border border-gray-200 bg-white p-5 md:p-6 ${index === 0 || index === 4 ? 'md:row-span-1' : ''}`}>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${surface}`}><Icon size={23} /></div>
                                <h3 className="mt-5 text-xl font-black">{title}</h3>
                                <p className="st-muted mt-2 font-semibold leading-relaxed">{description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl rounded-[2rem] border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-6 md:p-10 lg:p-12">
                    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <div className="st-kicker bg-white">Satu akun</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Pindah target tanpa bikin akun baru.</h2>
                            <p className="st-muted mt-4 font-semibold leading-relaxed">Akun yang sama bisa digunakan untuk persiapan CPNS serta TKA SD, SMP, dan SMA. Jalur belajarnya tetap terpisah supaya setiap progres tidak bercampur.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                { icon: ShieldCheck, title: 'Satu identitas akun', text: 'Login sekali untuk mengakses jalur yang tersedia.' },
                                { icon: Trophy, title: 'Progres tetap rapi', text: 'Hasil dan aktivitas mengikuti jalur belajarmu.' },
                                { icon: Target, title: 'Target tetap spesifik', text: 'CPNS dan TKA punya pengalaman belajar masing-masing.' },
                                { icon: RotateCcw, title: 'Mudah lanjut lagi', text: 'Kembali dari progres yang sudah tersimpan.' },
                            ].map(({ icon: Icon, title, text }) => (
                                <div key={title} className="rounded-2xl bg-white p-4">
                                    <Icon size={20} className="text-blue-700" />
                                    <p className="mt-3 font-black">{title}</p>
                                    <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <div className="st-kicker">Pertanyaan sebelum mulai</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Biar tidak ada yang bikin ragu untuk mencoba.</h2>
                    </div>

                    <div className="mt-10 space-y-3">
                        {faqs.map(({ question, answer }) => (
                            <details key={question} className="group rounded-2xl border border-gray-200 bg-white p-5 open:border-[var(--st-ink)] open:bg-[var(--st-yellow-soft)]">
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
                            <div className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.1em]"><Sparkles size={14} /> Mulai dari targetmu</div>
                            <h2 className="mt-5 max-w-3xl font-handwriting text-4xl font-black leading-tight md:text-6xl">Ujianmu boleh berat. Cara belajarnya jangan dibuat lebih rumit.</h2>
                            <p className="mt-4 max-w-2xl font-semibold leading-relaxed text-blue-100">Buat akun, pilih CPNS atau TKA, lalu gunakan setiap hasil untuk menentukan apa yang harus dipelajari berikutnya.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 lg:flex-col">
                            <Link href={primaryHref} className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black text-gray-900">{primaryLabel} <ArrowRight size={18} /></Link>
                            <Link href="#produk" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-white bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800">Lihat program</Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t border-gray-200 bg-white px-4 py-8 md:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/" className="font-handwriting text-2xl font-black">Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.</Link>
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
