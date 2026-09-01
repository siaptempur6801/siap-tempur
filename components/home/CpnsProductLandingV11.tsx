import Link from 'next/link'
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    History,
    ShieldCheck,
    Target,
    Ticket,
    Trophy,
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

const learningSteps = [
    {
        number: '01',
        title: 'Pilih latihan',
        text: 'Mulai dari latihan fokus, mini tryout, atau full tryout sesuai kebutuhanmu.',
    },
    {
        number: '02',
        title: 'Ukur kemampuan',
        text: 'Gunakan hasil sesi untuk melihat bagian yang sudah kuat dan yang masih perlu perhatian.',
    },
    {
        number: '03',
        title: 'Pelajari pembahasan',
        text: 'Tinjau jawaban agar kamu memahami kesalahan, bukan sekadar mengetahui skor.',
    },
    {
        number: '04',
        title: 'Perbaiki lalu ulangi',
        text: 'Kembali ke latihan yang relevan dan ukur lagi perkembanganmu pada sesi berikutnya.',
    },
] as const

const learningModes = [
    {
        icon: Target,
        label: 'Latihan Fokus',
        title: 'Perkuat bagian tertentu',
        text: 'Fokus pada TWK, TIU, atau TKP ketika kamu ingin memperdalam bagian tertentu tanpa harus menjalani simulasi penuh.',
        href: '/login?returnTo=/cpns/dashboard/drilling-materi',
        cta: 'Mulai latihan fokus',
        mode: 'latihan_fokus',
        tone: 'bg-blue-50 text-blue-700',
    },
    {
        icon: Clock3,
        label: 'Mini Tryout',
        title: 'Ukur satu bagian lebih cepat',
        text: 'Gunakan sesi yang lebih ringkas untuk mengecek perkembanganmu sebelum mencoba full tryout.',
        href: '/login?returnTo=/cpns/dashboard/mini-tryout',
        cta: 'Lihat mini tryout',
        mode: 'mini_tryout',
        tone: 'bg-amber-50 text-amber-700',
    },
    {
        icon: BookOpenCheck,
        label: 'Full Tryout',
        title: 'Uji persiapan dalam satu sesi',
        text: 'Kerjakan TWK, TIU, dan TKP dengan batas waktu, lalu gunakan hasil dan pembahasan untuk menentukan latihan berikutnya.',
        href: '/cpns/full-tryout',
        cta: 'Lihat full tryout',
        mode: 'full_tryout',
        tone: 'bg-emerald-50 text-emerald-700',
    },
] as const

const faq = [
    {
        question: 'Apa bedanya SiapTempur dengan sekadar mengerjakan bank soal?',
        answer: 'SiapTempur dirancang agar latihan tidak berhenti saat soal selesai. Kamu bisa melihat hasil, meninjau pembahasan, dan menggunakan informasi tersebut untuk menentukan latihan berikutnya.',
    },
    {
        question: 'Apakah satu akun bisa dipakai untuk CPNS dan TKA?',
        answer: 'Ya. Satu akun SiapTempur dapat digunakan untuk produk yang tersedia, sementara perkembangan tiap jalur belajar tetap disimpan sesuai konteksnya.',
    },
    {
        question: 'Bagaimana akses full tryout CPNS bekerja?',
        answer: 'Full tryout CPNS menggunakan token sesuai ketentuan akses yang ditampilkan di akunmu. Lihat halaman paket untuk jumlah token, harga, dan manfaat yang tersedia saat ini.',
    },
    {
        question: 'Apa yang bisa saya lihat setelah tryout selesai?',
        answer: 'Kamu dapat melihat hasil sesi dan pembahasan yang tersedia. Tujuannya agar hasil tersebut bisa digunakan untuk memahami bagian yang masih perlu diperbaiki.',
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
        <main data-experience-mode="marketing" data-program="cpns" className="min-h-screen bg-white text-slate-950">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                <div className="px-container-marketing flex min-h-16 items-center justify-between gap-4 px-4 md:px-8">
                    <Link
                        href="/"
                        className="rounded-md font-handwriting text-2xl font-bold tracking-tight text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:text-3xl"
                    >
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>

                    <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex" aria-label="Navigasi CPNS">
                        <a href="#cara-belajar" className="transition-colors hover:text-slate-950">Cara belajar</a>
                        <a href="#pilihan-latihan" className="transition-colors hover:text-slate-950">Latihan</a>
                        <a href="#active-event" className="transition-colors hover:text-slate-950">Event</a>
                        {latestArticles.length > 0 && <a href="#artikel" className="transition-colors hover:text-slate-950">Artikel</a>}
                        <a href="#faq" className="transition-colors hover:text-slate-950">FAQ</a>
                        <Link href="/tka" className="transition-colors hover:text-slate-950">TKA</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {!user && (
                            <Link
                                href="/login?returnTo=/cpns"
                                className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex"
                            >
                                Masuk
                            </Link>
                        )}
                        <Button size="sm" asChild>
                            <TrackedLink
                                href={primaryAccountHref}
                                eventName="px_landing_cta"
                                eventProperties={{ program: 'cpns', surface: 'landing', cta: user ? 'header_dashboard' : 'header_start' }}
                            >
                                {user ? 'Buka dashboard' : 'Mulai belajar'}
                            </TrackedLink>
                        </Button>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70 px-4 py-16 md:px-8 md:py-24 lg:py-28">
                <div className="pointer-events-none absolute right-[-8rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-blue-100/70 blur-3xl" aria-hidden="true" />
                <div className="px-container-marketing relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
                    <div>
                        <p className="text-sm font-semibold text-blue-700">Persiapan SKD CPNS</p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-6xl md:text-7xl md:leading-[0.98]">
                            Persiapan SKD yang tidak berhenti di skor.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
                            Latihan TWK, TIU, dan TKP, ukur kemampuanmu, pelajari pembahasan, lalu fokus memperbaiki bagian yang masih lemah.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button size="lg" asChild>
                                <TrackedLink
                                    href={primaryAccountHref}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: 'primary_start' }}
                                >
                                    Mulai persiapan <ArrowRight size={18} />
                                </TrackedLink>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <a href="#cara-belajar">Lihat cara kerjanya</a>
                            </Button>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                            Satu akun untuk menyimpan sesi, hasil, dan perkembangan belajarmu.
                        </p>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[var(--px-shadow-md)] md:p-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-blue-700">Siklus belajar</p>
                                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">Kerjakan. Pahami. Perbaiki.</h2>
                            </div>
                            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 sm:flex">
                                <Target size={23} />
                            </div>
                        </div>
                        <div className="mt-7 space-y-1">
                            {[
                                { icon: Target, title: 'Latihan sesuai kebutuhanmu', text: 'Pilih bentuk latihan yang sesuai dengan tujuanmu hari ini.' },
                                { icon: BarChart3, title: 'Lihat hasil setiap sesi', text: 'Gunakan hasil untuk melihat bagian kuat dan bagian yang perlu perhatian.' },
                                { icon: BookOpenCheck, title: 'Pelajari pembahasan', text: 'Pahami alasan di balik jawaban, bukan hanya benar atau salah.' },
                                { icon: History, title: 'Tentukan langkah berikutnya', text: 'Kembali berlatih pada bagian yang paling membutuhkan perbaikan.' },
                            ].map(({ icon: Icon, title, text }) => (
                                <div key={title} className="flex gap-4 rounded-2xl p-3 transition-colors hover:bg-slate-50">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                        <Icon size={19} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{title}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="cara-belajar" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold text-blue-700">Cara belajar</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Jangan belajar tanpa arah.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                            Setiap sesi seharusnya memberimu informasi baru tentang kemampuanmu dan membantu memilih latihan berikutnya.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
                        {learningSteps.map((step) => (
                            <article key={step.number} className="border-t border-slate-200 pt-5">
                                <div className="text-sm font-bold text-blue-700">{step.number}</div>
                                <h3 className="mt-3 text-lg font-bold text-slate-950">{step.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="pilihan-latihan" className="scroll-mt-24 border-y border-slate-200 bg-slate-50 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold text-blue-700">Pilih sesuai kebutuhan</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Tidak semua sesi harus full tryout.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">Pilih jenis latihan berdasarkan tujuanmu hari ini.</p>
                    </div>

                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {learningModes.map(({ icon: Icon, label, title, text, href, cta, mode, tone }) => (
                            <article key={title} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[var(--px-shadow-xs)] md:p-7">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                                    <Icon size={21} />
                                </div>
                                <p className="mt-5 text-sm font-semibold text-blue-700">{label}</p>
                                <h3 className="mt-1 text-xl font-bold text-slate-950 md:text-2xl">{title}</h3>
                                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{text}</p>
                                <TrackedLink
                                    href={href}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: `mode_${mode}`, mode }}
                                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    {cta} <ArrowRight size={16} />
                                </TrackedLink>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="active-event" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Trophy size={21} /></div>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Ukur kemampuan bersama peserta lain.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                            Event memberi kamu kesempatan mengikuti sesi terjadwal dan melihat hasil dalam konteks peserta event yang sama.
                        </p>
                        <Button className="mt-6" asChild>
                            <TrackedLink href={eventHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'event' }}>
                                Lihat event di akun
                            </TrackedLink>
                        </Button>
                    </div>

                    {activeEvent ? (
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[var(--px-shadow-sm)] md:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                    {activeEvent.status === 'live' ? 'Sedang berlangsung' : 'Terjadwal'}
                                </span>
                                <span className="text-sm font-semibold text-blue-700">{formatPrice(activeEvent)}</span>
                            </div>
                            <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{activeEvent.title}</h3>
                            {activeEvent.description && <p className="mt-3 leading-relaxed text-slate-600">{activeEvent.description}</p>}
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <InfoTile icon={<CalendarDays size={19} />} label="Mulai" value={formatEventDate(activeEvent.starts_at)} />
                                <InfoTile icon={<Clock3 size={19} />} label="Durasi" value={`${activeEvent.duration_minutes} menit`} />
                            </div>
                            <Link href={eventHref} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                                Lihat detail dan akses event <ArrowRight size={16} />
                            </Link>
                        </article>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center md:p-10">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"><CalendarDays size={23} /></div>
                            <h3 className="mt-4 text-xl font-bold text-slate-950">Belum ada event aktif.</h3>
                            <p className="mx-auto mt-2 max-w-lg leading-relaxed text-slate-600">Kamu tetap bisa berlatih mandiri sambil menunggu jadwal event berikutnya.</p>
                            <Link href="/cpns/full-tryout" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                                Lihat full tryout <ArrowRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section className="border-y border-slate-200 bg-blue-50/60 px-4 py-16 md:px-8 md:py-20">
                <div className="px-container-marketing grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
                    <div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Ticket size={21} /></div>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Gunakan token saat kamu siap full tryout.</h2>
                        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                            Jumlah token, harga, biaya pembayaran, dan manfaat paket ditampilkan sebelum kamu membeli.
                        </p>
                        <Button className="mt-6" asChild>
                            <TrackedLink href={packageHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'token_packages' }}>
                                Lihat paket token
                            </TrackedLink>
                        </Button>
                    </div>
                    <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[var(--px-shadow-xs)]">
                        <div className="space-y-4">
                            {[
                                'Harga dan isi paket terlihat sebelum pembayaran',
                                'Token digunakan sesuai aturan akses tryout yang ditampilkan',
                                'Status pembayaran diperbarui setelah pembayaran diverifikasi',
                            ].map((text) => (
                                <div key={text} className="flex items-start gap-3">
                                    <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
                                    <span className="text-sm font-medium leading-relaxed text-slate-700">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {latestArticles.length > 0 && (
                <section id="artikel" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                    <div className="px-container-marketing">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="max-w-3xl">
                                <p className="text-sm font-semibold text-blue-700">Artikel terbaru</p>
                                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Belajar juga dari penjelasan.</h2>
                            </div>
                            <Link href="/blog" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:underline">Lihat semua artikel</Link>
                        </div>

                        <div className="mt-9 grid gap-5 lg:grid-cols-3">
                            {latestArticles.map((article) => {
                                const published = formatArticleDate(article.published_at)
                                return (
                                    <article key={article.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[var(--px-shadow-xs)]">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                            <FileText size={15} /> {published ?? 'Artikel SiapTempur'}
                                        </div>
                                        <h3 className="mt-4 text-xl font-bold leading-snug text-slate-950">{article.title}</h3>
                                        {article.excerpt && <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{article.excerpt}</p>}
                                        <Link href={`/blog/${article.slug}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                                            Baca artikel <ArrowRight size={16} />
                                        </Link>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            <section id="faq" className="scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <p className="text-sm font-semibold text-blue-700">FAQ</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Sebelum kamu mulai.</h2>
                    </div>
                    <div className="mt-9 space-y-3">
                        {faq.map((item) => (
                            <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[var(--px-shadow-xs)]">
                                <summary className="cursor-pointer list-none rounded-lg font-semibold text-slate-950 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                                    <span className="flex min-h-8 items-center justify-between gap-4">
                                        {item.question}
                                        <span aria-hidden="true" className="text-xl font-normal text-slate-400 transition-transform group-open:rotate-45">+</span>
                                    </span>
                                </summary>
                                <p className="mt-4 border-t border-slate-100 pt-4 leading-relaxed text-slate-600">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-center text-white shadow-[var(--px-shadow-lg)] md:p-12">
                    <ShieldCheck className="mx-auto h-10 w-10 text-blue-300" />
                    <h2 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">Mulai dari langkah yang paling kamu butuhkan.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
                        Tidak perlu mengerjakan semuanya sekaligus. Masuk, pilih latihan, lihat hasil, lalu perbaiki satu bagian demi satu bagian.
                    </p>
                    <Button variant="white" size="lg" className="mt-7" asChild>
                        <Link href={primaryAccountHref}>{user ? 'Lanjutkan belajar' : 'Mulai belajar'}</Link>
                    </Button>
                </div>
            </section>

            <footer className="border-t border-slate-200 bg-white px-4 py-8 md:px-8">
                <div className="px-container-marketing flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
                    <span>© SiapTempur Indonesia</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/" className="hover:text-slate-900">Beranda</Link>
                        <Link href="/tka" className="hover:text-slate-900">TKA</Link>
                        <Link href="/blog" className="hover:text-slate-900">Artikel</Link>
                        <Link href="/syarat-ketentuan" className="hover:text-slate-900">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-slate-900">Kebijakan Privasi</Link>
                    </div>
                </div>
            </footer>
        </main>
    )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="mt-0.5 text-blue-700">{icon}</div>
            <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">{value}</div>
            </div>
        </div>
    )
}
