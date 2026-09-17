import Link from 'next/link'
import { ArrowRight, CheckCircle2, ChevronDown, Menu, Sparkles } from 'lucide-react'
import { Mascot, MascotPair } from '@/components/brand/Mascot'
import { Doodle, MascotBubble, Sticker, WashiTape } from '@/components/brand/playful'
import {
    accountPoints,
    audienceCards,
    benefitCards,
    cycleItems,
    faqs,
    featureCards,
    learningSteps,
    navItems,
    productCards,
    quickStartSteps,
} from './content'

/**
 * Seksi landing page utama (`/`).
 *
 * Semuanya server component (tanpa state) supaya halaman tetap ringan; menu mobile memakai
 * `<details>` sehingga tidak perlu JavaScript tambahan. Ornamen playful hanya dipakai di mode
 * marketing dan tidak pernah menutupi CTA.
 */

type CtaProps = { primaryHref: string; primaryLabel: string }

export function LandingHeader({ user, primaryHref, primaryLabel }: CtaProps & { user: boolean }) {
    return (
        <header className="sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4">
            <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/90 px-4 st-shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-5">
                <Link href="/" className="st-focus shrink-0 font-script text-2xl font-black tracking-tight md:text-3xl">
                    Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                </Link>

                <nav className="hidden items-center gap-1 text-sm font-black lg:flex" aria-label="Navigasi utama">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                            {item.label}
                        </Link>
                    ))}
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
                        <div className="absolute right-0 top-full mt-3 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border-2 border-[var(--st-ink)] bg-white p-3 st-shadow-md">
                            <nav className="grid gap-1 text-sm font-black" aria-label="Navigasi mobile">
                                {navItems.map((item) => (
                                    <Link key={item.href} href={item.href} className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">
                                        {item.label}
                                    </Link>
                                ))}
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
    )
}

export function LandingHero({ primaryHref, primaryLabel }: CtaProps) {
    return (
        <section className="relative px-4 pb-14 pt-12 md:px-8 md:pb-20 md:pt-16">
            <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 top-6 h-52 w-44 rotate-12 rounded-st-2xl border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]" aria-hidden="true" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="st-kicker"><Sparkles size={15} /> Satu akun · CPNS & TKA</div>
                        <Sticker tone="amber" rotate="right" className="hover-wiggle">Gratis buat mulai</Sticker>
                    </div>
                    <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                        Jangan cuma tahu skormu. <span className="text-blue-600">Tahu apa yang harus diperbaiki.</span>
                    </h1>
                    <Doodle variant="squiggle" className="mt-4 hidden md:block" />
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
                        <Doodle variant="star" className="hidden -rotate-12 md:block" />
                    </div>

                    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-gray-600">
                        {['Satu akun untuk semua jalur', 'Progres belajar tersimpan', 'Belajar dari hasil'].map((item) => (
                            <span key={item} className="inline-flex items-center gap-2">
                                <CheckCircle2 size={17} className="text-green-600" /> {item}
                            </span>
                        ))}
                    </div>

                    {/* Maskot brand menyapa langsung — hanya di layar ≥ tablet agar hero mobile fokus ke CTA. */}
                    <div className="mt-9 hidden items-end gap-4 sm:flex">
                        <MascotBubble name="tama" size="sm" bubbleTone="blue" priority className="flex-1">
                            Hai, aku <b>Tama</b> — ini <b>Tara</b>. Mulai dari latihan singkat dulu, ya. Nanti kita lihat bareng bagian mana yang paling perlu diperkuat.
                        </MascotBubble>
                        <Mascot name="tara" size="sm" tone="plain" priority className="hidden shrink-0 md:inline-flex animate-bob" />
                    </div>
                </div>

                <div className="st-card-lg relative bg-white p-5 md:p-7">
                    <WashiTape className="-top-3 left-1/2 -translate-x-1/2" />
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
                            <CheckCircle2 size={21} className="text-blue-600" />
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
                                <Sparkles size={19} />
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
    )
}

/** Siklus belajar + empat manfaat yang langsung terasa. */
export function LandingBenefits() {
    return (
        <section className="px-4 pb-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-4 md:px-6">
                    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-between">
                        <span className="mr-2 text-xs font-black uppercase tracking-[0.12em] text-gray-500">Satu siklus belajar</span>
                        {cycleItems.map((item, index) => (
                            <div key={item} className="flex items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700">{item}</span>
                                {index < cycleItems.length - 1 && <ArrowRight size={14} className="hidden text-gray-300 md:block" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-st-2xl border-2 border-[var(--st-ink)] bg-white p-6 st-shadow-md md:p-8">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-2 border-dashed border-blue-200 bg-[var(--st-blue-soft)]" aria-hidden="true" />
                    <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {benefitCards.map(({ icon: Icon, title, text, surface }) => (
                                <article key={title} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] ${surface}`}>
                                        <Icon size={19} />
                                    </div>
                                    <h3 className="mt-3 font-black">{title}</h3>
                                    <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{text}</p>
                                </article>
                            ))}
                        </div>
                        <MascotBubble name="tara" size="sm" side="right" bubbleTone="peach" className="hidden lg:flex" bubbleClassName="max-w-[13rem]">
                            Nggak harus langsung panjang, kok. Cukup mulai.
                        </MascotBubble>
                    </div>
                </div>
            </div>
        </section>
    )
}

/** Jalur cepat "mulai dalam 1 menit" — menurunkan keraguan sebelum mendaftar. */
export function LandingQuickStart({ primaryHref, primaryLabel }: CtaProps) {
    return (
        <section className="px-4 py-14 md:px-8 md:py-20">
            <div className="mx-auto max-w-7xl">
                <div className="relative overflow-hidden rounded-st-2xl border-2 border-[var(--st-ink)] bg-[var(--brand-amber-soft)] p-6 st-shadow-md md:p-10">
                    <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="st-kicker bg-white">Mulai tanpa ribet</div>
                                <Sticker tone="blue" rotate="left" className="hover-wiggle">± 1 menit</Sticker>
                            </div>
                            <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Tiga langkah kecil, lalu kamu sudah latihan.</h2>
                            <p className="st-muted mt-4 max-w-xl font-semibold leading-relaxed">
                                Tidak perlu menyiapkan apa pun dulu. Bikin akun, pilih jalur, dan kerjakan satu sesi pendek untuk melihat titik mulai.
                            </p>
                            <Link href={primaryHref} className="st-button mt-6 inline-flex min-h-12 items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
                                {primaryLabel} <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {quickStartSteps.map(({ number, title, text }) => (
                                <div key={number} className="flex items-start gap-4 rounded-2xl border-2 border-[var(--st-ink)] bg-white p-4">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] font-display text-lg font-black">{number}</span>
                                    <div>
                                        <p className="font-black">{title}</p>
                                        <p className="st-muted text-sm font-semibold">{text}</p>
                                    </div>
                                </div>
                            ))}
                            <MascotBubble name="tama" size="xs" bubbleTone="paper" className="pt-1" bubbleClassName="max-w-none">
                                Kalau bingung mau mulai dari mana, pilih tes diagnostik dulu — itu paling aman.
                            </MascotBubble>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function LandingPrograms() {
    return (
        <section id="produk" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="st-kicker">Pilih program</div>
                    <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Satu tempat belajar, dua tujuan berbeda.</h2>
                    <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Pilih jalur yang sedang kamu persiapkan. Akunnya tetap satu, pengalaman belajarnya menyesuaikan targetmu.</p>
                </div>

                <div className="mt-12 grid gap-8 lg:grid-cols-2">
                    {productCards.map((product, index) => {
                        const Icon = product.icon
                        return (
                            <Link
                                key={product.code}
                                href={product.href}
                                data-testid={`program-card-${product.href.replace('/', '')}`}
                                className={`st-card-lg st-focus group relative bg-white p-6 transition-transform hover:-translate-y-1 md:p-8 ${index === 0 ? 'lg:-rotate-1' : 'lg:rotate-1'}`}
                            >
                                <WashiTape tone={index === 0 ? 'blue' : 'peach'} className="-top-3 left-8" />
                                <div className={`absolute right-6 top-6 h-32 w-32 rounded-full border-2 border-dashed border-[var(--st-ink)]/15 ${product.surface}`} aria-hidden="true" />

                                <div className="relative">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${product.surface}`}><Icon size={27} /></div>
                                        <span className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{product.code}</span>
                                    </div>

                                    <Sticker tone={product.stickerTone} rotate={index === 0 ? 'left' : 'right'} className="mt-5">{product.badge}</Sticker>

                                    <h3 className="st-heading-display mt-4 text-4xl md:text-5xl">{product.title}</h3>
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
    )
}

export function LandingCompare() {
    return (
        <section id="beda" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-st-2xl border-2 border-[var(--st-ink)] bg-white st-shadow-md">
                <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                    <div className="relative bg-[var(--st-blue-soft)] p-6 md:p-10 lg:p-12">
                        <div className="st-kicker bg-white">Bukan cuma tryout</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Tryout bukan akhir sesi belajar.</h2>
                        <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">Nilai baru berguna ketika kamu tahu harus melakukan apa setelah melihatnya. Itu yang ingin dihubungkan SiapTempur.</p>
                        <Doodle variant="dots" className="mt-6 hidden lg:block" />
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2 md:p-10 lg:p-12">
                        <div className="relative rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
                            <Sticker tone="paper" rotate="left">Kalau berhenti di skor</Sticker>
                            <div className="mt-5 space-y-3 text-sm font-bold text-gray-600">
                                {['Kerjakan soal', 'Lihat nilai', 'Selesai dan mulai lagi tanpa arah yang jelas'].map((item, index) => (
                                    <div key={item} className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs">{index + 1}</span><span>{item}</span></div>
                                ))}
                            </div>
                        </div>

                        <div className="relative rounded-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-5 st-shadow-sm">
                            <Sticker tone="amber" rotate="right">Alur SiapTempur</Sticker>
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
    )
}

export function LandingAudience() {
    return (
        <section className="px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="max-w-3xl">
                    <div className="st-kicker">Untuk siapa?</div>
                    <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Kalau salah satunya terasa familiar, SiapTempur dibuat untuk masalah itu.</h2>
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    {audienceCards.map(({ title, text, icon: Icon, sticker, tone }) => (
                        <article key={title} className="group relative rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[var(--st-ink)] hover:st-shadow-sm">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] text-blue-700"><Icon size={22} /></div>
                            <Sticker tone={tone} rotate="left" className="mt-5">{sticker}</Sticker>
                            <h3 className="mt-4 text-xl font-black">{title}</h3>
                            <p className="st-muted mt-2 font-semibold leading-relaxed">{text}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

export function LandingSteps({ primaryHref, primaryLabel }: CtaProps) {
    return (
        <section id="cara-belajar" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
                    <div className="lg:sticky lg:top-28 lg:self-start">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="st-kicker">Lihat cara kerjanya</div>
                            <Sticker tone="blue" rotate="left" className="hover-wiggle">4 langkah</Sticker>
                        </div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Belajar → ukur → perbaiki → ukur lagi.</h2>
                        <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">Empat langkah ini menjadi cerita utama produk. Kamu tidak harus menebak apa yang harus dilakukan setelah selesai mengerjakan soal.</p>
                        <Link href={primaryHref} className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">{primaryLabel} <ArrowRight size={17} /></Link>
                    </div>

                    <div className="relative space-y-4">
                        <div className="pointer-events-none absolute left-[3.25rem] top-6 hidden h-[calc(100%-3rem)] border-l-2 border-dashed border-[var(--st-ink)]/20 md:block" aria-hidden="true" />
                        {learningSteps.map(({ number, title, text, icon: Icon, surface }, index) => (
                            <article key={number} className={`relative rounded-2xl border-2 border-[var(--st-ink)] p-5 md:p-6 ${surface} ${index === 0 || index === learningSteps.length - 1 ? 'st-shadow-sm' : ''}`}>
                                <div className="flex gap-4 md:gap-6">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] bg-white font-display text-2xl font-black">{number}</div>
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
    )
}

export function LandingFeatures() {
    return (
        <section id="fitur" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="max-w-3xl">
                    <div className="st-kicker">Yang kamu dapat</div>
                    <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Fitur yang menyambung satu sama lain, bukan kumpulan menu.</h2>
                    <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Ketersediaan fitur menyesuaikan jalur dan program, tetapi semuanya diarahkan untuk membuat sesi belajar berikutnya lebih jelas.</p>
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {featureCards.map(({ icon: Icon, title, description, surface }) => (
                        <article key={title} className="group rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-[var(--st-ink)] hover:st-shadow-sm md:p-6">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${surface}`}><Icon size={23} /></div>
                            <h3 className="mt-5 text-xl font-black">{title}</h3>
                            <p className="st-muted mt-2 font-semibold leading-relaxed">{description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

export function LandingAccount() {
    return (
        <section className="px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl rounded-st-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-6 md:p-10 lg:p-12">
                <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <div className="st-kicker bg-white">Satu akun</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Pindah target tanpa bikin akun baru.</h2>
                        <p className="st-muted mt-4 font-semibold leading-relaxed">Akun yang sama bisa digunakan untuk persiapan CPNS serta TKA SD, SMP, dan SMA. Jalur belajarnya tetap terpisah supaya setiap progres tidak bercampur.</p>
                        <MascotPair size="xs" tone="plain" className="mt-6 hidden sm:inline-flex" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {accountPoints.map(({ icon: Icon, title, text }) => (
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
    )
}

export function LandingFaq({ primaryHref, primaryLabel }: CtaProps) {
    return (
        <section id="tanya" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
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

                <div className="mt-8 flex flex-col items-center gap-4">
                    <MascotBubble name="tara" size="sm" side="right" bubbleTone="peach" className="mx-auto w-fit" bubbleClassName="max-w-md">
                        Masih ada yang mau ditanyakan? Mulai dari akun dulu — nanti kamu bisa pilih jalurnya sambil jalan.
                    </MascotBubble>
                    <Link href={primaryHref} className="st-focus inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                        {primaryLabel} <ArrowRight size={17} />
                    </Link>
                </div>
            </div>
        </section>
    )
}

export function LandingCta({ primaryHref, primaryLabel }: CtaProps) {
    return (
        <section className="px-4 pb-20 pt-10 md:px-8 md:pb-28">
            <div className="relative mx-auto max-w-7xl rounded-st-2xl border-2 border-[var(--st-ink)] bg-blue-600 px-6 py-10 text-white st-shadow-md md:px-10 md:py-14">
                <Doodle variant="dots" className="absolute right-8 top-6 hidden opacity-40 md:block" />
                <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.1em]"><Sparkles size={14} /> Mulai dari targetmu</div>
                        <h2 className="mt-5 max-w-3xl font-display text-4xl font-black leading-tight md:text-6xl">Ujianmu boleh berat. Cara belajarnya jangan dibuat lebih rumit.</h2>
                        <p className="mt-4 max-w-2xl font-semibold leading-relaxed text-blue-100">Buat akun, pilih CPNS atau TKA, lalu gunakan setiap hasil untuk menentukan apa yang harus dipelajari berikutnya.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-stretch">
                        <MascotPair size="xs" tone="plain" className="mb-1 hidden justify-center lg:flex" />
                        <Link href={primaryHref} className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black text-gray-900">{primaryLabel} <ArrowRight size={18} /></Link>
                        <Link href="#produk" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-white bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800">Lihat program</Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function LandingFooter() {
    return (
        <footer className="border-t border-gray-200 bg-white px-4 py-8 md:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <MascotPair size="xs" tone="plain" className="hidden shrink-0 sm:inline-flex" />
                    <div>
                        <Link href="/" className="font-script text-2xl font-black">Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.</Link>
                        <p className="st-muted mt-1 text-sm font-semibold">Belajar lebih terarah untuk menghadapi ujian dengan lebih siap.</p>
                    </div>
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
    )
}
