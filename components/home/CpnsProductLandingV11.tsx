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
    Menu,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Target,
    Ticket,
    Trophy,
    Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import TrackedLink from '@/components/analytics/TrackedLink'

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

const learningModes = [
    {
        icon: Target,
        label: 'Drill / Latihan Fokus',
        title: 'Perkuat materi yang masih lemah.',
        text: 'Masuk lebih dalam ke materi TWK, TIU, atau TKP tanpa harus mengerjakan simulasi penuh.',
        href: '/login?returnTo=/cpns/dashboard/drilling-materi',
        cta: 'Mulai drill materi',
        mode: 'latihan_fokus',
        tone: 'bg-[var(--st-blue-soft)]',
        note: 'Cocok setelah kamu tahu area yang ingin diperbaiki.',
    },
    {
        icon: Clock3,
        label: 'Mini Tryout',
        title: 'Ukur satu bagian dengan sesi lebih ringkas.',
        text: 'Gunakan mini tryout untuk mengecek perkembangan satu bagian sebelum kembali ke latihan atau Full Tryout.',
        href: '/login?returnTo=/cpns/dashboard/mini-tryout',
        cta: 'Lihat Mini Tryout',
        mode: 'mini_tryout',
        tone: 'bg-[var(--st-yellow-soft)]',
        note: 'Cocok untuk checkpoint di tengah proses belajar.',
    },
    {
        icon: BookOpenCheck,
        label: 'Full Tryout',
        title: 'Uji kesiapan TWK, TIU, dan TKP sekaligus.',
        text: 'Kerjakan simulasi penuh dengan batas waktu, lalu jadikan hasilnya dasar untuk menentukan sesi belajar berikutnya.',
        href: '/cpns/full-tryout',
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
    { icon: ClipboardCheck, step: '01', title: 'Ukur', text: 'Kerjakan Drill, Mini Tryout, atau Full Tryout.' },
    { icon: BarChart3, step: '02', title: 'Baca hasil', text: 'Lihat bagian mana yang sudah kuat dan masih lemah.' },
    { icon: BookOpenCheck, step: '03', title: 'Pahami', text: 'Pelajari pembahasan dan kesalahan yang muncul.' },
    { icon: RotateCcw, step: '04', title: 'Perbaiki', text: 'Kembali ke latihan yang lebih relevan lalu ukur lagi.' },
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
        question: 'Bagaimana akses Full Tryout CPNS bekerja?',
        answer: 'Full Tryout CPNS menggunakan token sesuai ketentuan akses yang ditampilkan di akun. Jumlah token, harga, biaya pembayaran, dan manfaat paket ditampilkan sebelum pembelian.',
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

    return (
        <main data-experience-mode="marketing" data-program="cpns" className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <header className="sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4">
                <div className="px-container-marketing flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/90 px-4 shadow-[3px_3px_0_var(--st-ink)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link href="/" className="st-focus shrink-0 font-handwriting text-2xl font-black tracking-tight md:text-3xl">
                            Siap<span className="text-blue-600">Tempur</span>.
                        </Link>
                        <span className="hidden rounded-full bg-[var(--st-blue-soft)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-blue-700 sm:inline-flex">CPNS</span>
                    </div>

                    <nav className="hidden items-center gap-1 text-sm font-black lg:flex" aria-label="Navigasi CPNS">
                        <a href="#alur" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Alur belajar</a>
                        <a href="#latihan" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Latihan</a>
                        <a href="#event" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Event</a>
                        <a href="#paket" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Paket</a>
                        {latestArticles.length > 0 && <a href="#artikel" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">Artikel</a>}
                        <Link href="/tka" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">TKA</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {!user && (
                            <Link href="/login?returnTo=/cpns" className="st-focus hidden min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:inline-flex">
                                Masuk
                            </Link>
                        )}
                        <Button size="sm" asChild>
                            <TrackedLink
                                href={primaryAccountHref}
                                eventName="px_landing_cta"
                                eventProperties={{ program: 'cpns', surface: 'landing', cta: user ? 'header_dashboard' : 'header_start' }}
                            >
                                {user ? 'Dashboard' : 'Mulai belajar'}
                            </TrackedLink>
                        </Button>
                        <details className="group relative lg:hidden">
                            <summary className="st-focus flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white marker:hidden" aria-label="Buka menu CPNS">
                                <Menu size={20} />
                            </summary>
                            <div className="absolute right-0 top-14 w-64 rounded-2xl border-2 border-[var(--st-ink)] bg-white p-2 shadow-[4px_4px_0_var(--st-ink)]">
                                {[
                                    ['Alur belajar', '#alur'],
                                    ['Pilihan latihan', '#latihan'],
                                    ['Event tryout', '#event'],
                                    ['Paket token', '#paket'],
                                    ['FAQ', '#faq'],
                                ].map(([label, href]) => (
                                    <a key={href} href={href} className="st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-blue-50 hover:text-blue-700">{label}</a>
                                ))}
                                {latestArticles.length > 0 && <a href="#artikel" className="st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-blue-50 hover:text-blue-700">Artikel</a>}
                                <Link href="/tka" className="st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-green-700 hover:bg-green-50">Buka SiapTempur TKA</Link>
                            </div>
                        </details>
                    </div>
                </div>
            </header>

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
                                <a href="#latihan">Lihat pilihan latihan</a>
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
                                { label: 'TWK', status: 'Perlu dikuatkan', tone: 'bg-[var(--st-yellow-soft)]' },
                                { label: 'TIU', status: 'Cukup stabil', tone: 'bg-[var(--st-blue-soft)]' },
                                { label: 'TKP', status: 'Pertahankan', tone: 'bg-[var(--st-green-soft)]' },
                            ].map((item) => (
                                <div key={item.label} className={`rounded-2xl border-2 border-[var(--st-ink)] p-4 ${item.tone}`}>
                                    <p className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">{item.label}</p>
                                    <p className="mt-2 text-sm font-black text-gray-900">{item.status}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 rounded-2xl border-2 border-[var(--st-ink)] bg-white p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--st-blue-soft)] text-blue-700"><Target size={21} /></div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Contoh rekomendasi</p>
                                    <p className="mt-1 font-black">Prioritaskan Drill TWK sebelum simulasi berikutnya.</p>
                                    <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">Hasil sesi digunakan sebagai petunjuk untuk menentukan bagian yang perlu dilatih kembali.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500">
                            <ShieldCheck size={15} /> Ilustrasi tampilan untuk menjelaskan alur produk, bukan hasil peserta nyata.
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-8 md:px-8 md:pb-12">
                <div className="px-container-marketing grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
                    {['TWK', 'TIU', 'TKP', 'Drill Materi', 'Mini Tryout', 'Full Tryout'].map((item) => (
                        <div key={item} className="flex min-h-12 items-center justify-center rounded-xl bg-gray-50 px-3 text-center text-sm font-black text-gray-700">{item}</div>
                    ))}
                </div>
            </section>

            <section id="alur" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
                        <div className="lg:sticky lg:top-28 lg:self-start">
                            <div className="st-kicker">Tryout bukan akhir sesi</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Skor memberi tahu hasil. Siklus belajar memberi tahu apa yang harus dilakukan berikutnya.</h2>
                            <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">
                                Kalau sesi berhenti setelah melihat nilai, kamu masih harus menebak langkah berikutnya. SiapTempur CPNS dirancang agar hasil bisa dibawa kembali ke latihan.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {learningLoop.map(({ icon: Icon, step, title, text }) => (
                                <article key={step} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] font-handwriting text-xl font-black">{step}</div>
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

            <section id="latihan" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Pilih sesuai kebutuhan</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Tidak semua sesi harus Full Tryout.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Gunakan mode yang sesuai dengan tujuanmu hari ini. Mengukur, memperdalam, dan menguji kesiapan adalah tiga kebutuhan yang berbeda.</p>
                    </div>

                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {learningModes.map(({ icon: Icon, label, title, text, href, cta, mode, tone, note }) => (
                            <article key={title} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-7">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${tone}`}><Icon size={23} /></div>
                                <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{label}</p>
                                <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
                                <p className="st-muted mt-3 font-semibold leading-relaxed">{text}</p>
                                <div className="mt-5 rounded-xl bg-gray-50 px-3 py-3 text-sm font-bold leading-relaxed text-gray-600">{note}</div>
                                <TrackedLink
                                    href={href}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: `mode_${mode}`, mode }}
                                    className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline"
                                >
                                    {cta} <ArrowRight size={17} />
                                </TrackedLink>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="event" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <div>
                        <div className="st-kicker"><Trophy size={15} /> Event tryout</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Ukur kemampuan dalam sesi terjadwal.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Ikuti event yang tersedia untuk mengerjakan tryout pada waktu yang sama dan melihat hasil dalam konteks event tersebut.</p>
                        <Button className="mt-6" asChild>
                            <TrackedLink href={eventHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'event' }}>
                                Lihat event di akun
                            </TrackedLink>
                        </Button>
                    </div>

                    {activeEvent ? (
                        <article className="rounded-[1.5rem] border-2 border-[var(--st-ink)] bg-white p-6 shadow-[4px_4px_0_var(--st-ink)] md:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="st-pill bg-[var(--st-green-soft)] text-green-800">{activeEvent.status === 'live' ? 'Sedang berlangsung' : 'Terjadwal'}</span>
                                <span className="text-sm font-black text-blue-700">{formatPrice(activeEvent)}</span>
                            </div>
                            <h3 className="mt-5 text-2xl font-black tracking-tight md:text-3xl">{activeEvent.title}</h3>
                            {activeEvent.description && <p className="st-muted mt-3 font-semibold leading-relaxed">{activeEvent.description}</p>}
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <InfoTile icon={<CalendarDays size={19} />} label="Mulai" value={formatEventDate(activeEvent.starts_at)} />
                                <InfoTile icon={<Clock3 size={19} />} label="Durasi" value={`${activeEvent.duration_minutes} menit`} />
                            </div>
                            <Link href={eventHref} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                                Lihat detail dan akses event <ArrowRight size={17} />
                            </Link>
                        </article>
                    ) : (
                        <div className="rounded-[1.5rem] border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--st-yellow-soft)]"><CalendarDays size={23} /></div>
                            <h3 className="mt-4 text-xl font-black">Belum ada event aktif.</h3>
                            <p className="st-muted mx-auto mt-2 max-w-lg font-semibold leading-relaxed">Kamu tetap bisa berlatih mandiri sambil menunggu jadwal event berikutnya.</p>
                            <Link href="/cpns/full-tryout" className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                                Lihat Full Tryout <ArrowRight size={17} />
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section id="paket" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing overflow-hidden rounded-[2rem] border-2 border-[var(--st-ink)] bg-white">
                    <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                        <div className="bg-[var(--st-yellow-soft)] p-6 md:p-10 lg:p-12">
                            <div className="st-kicker bg-white"><Ticket size={15} /> Akses Full Tryout</div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Token dipakai ketika kamu siap mengukur kemampuan lewat Full Tryout.</h2>
                            <p className="st-muted mt-4 max-w-2xl text-lg font-semibold leading-relaxed">Jumlah token, harga, biaya pembayaran, dan manfaat paket ditampilkan sebelum kamu membeli.</p>
                            <Button className="mt-6" asChild>
                                <TrackedLink href={packageHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'token_packages' }}>
                                    Lihat paket token
                                </TrackedLink>
                            </Button>
                        </div>
                        <div className="p-6 md:p-10 lg:p-12">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Sebelum membeli</p>
                            <div className="mt-5 space-y-4">
                                {[
                                    'Harga dan isi paket terlihat sebelum pembayaran',
                                    'Token digunakan sesuai aturan akses tryout yang ditampilkan',
                                    'Status pembayaran diperbarui setelah pembayaran diverifikasi',
                                ].map((text) => (
                                    <div key={text} className="flex items-start gap-3">
                                        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
                                        <span className="font-bold leading-relaxed text-gray-700">{text}</span>
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
                            </div>
                            <Link href="/blog" className="st-focus inline-flex min-h-11 items-center font-black text-blue-700 hover:underline">Lihat semua artikel</Link>
                        </div>
                        <div className="mt-9 grid gap-5 lg:grid-cols-3">
                            {latestArticles.map((article) => {
                                const published = formatArticleDate(article.published_at)
                                return (
                                    <article key={article.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><FileText size={15} /> {published ?? 'Artikel SiapTempur'}</div>
                                        <h3 className="mt-4 text-xl font-black leading-snug tracking-tight">{article.title}</h3>
                                        {article.excerpt && <p className="st-muted mt-3 line-clamp-3 flex-1 text-sm font-semibold leading-relaxed">{article.excerpt}</p>}
                                        <Link href={`/blog/${article.slug}`} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                                            Baca artikel <ArrowRight size={17} />
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
                            <h2 className="mt-5 max-w-3xl font-handwriting text-4xl font-black leading-tight md:text-6xl">Jangan mulai lagi dari nol setiap selesai tryout.</h2>
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
                        <Link href="/" className="font-handwriting text-2xl font-black">Siap<span className="text-blue-600">Tempur</span>.</Link>
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
