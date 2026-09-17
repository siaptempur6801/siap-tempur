import Link from 'next/link'
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    Clock3,
    FileText,
    History,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Target,
    Ticket,
    Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import TrackedLink from '@/components/analytics/TrackedLink'
import CpnsLandingInteractions, { CpnsEventCountdown } from '@/components/home/CpnsLandingInteractions'
import ProgressBar from '@/components/ui/ProgressBar'

export type CpnsLandingUser = { id: string } | null

export type CpnsLandingEvent = {
    id: string
    title: string
    description: string | null
    starts_at: string
    ends_at: string
    start_grace_minutes: number
    duration_minutes: number
    max_participants: number | null
    requires_code: boolean
    is_paid: boolean
    price: number
    status: 'scheduled' | 'live' | 'closed'
    flyer_image_url: string | null
    documentation_url: string | null
}

export type CpnsLandingArticle = {
    id: string
    title: string
    slug: string
    cover_image_url: string | null
    published_at: string | null
    excerpt: string | null
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
})

const articleDateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
})

function formatEventDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Jadwal akan diumumkan'
    return `${dateFormatter.format(date)} WIB`
}

function formatPrice(event: CpnsLandingEvent) {
    if (!event.is_paid || event.price <= 0) return 'Gratis'
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(event.price)
}

function formatArticleDate(value: string | null) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return articleDateFormatter.format(date)
}

const skdMap = [
    {
        code: 'TWK',
        title: 'Tes Wawasan Kebangsaan',
        text: 'Masuk dari bagian TWK, pilih materi atau submateri yang tersedia, lalu gunakan Drill untuk memperdalam bagian tertentu.',
        items: ['Materi & submateri TWK', 'Drill fokus per bagian', 'Mini / Full Tryout'],
        tone: 'bg-red-50',
    },
    {
        code: 'TIU',
        title: 'Tes Intelegensia Umum',
        text: 'Latih kemampuan TIU secara bertahap dan gunakan hasil sesi untuk menentukan area yang masih membutuhkan latihan.',
        items: ['Kelompok materi TIU', 'Latihan fokus', 'Checkpoint lewat tryout'],
        tone: 'bg-[var(--st-yellow-soft)]',
    },
    {
        code: 'TKP',
        title: 'Tes Karakteristik Pribadi',
        text: 'Pelajari pola soal TKP, baca pembahasan, dan ulang bagian yang masih sering membuat keputusanmu kurang tepat.',
        items: ['Kompetensi TKP', 'Pembahasan jawaban', 'Evaluasi hasil'],
        tone: 'bg-[var(--st-blue-soft)]',
    },
] as const

const learningModes = [
    {
        icon: Target,
        label: 'Drill / Latihan Fokus',
        title: 'Perkuat materi yang masih lemah.',
        text: 'Masuk lebih dalam ke materi TWK, TIU, atau TKP tanpa harus mengerjakan simulasi penuh.',
        directHref: '/cpns/dashboard/drilling-materi',
        cta: 'Mulai Drill materi',
        mode: 'latihan_fokus',
        tone: 'bg-[var(--st-blue-soft)]',
        note: 'Cocok ketika kamu sudah tahu area yang ingin diperbaiki.',
    },
    {
        icon: Clock3,
        label: 'Mini Tryout',
        title: 'Ukur satu bagian dengan sesi lebih ringkas.',
        text: 'Gunakan Mini Tryout untuk mengecek perkembangan satu bagian sebelum kembali ke latihan atau Full Tryout.',
        directHref: '/cpns/dashboard/mini-tryout',
        cta: 'Lihat Mini Tryout',
        mode: 'mini_tryout',
        tone: 'bg-[var(--st-yellow-soft)]',
        note: 'Cocok sebagai checkpoint di tengah proses belajar.',
    },
    {
        icon: BookOpenCheck,
        label: 'Full Tryout',
        title: 'Uji kesiapan TWK, TIU, dan TKP sekaligus.',
        text: 'Kerjakan simulasi penuh dengan batas waktu, lalu jadikan hasilnya dasar untuk menentukan sesi berikutnya.',
        directHref: '/cpns/full-tryout',
        cta: 'Lihat Full Tryout',
        mode: 'full_tryout',
        tone: 'bg-[var(--st-green-soft)]',
        note: 'Cocok untuk mengukur kesiapan secara lebih menyeluruh.',
    },
] as const

const audienceCards = [
    {
        icon: Target,
        title: 'Baru mulai persiapan SKD',
        text: 'Kamu ingin memahami TWK, TIU, TKP dan punya jalur latihan yang lebih jelas sejak awal.',
    },
    {
        icon: BarChart3,
        title: 'Sering tryout, skor masih stagnan',
        text: 'Kamu sudah banyak mengerjakan soal tetapi butuh cara yang lebih jelas untuk membaca dan memperbaiki hasil.',
    },
    {
        icon: BrainCircuit,
        title: 'Sudah tahu kelemahan, bingung mulai dari mana',
        text: 'Kamu ingin langsung masuk ke materi atau bagian yang masih lemah tanpa mengulang semuanya dari nol.',
    },
] as const

const learningLoop = [
    { icon: ClipboardCheck, step: '01', title: 'Ukur', text: 'Kerjakan Drill, Mini Tryout, atau Full Tryout sesuai tujuanmu.' },
    { icon: BarChart3, step: '02', title: 'Baca hasil', text: 'Lihat bagian mana yang sudah kuat dan masih perlu dikejar.' },
    { icon: BookOpenCheck, step: '03', title: 'Pahami', text: 'Pelajari pembahasan dan pola kesalahan yang muncul.' },
    { icon: RotateCcw, step: '04', title: 'Perbaiki', text: 'Kembali ke latihan yang relevan, lalu ukur lagi perkembanganmu.' },
] as const

const recoveryLoop = [
    { icon: History, title: 'Temukan soal yang masih salah', text: 'Hasil sesi menjadi titik awal untuk melihat kembali kesalahan yang perlu dipahami.' },
    { icon: BookOpenCheck, title: 'Baca pembahasannya', text: 'Jangan hanya menghafal jawaban. Pahami alasan dan konsep yang membuat pilihanmu keliru.' },
    { icon: Target, title: 'Kembali ke area terkait', text: 'Gunakan Drill atau mode perbaikan yang tersedia untuk berlatih pada bagian yang relevan.' },
    { icon: RotateCcw, title: 'Remedial dan ukur ulang', text: 'Ulangi bagian yang belum tuntas lalu cek apakah kemampuanmu sudah membaik.' },
] as const

const comparisonRows = [
    ['Setelah tryout', 'Lihat skor lalu selesai', 'Hasil dipakai untuk menentukan sesi berikutnya'],
    ['Pilihan latihan', 'Sering berupa kumpulan soal', 'Drill, Mini Tryout, dan Full Tryout punya fungsi berbeda'],
    ['Soal yang salah', 'Harus dicari ulang sendiri', 'Diarahkan kembali ke pembahasan dan mode perbaikan yang tersedia'],
    ['Arah belajar', 'Kamu menentukan sendiri dari nol', 'Progres dan hasil membantu mempersempit fokus'],
] as const

const decisionCards = [
    {
        title: 'Belum tahu kemampuanmu?',
        text: 'Mulai dari tryout untuk mendapatkan titik ukur sebelum menentukan materi yang perlu dikejar.',
        cta: 'Lihat Full Tryout',
        href: '/cpns/full-tryout',
        mode: 'full_tryout',
        tone: 'bg-[var(--st-green-soft)]',
    },
    {
        title: 'Sudah tahu bagian yang lemah?',
        text: 'Masuk ke Drill agar waktumu dipakai untuk memperbaiki materi yang memang membutuhkan perhatian.',
        cta: 'Mulai Drill',
        href: '/cpns/dashboard/drilling-materi',
        mode: 'latihan_fokus',
        tone: 'bg-[var(--st-blue-soft)]',
    },
    {
        title: 'Butuh checkpoint singkat?',
        text: 'Gunakan Mini Tryout untuk mengecek satu bagian tanpa harus menjalani simulasi penuh.',
        cta: 'Lihat Mini Tryout',
        href: '/cpns/dashboard/mini-tryout',
        mode: 'mini_tryout',
        tone: 'bg-[var(--st-yellow-soft)]',
    },
] as const

const faq = [
    {
        question: 'Apa bedanya SiapTempur CPNS dengan sekadar mengerjakan bank soal?',
        answer: 'SiapTempur dirancang agar latihan tidak berhenti ketika soal selesai. Hasil, pembahasan, soal yang masih salah, dan mode perbaikan dapat dipakai untuk menentukan langkah belajar berikutnya sesuai fitur yang tersedia.',
    },
    {
        question: 'Apa saja bagian SKD yang tersedia?',
        answer: 'Persiapan CPNS berfokus pada TWK, TIU, dan TKP melalui Drill atau Latihan Fokus, Mini Tryout, Full Tryout, pembahasan, dan evaluasi hasil sesuai konten yang tersedia di akunmu.',
    },
    {
        question: 'Saya sebaiknya mulai dari Drill, Mini Tryout, atau Full Tryout?',
        answer: 'Kalau belum tahu kemampuanmu, gunakan tryout sebagai titik ukur. Kalau sudah tahu bagian yang lemah, Drill lebih cocok untuk fokus memperbaikinya. Mini Tryout dapat dipakai sebagai checkpoint sebelum mengukur lagi dengan sesi yang lebih lengkap.',
    },
    {
        question: 'Bagaimana token CPNS digunakan?',
        answer: 'Token adalah unit akses untuk sesi yang menggunakan token. Jumlah token yang dibutuhkan, aturan akses, harga paket, biaya pembayaran, dan manfaat paket ditampilkan di dalam produk sebelum kamu membeli atau memulai sesi terkait.',
    },
    {
        question: 'Apakah ada pembahasan dan soal yang bisa dipelajari ulang?',
        answer: 'Hasil sesi dan pembahasan yang tersedia dapat digunakan untuk memahami kesalahan. Fitur soal salah dan remedial membantu mengarahkan pengguna kembali ke area yang masih perlu diperbaiki ketika tersedia untuk sesi terkait.',
    },
    {
        question: 'Apakah akun CPNS berbeda dengan akun TKA?',
        answer: 'Tidak. Satu akun SiapTempur dapat digunakan untuk produk yang tersedia, sementara progres setiap jalur tetap disimpan sesuai konteks belajarnya.',
    },
] as const

const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SiapTempur', item: 'https://siaptempur.id/' },
            { '@type': 'ListItem', position: 2, name: 'Persiapan CPNS', item: 'https://siaptempur.id/cpns' },
        ],
    },
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    },
]

export default function CpnsProductLandingV11({
    user,
    activeEvents,
    latestArticles,
}: {
    user: CpnsLandingUser
    activeEvents: CpnsLandingEvent[]
    latestArticles: CpnsLandingArticle[]
}) {
    const primaryAccountHref = user ? '/cpns/dashboard' : '/login?returnTo=/cpns/dashboard'
    const activeEvent = activeEvents[0] ?? null
    const eventHref = user ? '/cpns/dashboard/event' : '/login?returnTo=/cpns/dashboard/event'
    const packageHref = user ? '/cpns/dashboard/beli-paket' : '/login?returnTo=/cpns/dashboard/beli-paket'
    const drillHref = user ? '/cpns/dashboard/drilling-materi' : '/login?returnTo=/cpns/dashboard/drilling-materi'
    const miniHref = user ? '/cpns/dashboard/mini-tryout' : '/login?returnTo=/cpns/dashboard/mini-tryout'

    function resolveProtectedHref(href: string) {
        if (href === '/cpns/dashboard/drilling-materi') return drillHref
        if (href === '/cpns/dashboard/mini-tryout') return miniHref
        return href
    }

    return (
        <main data-experience-mode="marketing" data-program="cpns" className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] pb-24 font-body text-[var(--st-ink)] md:pb-0">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

            <CpnsLandingInteractions
                primaryAccountHref={primaryAccountHref}
                isLoggedIn={Boolean(user)}
                hasArticles={latestArticles.length > 0}
            />

            <section className="relative px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-18 lg:pb-28">
                <div className="pointer-events-none absolute -left-28 top-28 h-56 w-56 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-16 top-6 h-56 w-48 rotate-12 rounded-[2rem] border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]" aria-hidden="true" />

                <div className="px-container-marketing relative grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16">
                    <div>
                        <div className="st-kicker"><Sparkles size={15} /> Persiapan SKD · TWK · TIU · TKP</div>
                        <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Bukan cuma latihan SKD. <span className="text-blue-600">Tahu bagian mana yang harus kamu kejar.</span>
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            Ukur kemampuan lewat Drill, Mini Tryout, atau Full Tryout. Baca hasilnya, pelajari pembahasan, lalu kembali ke materi yang memang masih lemah.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button size="lg" asChild>
                                <TrackedLink
                                    href={primaryAccountHref}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: 'primary_start' }}
                                >
                                    {user ? 'Lanjutkan belajar' : 'Mulai belajar CPNS'} <ArrowRight size={18} />
                                </TrackedLink>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <a href="#mulai-dari-mana">Aku mulai dari mana?</a>
                            </Button>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-gray-600">
                            {['Drill per materi', 'Mini & Full Tryout', 'Pembahasan', 'Soal salah & remedial'].map((item) => (
                                <span key={item} className="inline-flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-600" /> {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="st-card-lg relative bg-white p-5 md:p-7">
                        <div className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 border-x border-white/60 bg-[var(--st-yellow)]/80" aria-hidden="true" />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Contoh tampilan evaluasi</p>
                                <h2 className="st-heading-display mt-2 text-3xl md:text-4xl">Fokus belajar berikutnya.</h2>
                            </div>
                            <span className="st-pill bg-[var(--st-blue-soft)]">SKD</span>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {[
                                { label: 'TWK', value: 46, status: 'Prioritas', tone: 'bg-[var(--st-yellow-soft)]' },
                                { label: 'TIU', value: 72, status: 'Berkembang', tone: 'bg-[var(--st-blue-soft)]' },
                                { label: 'TKP', value: 84, status: 'Pertahankan', tone: 'bg-[var(--st-green-soft)]' },
                            ].map((item) => (
                                <div key={item.label} className={`rounded-2xl border border-gray-200 p-4 ${item.tone}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-black uppercase tracking-[0.1em] text-gray-600">{item.label}</p>
                                        <span className="text-xs font-black text-gray-700">{item.value}%</span>
                                    </div>
                                    <ProgressBar
                                        value={item.value}
                                        label={`Progres ${item.label}`}
                                        size="sm"
                                        className="mt-3 h-2 rounded-full border-0 bg-white/90"
                                        indicatorClassName="rounded-full bg-blue-600"
                                    />
                                    <p className="mt-2 text-xs font-black text-gray-700">{item.status}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 rounded-2xl border-2 border-[var(--st-ink)] bg-white p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--st-blue-soft)] text-blue-700"><Target size={21} /></div>
                                <div className="flex-1">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">3 fokus berikutnya</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {['Drill TWK', 'Ulang soal salah', 'Mini Tryout TWK'].map((item) => <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-700">{item}</span>)}
                                    </div>
                                    <TrackedLink
                                        href={drillHref}
                                        eventName="px_landing_cta"
                                        eventProperties={{ program: 'cpns', surface: 'landing', cta: 'hero_preview_drill', mode: 'latihan_fokus' }}
                                        className="st-focus mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-black text-blue-700 hover:underline"
                                    >
                                        Mulai dari area terlemah <ArrowRight size={16} />
                                    </TrackedLink>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500">
                            <ShieldCheck size={15} /> Ilustrasi alur produk, bukan hasil peserta nyata.
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-8 md:px-8 md:pb-12" aria-label="Fitur utama CPNS">
                <div className="px-container-marketing grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                    {['TWK', 'TIU', 'TKP', 'Drill Materi', 'Mini Tryout', 'Full Tryout', 'Pembahasan', 'Remedial'].map((item) => (
                        <div key={item} className="flex min-h-12 items-center justify-center rounded-xl bg-gray-50 px-3 text-center text-sm font-black text-gray-700">{item}</div>
                    ))}
                </div>
            </section>

            <section id="peta-skd" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Peta SKD</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Masuk dari TWK, TIU, atau TKP. Turun sampai bagian yang memang ingin kamu latih.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Struktur belajar dibuat bertingkat agar Drill tidak terasa seperti mengambil soal acak dari satu bank besar.</p>
                    </div>
                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {skdMap.map((item) => (
                            <article key={item.code} className={`group rounded-[1.5rem] border-2 border-[var(--st-ink)] p-6 transition-transform hover:-translate-y-1 ${item.tone}`}>
                                <span className="inline-flex rounded-xl border-2 border-[var(--st-ink)] bg-white px-3 py-1 font-display text-2xl font-black">{item.code}</span>
                                <h3 className="mt-5 text-2xl font-black tracking-tight">{item.title}</h3>
                                <p className="st-muted mt-3 font-semibold leading-relaxed">{item.text}</p>
                                <div className="mt-5 space-y-2">
                                    {item.items.map((detail) => <div key={detail} className="flex items-center gap-2 text-sm font-bold text-gray-700"><CheckCircle2 size={16} className="text-green-600" /> {detail}</div>)}
                                </div>
                                <TrackedLink
                                    href={drillHref}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: `skd_map_${item.code.toLowerCase()}`, mode: 'latihan_fokus' }}
                                    className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700"
                                >
                                    Buka peta Drill <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                                </TrackedLink>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="alur" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
                        <div className="lg:sticky lg:top-28 lg:self-start">
                            <div className="st-kicker">Tryout bukan akhir sesi</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Skor memberi tahu hasil. Siklus belajar memberi tahu apa yang harus dilakukan berikutnya.</h2>
                            <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">Kalau sesi berhenti setelah melihat nilai, kamu masih harus menebak langkah berikutnya. Hasil di SiapTempur dibawa kembali ke latihan.</p>
                        </div>
                        <div className="space-y-4">
                            {learningLoop.map(({ icon: Icon, step, title, text }) => (
                                <article key={step} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:translate-x-1 md:p-6">
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] font-display text-xl font-black">{step}</div>
                                        <div className="pt-1">
                                            <div className="flex items-center gap-2"><Icon size={20} /><h3 className="text-xl font-black md:text-2xl">{title}</h3></div>
                                            <p className="st-muted mt-2 font-semibold leading-relaxed">{text}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="pemulihan" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing rounded-[2rem] border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-6 shadow-[5px_5px_0_var(--st-ink)] md:p-10 lg:p-12">
                    <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
                        <div>
                            <div className="st-kicker bg-white">Setelah salah, lalu apa?</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Kesalahan seharusnya berubah jadi agenda belajar berikutnya.</h2>
                            <p className="st-muted mt-4 font-semibold leading-relaxed">Recovery loop menghubungkan hasil dengan pembahasan, area terkait, dan remedial sehingga kamu tidak sekadar menandai jawaban salah.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {recoveryLoop.map(({ icon: Icon, title, text }, index) => (
                                <article key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--st-blue-soft)] text-blue-700"><Icon size={21} /></div>
                                        <span className="font-display text-2xl font-black text-gray-300">0{index + 1}</span>
                                    </div>
                                    <h3 className="mt-4 text-lg font-black">{title}</h3>
                                    <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="bandingkan" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Bukan sekadar bank soal</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Bedanya ada pada apa yang terjadi setelah kamu menekan “Selesai”.</h2>
                    </div>
                    <div className="mt-10 overflow-hidden rounded-[1.5rem] border-2 border-[var(--st-ink)] bg-white">
                        <div className="hidden grid-cols-[0.55fr_1fr_1.15fr] border-b-2 border-[var(--st-ink)] bg-gray-50 text-sm font-black md:grid">
                            <div className="p-4">Perbandingan</div><div className="border-l-2 border-[var(--st-ink)] p-4">Bank soal biasa</div><div className="border-l-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] p-4 text-blue-800">SiapTempur CPNS</div>
                        </div>
                        {comparisonRows.map(([label, ordinary, siaptempur]) => (
                            <div key={label} className="grid gap-3 border-b border-gray-200 p-5 last:border-b-0 md:grid-cols-[0.55fr_1fr_1.15fr] md:gap-0 md:p-0">
                                <div className="font-black md:p-5">{label}</div>
                                <div className="rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-600 md:rounded-none md:border-l-2 md:border-[var(--st-ink)] md:bg-white md:p-5">{ordinary}</div>
                                <div className="rounded-xl bg-[var(--st-blue-soft)] p-4 text-sm font-bold text-gray-800 md:rounded-none md:border-l-2 md:border-[var(--st-ink)] md:p-5"><CheckCircle2 size={16} className="mr-2 inline text-green-600" />{siaptempur}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing rounded-[2rem] border-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] p-6 shadow-[5px_5px_0_var(--st-ink)] md:p-10 lg:p-12">
                    <div className="max-w-3xl">
                        <div className="st-kicker bg-white">Cocok untuk kamu kalau...</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Masalahnya bukan kurang banyak soal. Kadang kamu cuma butuh arah yang lebih jelas.</h2>
                    </div>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {audienceCards.map(({ icon: Icon, title, text }) => (
                            <article key={title} className="rounded-2xl border-2 border-[var(--st-ink)] bg-white p-5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--st-yellow-soft)]"><Icon size={22} /></div>
                                <h3 className="mt-5 text-lg font-black">{title}</h3>
                                <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="mulai-dari-mana" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="st-kicker">Mulai dari mana?</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Tidak perlu menebak mode belajar yang cocok.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold">Pilih kondisi yang paling mirip dengan keadaanmu sekarang.</p>
                    </div>
                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {decisionCards.map((card) => {
                            const href = resolveProtectedHref(card.href)
                            return (
                                <article key={card.title} className={`group rounded-[1.5rem] border border-gray-200 p-6 shadow-sm transition-transform hover:-translate-y-1 ${card.tone}`}>
                                    <h3 className="text-2xl font-black tracking-tight">{card.title}</h3>
                                    <p className="st-muted mt-3 font-semibold leading-relaxed">{card.text}</p>
                                    <TrackedLink
                                        href={href}
                                        eventName="px_landing_cta"
                                        eventProperties={{ program: 'cpns', surface: 'landing', cta: `decision_${card.mode}`, mode: card.mode }}
                                        className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700"
                                    >
                                        {card.cta} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                                    </TrackedLink>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section id="latihan" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Pilih sesuai kebutuhan</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Mengukur, memperdalam, dan menguji kesiapan adalah tiga kebutuhan yang berbeda.</h2>
                    </div>
                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {learningModes.map(({ icon: Icon, label, title, text, directHref, cta, mode, tone, note }) => (
                            <article key={title} className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 md:p-7">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${tone}`}><Icon size={23} /></div>
                                <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{label}</p>
                                <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
                                <p className="st-muted mt-3 font-semibold leading-relaxed">{text}</p>
                                <div className="mt-5 rounded-xl bg-gray-50 px-3 py-3 text-sm font-bold leading-relaxed text-gray-600">{note}</div>
                                <TrackedLink
                                    href={resolveProtectedHref(directHref)}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: `mode_${mode}`, mode }}
                                    className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline"
                                >
                                    {cta} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                                </TrackedLink>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="event" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className={`px-container-marketing ${activeEvent ? 'grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center' : ''}`}>
                    <div className={activeEvent ? '' : 'mx-auto max-w-3xl text-center'}>
                        <div className="st-kicker"><Trophy size={15} /> Event tryout</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">{activeEvent ? 'Ukur kemampuan dalam sesi terjadwal.' : 'Belum ada event aktif—latihan mandiri tetap jalan.'}</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">{activeEvent ? 'Ikuti event yang tersedia dan kerjakan tryout pada waktu yang sama dengan peserta event lainnya.' : 'Section event dibuat ringkas saat jadwal belum tersedia supaya fokusmu tetap ke latihan dan tryout yang bisa dikerjakan sekarang.'}</p>
                        <Button className="mt-6" asChild>
                            <TrackedLink href={activeEvent ? eventHref : '/cpns/full-tryout'} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: activeEvent ? 'event' : 'event_empty_full_tryout', mode: activeEvent ? 'event' : 'full_tryout' }}>
                                {activeEvent ? 'Lihat event di akun' : 'Lihat Full Tryout'}
                            </TrackedLink>
                        </Button>
                    </div>

                    {activeEvent && (
                        <article className="rounded-[1.5rem] border-2 border-[var(--st-ink)] bg-white p-6 shadow-[4px_4px_0_var(--st-ink)] md:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                    <span className="st-pill bg-[var(--st-green-soft)] text-green-800">{activeEvent.status === 'live' ? 'Live' : 'Terjadwal'}</span>
                                    <CpnsEventCountdown startsAt={activeEvent.starts_at} status={activeEvent.status} />
                                </div>
                                <span className="text-sm font-black text-blue-700">{formatPrice(activeEvent)}</span>
                            </div>
                            <h3 className="mt-5 text-2xl font-black tracking-tight md:text-3xl">{activeEvent.title}</h3>
                            {activeEvent.description && <p className="st-muted mt-3 font-semibold leading-relaxed">{activeEvent.description}</p>}
                            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <InfoTile icon={<CalendarDays size={19} />} label="Mulai" value={formatEventDate(activeEvent.starts_at)} />
                                <InfoTile icon={<Clock3 size={19} />} label="Durasi" value={`${activeEvent.duration_minutes} menit`} />
                                {activeEvent.max_participants && <InfoTile icon={<Trophy size={19} />} label="Kapasitas maks." value={`${activeEvent.max_participants} peserta`} />}
                            </div>
                            <TrackedLink href={eventHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'event_detail', mode: 'event' }} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                                Lihat detail dan akses event <ArrowRight size={17} />
                            </TrackedLink>
                        </article>
                    )}
                </div>
            </section>

            <section id="paket" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing overflow-hidden rounded-[2rem] border-2 border-[var(--st-ink)] bg-white">
                    <div className="grid lg:grid-cols-[1.06fr_0.94fr]">
                        <div className="bg-[var(--st-yellow-soft)] p-6 md:p-10 lg:p-12">
                            <div className="st-kicker bg-white"><Ticket size={15} /> Cara kerja token</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Anggap token sebagai unit akses sesi, bukan langganan yang membingungkan.</h2>
                            <p className="st-muted mt-4 max-w-2xl text-lg font-semibold leading-relaxed">Saat sebuah sesi membutuhkan token, jumlah yang dipakai ditampilkan sebelum sesi dimulai. Harga dan isi paket juga terlihat sebelum pembayaran.</p>
                            <Button className="mt-6" asChild>
                                <TrackedLink href={packageHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'token_packages' }}>
                                    Lihat paket token
                                </TrackedLink>
                            </Button>
                        </div>
                        <div className="p-6 md:p-10 lg:p-12">
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                                {[
                                    { step: '01', title: 'Pilih sesi', text: 'Buka Drill atau tryout yang ingin kamu kerjakan.' },
                                    { step: '02', title: 'Lihat kebutuhan token', text: 'Kebutuhan akses ditampilkan sebelum sesi dimulai.' },
                                    { step: '03', title: 'Isi token bila perlu', text: 'Pilih paket dengan harga dan manfaat yang terlihat sebelum bayar.' },
                                ].map((item) => (
                                    <div key={item.step} className="rounded-2xl bg-gray-50 p-4">
                                        <div className="flex items-center gap-3"><span className="font-display text-2xl font-black text-blue-600">{item.step}</span><p className="font-black">{item.title}</p></div>
                                        <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {latestArticles.length > 0 && (
                <section id="artikel" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                    <div className="px-container-marketing">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="max-w-3xl">
                                <div className="st-kicker">Artikel CPNS</div>
                                <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Belajar juga dari penjelasan, bukan hanya soal.</h2>
                                <p className="st-muted mt-4 font-semibold">Artikel yang relevan dengan CPNS/SKD diprioritaskan terlebih dahulu; bila belum cukup, halaman tetap menampilkan artikel terbaru sebagai fallback.</p>
                            </div>
                            <Link href="/blog" className="st-focus inline-flex min-h-11 items-center font-black text-blue-700 hover:underline">Lihat semua artikel</Link>
                        </div>
                        <div className="mt-9 grid gap-5 lg:grid-cols-3">
                            {latestArticles.map((article) => {
                                const published = formatArticleDate(article.published_at)
                                return (
                                    <article key={article.id} className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><FileText size={15} /> {published ?? 'Artikel SiapTempur'}</div>
                                        <h3 className="mt-4 text-xl font-black leading-snug tracking-tight">{article.title}</h3>
                                        {article.excerpt && <p className="st-muted mt-3 line-clamp-3 flex-1 text-sm font-semibold leading-relaxed">{article.excerpt}</p>}
                                        <Link href={`/blog/${article.slug}`} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                                            Baca artikel <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            <section id="faq" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <div className="st-kicker">Pertanyaan umum</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Sebelum mulai persiapan CPNS.</h2>
                    </div>
                    <div className="mt-9 space-y-3">
                        {faq.map((item) => (
                            <details key={item.question} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm open:bg-[var(--st-yellow-soft)]">
                                <summary className="st-focus flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-black marker:hidden">
                                    <span>{item.question}</span>
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--st-ink)] bg-white transition-transform group-open:rotate-180"><ChevronDown size={17} /></span>
                                </summary>
                                <p className="st-muted mt-3 max-w-3xl pr-10 font-semibold leading-relaxed">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20 pt-8 md:px-8 md:pb-28">
                <div className="px-container-marketing rounded-[2rem] border-2 border-[var(--st-ink)] bg-blue-600 px-6 py-10 text-white shadow-[6px_6px_0_var(--st-ink)] md:px-10 md:py-14">
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.1em]"><Sparkles size={14} /> Persiapan SKD yang lebih terarah</div>
                            <h2 className="mt-5 max-w-3xl font-display text-4xl font-black leading-tight md:text-6xl">Jangan mulai lagi dari nol setiap selesai tryout.</h2>
                            <p className="mt-4 max-w-2xl font-semibold leading-relaxed text-blue-100">Ukur kemampuanmu, baca hasilnya, lalu fokus memperbaiki TWK, TIU, atau TKP yang masih perlu dikejar.</p>
                        </div>
                        <Button variant="white" size="lg" asChild>
                            <TrackedLink href={primaryAccountHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'final_start' }}>
                                {user ? 'Lanjutkan belajar' : 'Mulai belajar CPNS'} <ArrowRight size={18} />
                            </TrackedLink>
                        </Button>
                    </div>
                </div>
            </section>

            <footer className="border-t border-gray-200 bg-white px-4 py-8 md:px-8">
                <div className="px-container-marketing flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/" className="font-display text-2xl font-black">Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.</Link>
                        <p className="st-muted mt-1 text-sm font-semibold">Persiapan SKD CPNS dengan latihan yang lebih terarah.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-gray-600">
                        <Link href="/" className="hover:text-blue-700">Beranda</Link>
                        <Link href="/tka" className="hover:text-green-700">TKA</Link>
                        <Link href="/blog" className="hover:text-blue-700">Artikel</Link>
                        <Link href="/syarat-ketentuan" className="hover:text-blue-700">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-blue-700">Privasi</Link>
                    </div>
                </div>
                <div className="px-container-marketing mt-6 border-t border-gray-200 pt-5 text-xs font-semibold text-gray-500">© SiapTempur Indonesia</div>
            </footer>
        </main>
    )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mt-0.5 text-blue-700">{icon}</div>
            <div>
                <div className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</div>
                <div className="mt-1 text-sm font-bold leading-relaxed text-gray-800">{value}</div>
            </div>
        </div>
    )
}
