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
    { number: '01', title: 'Pilih latihan', text: 'Mulai dari Latihan Fokus, Mini Tryout, atau Full Tryout sesuai kebutuhanmu.' },
    { number: '02', title: 'Ukur kemampuan', text: 'Gunakan hasil sesi untuk melihat bagian yang sudah kuat dan yang masih perlu perhatian.' },
    { number: '03', title: 'Pelajari pembahasan', text: 'Tinjau jawaban agar kamu memahami kesalahan, bukan sekadar mengetahui skor.' },
    { number: '04', title: 'Perbaiki lalu ulangi', text: 'Kembali ke latihan yang relevan dan ukur lagi perkembanganmu pada sesi berikutnya.' },
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
        tone: 'bg-blue-100 text-blue-700',
    },
    {
        icon: Clock3,
        label: 'Mini Tryout',
        title: 'Ukur satu bagian lebih cepat',
        text: 'Gunakan sesi yang lebih ringkas untuk mengecek perkembanganmu sebelum mencoba Full Tryout.',
        href: '/login?returnTo=/cpns/dashboard/mini-tryout',
        cta: 'Lihat mini tryout',
        mode: 'mini_tryout',
        tone: 'bg-yellow-100 text-amber-800',
    },
    {
        icon: BookOpenCheck,
        label: 'Full Tryout',
        title: 'Uji persiapan dalam satu sesi',
        text: 'Kerjakan TWK, TIU, dan TKP dengan batas waktu, lalu gunakan hasil dan pembahasan untuk menentukan latihan berikutnya.',
        href: '/cpns/full-tryout',
        cta: 'Lihat full tryout',
        mode: 'full_tryout',
        tone: 'bg-emerald-100 text-emerald-700',
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
        question: 'Bagaimana akses Full Tryout CPNS bekerja?',
        answer: 'Full Tryout CPNS menggunakan token sesuai ketentuan akses yang ditampilkan di akunmu. Lihat halaman paket untuk jumlah token, harga, dan manfaat yang tersedia saat ini.',
    },
    {
        question: 'Apa yang bisa saya lihat setelah tryout selesai?',
        answer: 'Kamu dapat melihat hasil sesi dan pembahasan yang tersedia agar lebih mudah memahami bagian yang masih perlu diperbaiki.',
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
        <main data-experience-mode="marketing" data-program="cpns" className="st-product min-h-screen">
            <header className="sticky top-0 z-40 border-b-2 border-slate-900 bg-[#fbfaf7]/95 backdrop-blur">
                <div className="px-container-marketing flex min-h-18 items-center justify-between gap-4 px-4 md:px-8">
                    <Link href="/" className="st-focus font-handwriting text-3xl font-black tracking-tight text-slate-950">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>
                    <nav className="hidden items-center gap-7 text-sm font-black text-slate-800 lg:flex" aria-label="Navigasi CPNS">
                        <a href="#cara-belajar" className="hover:text-blue-700">Cara belajar</a>
                        <a href="#pilihan-latihan" className="hover:text-blue-700">Latihan</a>
                        <a href="#active-event" className="hover:text-blue-700">Event</a>
                        {latestArticles.length > 0 && <a href="#artikel" className="hover:text-blue-700">Artikel</a>}
                        <a href="#faq" className="hover:text-blue-700">FAQ</a>
                        <Link href="/tka" className="hover:text-blue-700">TKA</Link>
                    </nav>
                    <div className="flex items-center gap-2">
                        {!user && (
                            <Link href="/login?returnTo=/cpns" className="st-focus hidden min-h-11 items-center px-3 text-sm font-black sm:inline-flex">
                                Masuk
                            </Link>
                        )}
                        <Button size="sm" asChild>
                            <TrackedLink
                                href={primaryAccountHref}
                                eventName="px_landing_cta"
                                eventProperties={{ program: 'cpns', surface: 'landing', cta: user ? 'header_dashboard' : 'header_start' }}
                            >
                                {user ? 'Dashboard CPNS' : 'Mulai belajar'}
                            </TrackedLink>
                        </Button>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden border-b-2 border-slate-900 px-4 py-16 md:px-8 md:py-24 lg:py-28">
                <div className="pointer-events-none absolute -left-32 bottom-[-5rem] h-56 w-56 rounded-full border-2 border-dashed border-yellow-500 bg-yellow-50" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-16 top-6 h-64 w-64 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                <div className="px-container-marketing relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
                    <div>
                        <span className="st-kicker">Persiapan SKD CPNS</span>
                        <h1 className="st-heading-display mt-7 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Belajar lebih terarah. Hadapi SKD lebih siap.
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            Latihan TWK, TIU, dan TKP, ukur kemampuanmu, pelajari pembahasan, lalu fokus memperbaiki bagian yang masih lemah.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button size="lg" asChild>
                                <TrackedLink
                                    href={primaryAccountHref}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: 'primary_start' }}
                                >
                                    Mulai persiapan CPNS <ArrowRight size={18} />
                                </TrackedLink>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <a href="#cara-belajar">Lihat cara kerjanya</a>
                            </Button>
                        </div>
                        <p className="st-muted mt-4 text-sm font-bold">Satu akun untuk menyimpan sesi, hasil, dan perkembangan belajarmu.</p>
                    </div>

                    <div className="st-card-lg relative rotate-[0.6deg] p-6 md:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Cara SiapTempur membantu</p>
                        <h2 className="st-heading-display mt-3 text-3xl md:text-4xl">Belajar dari setiap hasil.</h2>
                        <div className="mt-6 divide-y-2 divide-dashed divide-slate-200">
                            {[
                                { icon: Target, title: 'Latihan sesuai kebutuhanmu', text: 'Pilih latihan berdasarkan tujuan belajarmu hari ini.' },
                                { icon: BarChart3, title: 'Lihat hasil setiap sesi', text: 'Kenali bagian yang sudah kuat dan yang masih perlu perhatian.' },
                                { icon: BookOpenCheck, title: 'Pelajari pembahasan', text: 'Pahami alasan di balik jawaban, bukan hanya benar atau salah.' },
                                { icon: History, title: 'Tentukan langkah berikutnya', text: 'Gunakan hasil untuk memilih latihan yang paling relevan.' },
                            ].map(({ icon: Icon, title, text }) => (
                                <div key={title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-emerald-600">
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900">{title}</p>
                                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{text}</p>
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
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Cara belajar</p>
                        <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Jangan belajar tanpa arah.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Setiap sesi seharusnya membantu kamu memahami kemampuan dan memilih langkah berikutnya.</p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {learningSteps.map((step) => (
                            <article key={step.number} className="st-card p-5">
                                <span className="st-pill bg-blue-50 text-blue-700">{step.number}</span>
                                <h3 className="st-heading mt-4 text-xl">{step.title}</h3>
                                <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">{step.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="pilihan-latihan" className="st-section-soft scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="px-container-marketing">
                    <div className="max-w-3xl">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Pilih sesuai kebutuhan</p>
                        <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Tidak semua sesi harus Full Tryout.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold">Pilih jenis latihan berdasarkan tujuanmu hari ini.</p>
                    </div>
                    <div className="mt-10 grid gap-6 lg:grid-cols-3">
                        {learningModes.map(({ icon: Icon, label, title, text, href, cta, mode, tone }) => (
                            <article key={title} className="st-card-md flex flex-col p-6 md:p-7">
                                <div className={`flex h-11 w-11 items-center justify-center border-2 border-slate-900 ${tone}`}><Icon size={21} /></div>
                                <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{label}</p>
                                <h3 className="st-heading mt-2 text-2xl">{title}</h3>
                                <p className="st-muted mt-3 flex-1 font-semibold leading-relaxed">{text}</p>
                                <TrackedLink
                                    href={href}
                                    eventName="px_landing_cta"
                                    eventProperties={{ program: 'cpns', surface: 'landing', cta: `mode_${mode}`, mode }}
                                    className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline"
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
                        <span className="st-kicker"><Trophy size={15} /> Event tryout</span>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Ukur kemampuan bersama peserta lain.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Event memberi kamu kesempatan mengikuti sesi terjadwal dan melihat hasil dalam konteks peserta event yang sama.</p>
                        <Button className="mt-6" asChild>
                            <TrackedLink href={eventHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'event' }}>
                                Lihat event di akun
                            </TrackedLink>
                        </Button>
                    </div>

                    {activeEvent ? (
                        <article className="st-card-md p-6 md:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="st-pill bg-emerald-100 text-emerald-800">{activeEvent.status === 'live' ? 'Sedang berlangsung' : 'Terjadwal'}</span>
                                <span className="text-sm font-black text-blue-700">{formatPrice(activeEvent)}</span>
                            </div>
                            <h3 className="st-heading mt-5 text-2xl md:text-3xl">{activeEvent.title}</h3>
                            {activeEvent.description && <p className="st-muted mt-3 font-semibold leading-relaxed">{activeEvent.description}</p>}
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <InfoTile icon={<CalendarDays size={19} />} label="Mulai" value={formatEventDate(activeEvent.starts_at)} />
                                <InfoTile icon={<Clock3 size={19} />} label="Durasi" value={`${activeEvent.duration_minutes} menit`} />
                            </div>
                            <Link href={eventHref} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline">
                                Lihat detail dan akses event <ArrowRight size={16} />
                            </Link>
                        </article>
                    ) : (
                        <div className="st-card-md p-8 text-center md:p-10">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-yellow-100"><CalendarDays size={23} /></div>
                            <h3 className="st-heading mt-4 text-xl">Belum ada event aktif.</h3>
                            <p className="st-muted mx-auto mt-2 max-w-lg font-semibold leading-relaxed">Kamu tetap bisa berlatih mandiri sambil menunggu jadwal event berikutnya.</p>
                            <Link href="/cpns/full-tryout" className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline">
                                Lihat Full Tryout <ArrowRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section className="st-section-soft px-4 py-16 md:px-8 md:py-20">
                <div className="px-container-marketing grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
                    <div>
                        <span className="st-kicker"><Ticket size={15} /> Akses Full Tryout</span>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Gunakan token saat kamu siap Full Tryout.</h2>
                        <p className="st-muted mt-4 max-w-2xl text-lg font-semibold leading-relaxed">Jumlah token, harga, biaya pembayaran, dan manfaat paket ditampilkan sebelum kamu membeli.</p>
                        <Button className="mt-6" asChild>
                            <TrackedLink href={packageHref} eventName="px_landing_cta" eventProperties={{ program: 'cpns', surface: 'landing', cta: 'token_packages' }}>
                                Lihat paket token
                            </TrackedLink>
                        </Button>
                    </div>
                    <div className="st-card p-6">
                        <div className="space-y-4">
                            {[
                                'Harga dan isi paket terlihat sebelum pembayaran',
                                'Token digunakan sesuai aturan akses tryout yang ditampilkan',
                                'Status pembayaran diperbarui setelah pembayaran diverifikasi',
                            ].map((text) => (
                                <div key={text} className="flex items-start gap-3">
                                    <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
                                    <span className="text-sm font-bold leading-relaxed text-slate-700">{text}</span>
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
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Artikel terbaru</p>
                                <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Belajar juga dari penjelasan.</h2>
                            </div>
                            <Link href="/blog" className="st-focus inline-flex min-h-11 items-center text-sm font-black text-blue-700 hover:underline">Lihat semua artikel</Link>
                        </div>
                        <div className="mt-9 grid gap-5 lg:grid-cols-3">
                            {latestArticles.map((article) => {
                                const published = formatArticleDate(article.published_at)
                                return (
                                    <article key={article.id} className="st-card flex flex-col p-6">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><FileText size={15} /> {published ?? 'Artikel SiapTempur'}</div>
                                        <h3 className="st-heading mt-4 text-xl leading-snug">{article.title}</h3>
                                        {article.excerpt && <p className="st-muted mt-3 line-clamp-3 flex-1 text-sm font-semibold leading-relaxed">{article.excerpt}</p>}
                                        <Link href={`/blog/${article.slug}`} className="st-focus mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 hover:underline">
                                            Baca artikel <ArrowRight size={16} />
                                        </Link>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            <section id="faq" className="st-section-soft scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">FAQ</p>
                        <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Sebelum kamu mulai.</h2>
                    </div>
                    <div className="mt-9 space-y-4">
                        {faq.map((item) => (
                            <details key={item.question} className="st-card group px-5 py-4">
                                <summary className="st-focus cursor-pointer list-none font-black text-slate-950 marker:hidden">
                                    <span className="flex min-h-8 items-center justify-between gap-4">
                                        {item.question}
                                        <span aria-hidden="true" className="text-xl text-blue-700 transition-transform group-open:rotate-45">+</span>
                                    </span>
                                </summary>
                                <p className="st-muted mt-4 border-t-2 border-dashed border-slate-200 pt-4 font-semibold leading-relaxed">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-5xl border-2 border-slate-900 bg-slate-950 p-8 text-center text-white shadow-[8px_8px_0_#2463eb] md:p-12">
                    <ShieldCheck className="mx-auto h-10 w-10 text-yellow-300" />
                    <h2 className="mt-5 font-handwriting text-4xl font-black md:text-5xl">Mulai dari langkah yang paling kamu butuhkan.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-slate-300">Masuk, pilih latihan, lihat hasil, lalu perbaiki satu bagian demi satu bagian.</p>
                    <Button variant="white" size="lg" className="mt-7" asChild>
                        <Link href={primaryAccountHref}>{user ? 'Lanjutkan belajar' : 'Mulai belajar'}</Link>
                    </Button>
                </div>
            </section>

            <footer className="border-t-2 border-slate-900 px-4 py-8 md:px-8">
                <div className="px-container-marketing flex flex-wrap items-center justify-between gap-4 text-sm font-bold text-slate-600">
                    <span>© SiapTempur Indonesia</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/" className="hover:text-blue-700">Beranda</Link>
                        <Link href="/tka" className="hover:text-blue-700">TKA</Link>
                        <Link href="/blog" className="hover:text-blue-700">Artikel</Link>
                        <Link href="/syarat-ketentuan" className="hover:text-blue-700">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-blue-700">Kebijakan Privasi</Link>
                    </div>
                </div>
            </footer>
        </main>
    )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 border-2 border-slate-900 bg-slate-50 p-4">
            <div className="mt-0.5 text-blue-700">{icon}</div>
            <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-bold leading-relaxed text-slate-800">{value}</div>
            </div>
        </div>
    )
}
