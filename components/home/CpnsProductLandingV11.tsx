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
        text: 'Kerjakan soal dan gunakan hasilnya untuk melihat bagian yang sudah kuat atau masih perlu perhatian.',
    },
    {
        number: '03',
        title: 'Pelajari pembahasan',
        text: 'Tinjau jawaban untuk memahami kesalahan, bukan sekadar mengetahui skor.',
    },
    {
        number: '04',
        title: 'Perbaiki lalu ulangi',
        text: 'Kembali ke latihan yang relevan, lalu ukur lagi perkembanganmu pada sesi berikutnya.',
    },
] as const

const learningModes = [
    {
        icon: Target,
        eyebrow: 'Latihan fokus',
        title: 'Perkuat bagian tertentu',
        text: 'Gunakan latihan TWK, TIU, atau TKP saat kamu ingin memperdalam bagian tertentu sebelum mencoba sesi yang lebih panjang.',
        href: '/login?returnTo=/cpns/dashboard/drilling-materi',
        cta: 'Mulai latihan fokus',
        mode: 'latihan_fokus',
        surface: 'bg-yellow-50',
    },
    {
        icon: Clock3,
        eyebrow: 'Mini tryout',
        title: 'Ukur satu bagian lebih cepat',
        text: 'Cocok ketika kamu ingin menguji kemampuan dalam sesi yang lebih ringkas sebelum full tryout.',
        href: '/login?returnTo=/cpns/dashboard/mini-tryout',
        cta: 'Lihat mini tryout',
        mode: 'mini_tryout',
        surface: 'bg-cyan-50',
    },
    {
        icon: BookOpenCheck,
        eyebrow: 'Full tryout',
        title: 'Uji persiapan dalam satu sesi',
        text: 'Kerjakan TWK, TIU, dan TKP dengan batas waktu, lalu gunakan hasil dan pembahasan sebagai dasar latihan berikutnya.',
        href: '/cpns/full-tryout',
        cta: 'Lihat full tryout',
        mode: 'full_tryout',
        surface: 'bg-blue-50',
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
        <main data-experience-mode="marketing" className="min-h-screen bg-[#fdfbf7] text-gray-900">
            <header className="sticky top-0 z-40 border-b-2 border-gray-900 bg-[#fdfbf7]/95 backdrop-blur">
                <div className="px-container-marketing mx-auto flex min-h-18 items-center justify-between gap-4 px-4 md:px-8">
                    <Link href="/" className="font-handwriting text-3xl font-black tracking-tight">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>

                    <nav className="hidden items-center gap-6 text-sm font-bold lg:flex" aria-label="Navigasi CPNS">
                        <a href="#cara-belajar" className="hover:text-blue-700">Cara belajar</a>
                        <a href="#pilihan-latihan" className="hover:text-blue-700">Latihan</a>
                        <a href="#active-event" className="hover:text-blue-700">Event</a>
                        <a href="#artikel" className="hover:text-blue-700">Artikel</a>
                        <a href="#faq" className="hover:text-blue-700">FAQ</a>
                        <Link href="/tka" className="hover:text-blue-700">TKA</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {!user && (
                            <Link href="/login?returnTo=/cpns" className="hidden px-3 py-2 text-sm font-bold hover:text-blue-700 sm:inline-flex">
                                Masuk
                            </Link>
                        )}
                        <Button handwriting={false} size="sm" asChild>
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

            <section className="relative overflow-hidden border-b-2 border-gray-900 px-4 py-16 md:px-8 md:py-24">
                <div className="absolute -right-28 top-10 h-72 w-72 rotate-6 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full border-2 border-dashed border-yellow-400 bg-yellow-50" aria-hidden="true" />

                <div className="px-container-marketing relative mx-auto grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                        <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-200 px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#111]">
                            <Target size={15} /> Persiapan SKD CPNS
                        </div>
                        <h1 className="mt-6 max-w-4xl font-handwriting text-5xl font-black leading-[0.98] md:text-7xl">
                            Persiapan SKD yang tidak berhenti di skor.
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg font-semibold leading-relaxed text-gray-600 md:text-xl">
                            Latihan TWK, TIU, dan TKP, ukur kemampuanmu, pelajari pembahasan, lalu fokus memperbaiki bagian yang masih lemah.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button handwriting={false} size="lg" asChild>
                                <TrackedLink
                                    href={primaryAccountHref}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: 'primary_start' }}
                                >
                                    Mulai persiapan <ArrowRight size={18} />
                                </TrackedLink>
                            </Button>
                            <Button handwriting={false} size="lg" variant="outline" asChild>
                                <a href="#cara-belajar">Lihat cara kerjanya</a>
                            </Button>
                        </div>
                        <p className="mt-4 text-sm font-semibold text-gray-500">
                            Satu akun untuk menyimpan sesi, hasil, dan perkembangan belajarmu.
                        </p>
                    </div>

                    <div className="border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0_0_#111] md:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Siklus belajar</p>
                        <h2 className="mt-2 font-handwriting text-4xl font-black">Kerjakan. Pahami. Perbaiki.</h2>
                        <div className="mt-6 space-y-4">
                            {[
                                { icon: Target, text: 'Latihan sesuai kebutuhanmu' },
                                { icon: BarChart3, text: 'Lihat hasil setiap sesi' },
                                { icon: BookOpenCheck, text: 'Pelajari pembahasan jawaban' },
                                { icon: History, text: 'Gunakan hasil untuk latihan berikutnya' },
                            ].map(({ icon: Icon, text }) => (
                                <div key={text} className="flex items-center gap-3 border-b border-dashed border-gray-300 pb-4 last:border-0 last:pb-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-gray-900 bg-blue-50">
                                        <Icon size={20} className="text-blue-700" />
                                    </div>
                                    <span className="font-bold text-gray-700">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="cara-belajar" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
                <div className="px-container-marketing mx-auto">
                    <div className="max-w-3xl">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Cara belajar</p>
                        <h2 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Jangan belajar tanpa arah.</h2>
                        <p className="mt-3 text-lg font-semibold leading-relaxed text-gray-600">
                            Gunakan setiap latihan untuk mendapatkan informasi baru tentang kemampuanmu, lalu tentukan langkah berikutnya.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {learningSteps.map((step) => (
                            <article key={step.number} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                <div className="text-xs font-black tracking-[0.2em] text-blue-700">{step.number}</div>
                                <h3 className="mt-3 text-xl font-black">{step.title}</h3>
                                <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-600">{step.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="pilihan-latihan" className="scroll-mt-24 border-y-2 border-gray-900 bg-blue-50 px-4 py-16 md:px-8 md:py-20">
                <div className="px-container-marketing mx-auto">
                    <div className="max-w-3xl">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Pilih sesuai kebutuhan</p>
                        <h2 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Tidak semua sesi harus full tryout.</h2>
                        <p className="mt-3 text-lg font-semibold text-gray-600">
                            Pilih jenis latihan berdasarkan tujuanmu hari ini.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-6 lg:grid-cols-3">
                        {learningModes.map(({ icon: Icon, eyebrow, title, text, href, cta, mode, surface }) => (
                            <article key={title} className={`flex flex-col border-2 border-gray-900 p-6 shadow-[5px_5px_0_0_#111] ${surface}`}>
                                <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-white">
                                    <Icon size={24} className="text-blue-700" />
                                </div>
                                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
                                <h3 className="mt-1 text-2xl font-black">{title}</h3>
                                <p className="mt-3 flex-1 font-semibold leading-relaxed text-gray-600">{text}</p>
                                <TrackedLink
                                    href={href}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: `mode_${mode}`, mode }}
                                    className="mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    {cta} <ArrowRight size={17} />
                                </TrackedLink>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="active-event" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
                <div className="px-container-marketing mx-auto">
                    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-100 px-3 py-1 text-xs font-black uppercase">
                                <Trophy size={15} /> Event tryout
                            </div>
                            <h2 className="mt-4 font-handwriting text-4xl font-black md:text-5xl">Ukur kemampuan bersama peserta lain.</h2>
                            <p className="mt-4 text-lg font-semibold leading-relaxed text-gray-600">
                                Event memberi kamu kesempatan mengikuti sesi terjadwal dan melihat hasil dalam konteks peserta event yang sama.
                            </p>
                            <Button handwriting={false} className="mt-6" asChild>
                                <TrackedLink
                                    href={eventHref}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: 'event' }}
                                >
                                    Lihat event di akun
                                </TrackedLink>
                            </Button>
                        </div>

                        {activeEvent ? (
                            <article className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] md:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="border-2 border-gray-900 bg-green-100 px-3 py-1 text-xs font-black uppercase">
                                        {activeEvent.status === 'live' ? 'Sedang berlangsung' : 'Terjadwal'}
                                    </span>
                                    <span className="text-sm font-black text-blue-700">{formatPrice(activeEvent)}</span>
                                </div>
                                <h3 className="mt-5 text-2xl font-black md:text-3xl">{activeEvent.title}</h3>
                                {activeEvent.description && (
                                    <p className="mt-3 font-semibold leading-relaxed text-gray-600">{activeEvent.description}</p>
                                )}
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <div className="flex items-start gap-3 border border-gray-300 bg-gray-50 p-3">
                                        <CalendarDays size={20} className="mt-0.5 shrink-0 text-blue-700" />
                                        <div>
                                            <div className="text-xs font-black uppercase text-gray-500">Mulai</div>
                                            <div className="mt-1 text-sm font-bold">{formatEventDate(activeEvent.starts_at)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 border border-gray-300 bg-gray-50 p-3">
                                        <Clock3 size={20} className="mt-0.5 shrink-0 text-blue-700" />
                                        <div>
                                            <div className="text-xs font-black uppercase text-gray-500">Durasi</div>
                                            <div className="mt-1 text-sm font-bold">{activeEvent.duration_minutes} menit</div>
                                        </div>
                                    </div>
                                </div>
                                <Link href={eventHref} className="mt-5 inline-flex items-center gap-2 font-black text-blue-700 hover:underline">
                                    Lihat detail dan akses event <ArrowRight size={17} />
                                </Link>
                            </article>
                        ) : (
                            <div className="border-2 border-dashed border-gray-400 bg-white p-8 text-center">
                                <CalendarDays className="mx-auto h-10 w-10 text-gray-400" />
                                <h3 className="mt-4 text-xl font-black">Belum ada event aktif.</h3>
                                <p className="mt-2 font-semibold text-gray-600">
                                    Kamu tetap bisa berlatih mandiri sambil menunggu jadwal event berikutnya.
                                </p>
                                <Link href="/cpns/full-tryout" className="mt-5 inline-flex items-center gap-2 font-black text-blue-700 hover:underline">
                                    Lihat full tryout <ArrowRight size={17} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="border-y-2 border-gray-900 bg-yellow-50 px-4 py-16 md:px-8">
                <div className="px-container-marketing mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-3 py-1 text-xs font-black uppercase">
                            <Ticket size={15} /> Akses full tryout
                        </div>
                        <h2 className="mt-4 font-handwriting text-4xl font-black md:text-5xl">Gunakan token saat kamu siap full tryout.</h2>
                        <p className="mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-gray-600">
                            Jumlah token, harga, biaya pembayaran, dan manfaat paket ditampilkan di akun agar kamu bisa melihat pilihan yang tersedia sebelum membeli.
                        </p>
                        <Button handwriting={false} className="mt-6" asChild>
                            <TrackedLink
                                href={packageHref}
                                eventName="px_landing_cta"
                                eventProperties={{ program: 'cpns', surface: 'landing', cta: 'token_packages' }}
                            >
                                Lihat paket token
                            </TrackedLink>
                        </Button>
                    </div>
                    <div className="border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0_0_#111]">
                        <div className="space-y-4">
                            {[
                                'Harga dan isi paket terlihat sebelum pembayaran',
                                'Token digunakan sesuai aturan akses tryout yang ditampilkan',
                                'Status pembayaran diperbarui setelah pembayaran diverifikasi',
                            ].map((text) => (
                                <div key={text} className="flex items-start gap-3">
                                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-700" />
                                    <span className="font-bold text-gray-700">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {latestArticles.length > 0 && (
                <section id="artikel" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
                    <div className="px-container-marketing mx-auto">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="max-w-3xl">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Artikel terbaru</p>
                                <h2 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Belajar juga dari penjelasan.</h2>
                            </div>
                            <Link href="/blog" className="font-black text-blue-700 hover:underline">Lihat semua artikel</Link>
                        </div>

                        <div className="mt-8 grid gap-5 lg:grid-cols-3">
                            {latestArticles.map((article) => {
                                const published = formatArticleDate(article.published_at)
                                return (
                                    <article key={article.id} className="flex flex-col border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                            <FileText size={15} />
                                            {published ?? 'Artikel SiapTempur'}
                                        </div>
                                        <h3 className="mt-4 text-xl font-black leading-snug">{article.title}</h3>
                                        {article.excerpt && (
                                            <p className="mt-3 line-clamp-3 flex-1 text-sm font-semibold leading-relaxed text-gray-600">{article.excerpt}</p>
                                        )}
                                        <Link href={`/blog/${article.slug}`} className="mt-5 inline-flex items-center gap-2 font-black text-blue-700 hover:underline">
                                            Baca artikel <ArrowRight size={16} />
                                        </Link>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            <section id="faq" className="scroll-mt-24 border-t-2 border-gray-900 bg-blue-50 px-4 py-16 md:px-8 md:py-20">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">FAQ</p>
                        <h2 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Sebelum kamu mulai.</h2>
                    </div>
                    <div className="mt-8 space-y-3">
                        {faq.map((item) => (
                            <details key={item.question} className="group border-2 border-gray-900 bg-white p-5 shadow-[3px_3px_0_0_#111]">
                                <summary className="cursor-pointer list-none font-black marker:hidden">
                                    <span className="flex items-center justify-between gap-4">
                                        {item.question}
                                        <span aria-hidden="true" className="text-blue-700 transition group-open:rotate-45">+</span>
                                    </span>
                                </summary>
                                <p className="mt-4 border-t border-dashed border-gray-300 pt-4 font-semibold leading-relaxed text-gray-600">
                                    {item.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-20">
                <div className="mx-auto max-w-5xl border-2 border-gray-900 bg-gray-900 p-8 text-center text-white shadow-[8px_8px_0_0_#3b82f6] md:p-12">
                    <ShieldCheck className="mx-auto h-10 w-10 text-yellow-300" />
                    <h2 className="mt-4 font-handwriting text-4xl font-black md:text-5xl">Mulai dari langkah yang paling kamu butuhkan.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold text-gray-300">
                        Tidak perlu mengerjakan semuanya sekaligus. Masuk, pilih latihan, lihat hasil, lalu perbaiki satu bagian demi satu bagian.
                    </p>
                    <Button handwriting={false} variant="white" size="lg" className="mt-7" asChild>
                        <Link href={primaryAccountHref}>{user ? 'Lanjutkan belajar' : 'Mulai belajar'}</Link>
                    </Button>
                </div>
            </section>

            <footer className="border-t-2 border-gray-900 px-4 py-8 md:px-8">
                <div className="px-container-marketing mx-auto flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-gray-600">
                    <span>© SiapTempur Indonesia</span>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/" className="hover:text-gray-900">Beranda</Link>
                        <Link href="/tka" className="hover:text-gray-900">TKA</Link>
                        <Link href="/blog" className="hover:text-gray-900">Artikel</Link>
                        <Link href="/syarat-ketentuan" className="hover:text-gray-900">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-gray-900">Kebijakan Privasi</Link>
                    </div>
                </div>
            </footer>
        </main>
    )
}
