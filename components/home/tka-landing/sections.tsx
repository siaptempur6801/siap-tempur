import Link from 'next/link'
import { ArrowRight, BookOpenCheck, CheckCircle2, GraduationCap, School, Sparkles } from 'lucide-react'
import { Mascot, MascotPair } from '@/components/brand/Mascot'
import { Doodle, MascotBubble, Sticker, WashiTape } from '@/components/brand/playful'
import { LandingFooter } from '@/components/home/landing/sections'
import TkaSurfaceLink from '@/components/tka/TkaSurfaceLink'
import { tkaBenefitCards, tkaChecks, tkaCycleSteps, tkaFaqs, tkaSubjectCards } from './content'

/**
 * Seksi landing publik `/tka`.
 *
 * Mengikuti bahasa visual landing utama (`/`): brand navy/blue/amber/peach, Poppins, maskot
 * Tama & Tara, dan primitif playful — dengan isi yang khusus TKA.
 */

/**
 * CTA landing TKA. Label tiap seksi sengaja BERBEDA supaya locator spec
 * (`getByRole('link', { name: /Mulai persiapan TKA/i })`) tetap tunggal.
 */
/**
 * Tautan CTA landing TKA. Tujuan di dalam `/tka` (mis. dashboard TKA) harus berupa navigasi
 * dokumen penuh karena permukaan marketing dan aplikasi memakai layout yang sama — lihat
 * `components/tka/TkaSurfaceLink.tsx`.
 */
function CtaLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
    if (href.startsWith('/tka')) {
        return <TkaSurfaceLink href={href} className={className}>{children}</TkaSurfaceLink>
    }
    return <Link href={href} className={className}>{children}</Link>
}

type TkaCtaProps = {
    primaryHref: string
    /** Label utama — hanya dipakai hero. */
    primaryLabel: string
    /** Label untuk seksi tanya jawab. */
    altLabel: string
    /** Label untuk kartu CTA penutup. */
    finalLabel: string
}

export function TkaHero({ primaryHref, primaryLabel }: TkaCtaProps) {
    return (
        <section className="relative px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-36">
            <div className="pointer-events-none absolute -left-24 top-40 h-52 w-52 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 top-24 h-56 w-48 rotate-12 rounded-st-2xl border-2 border-dashed border-emerald-300 bg-[var(--st-green-soft)]" aria-hidden="true" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="st-kicker"><GraduationCap size={15} /> TKA SD · SMP · SMA</div>
                        <Sticker tone="amber" rotate="right" className="hover-wiggle">Gratis buat mulai</Sticker>
                    </div>
                    <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                        Persiapan TKA untuk <span className="text-blue-600">setiap jenjang belajar.</span>
                    </h1>
                    <Doodle variant="squiggle" className="mt-4 hidden md:block" />
                    <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                        Mulai dari SD, lanjut ke SMP, hingga SMA dalam satu lingkungan belajar. Kerjakan latihan dan tryout, pahami hasilnya, lalu perbaiki bagian yang masih lemah.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <CtaLink href={primaryHref} className="st-button inline-flex min-h-12 items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
                            {primaryLabel} <ArrowRight size={18} />
                        </CtaLink>
                        <Link href="#jenjang-tka" className="st-focus inline-flex min-h-12 items-center rounded-xl px-4 py-3 font-black text-gray-700 hover:bg-white">
                            Pilih jenjang
                        </Link>
                        <Doodle variant="star" className="hidden -rotate-12 md:block" />
                    </div>
                    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-gray-600">
                        {tkaChecks.map((item) => (
                            <span key={item} className="inline-flex items-center gap-2">
                                <CheckCircle2 size={17} className="text-green-600" /> {item}
                            </span>
                        ))}
                    </div>

                    <div className="mt-9 hidden items-end gap-4 sm:flex">
                        <MascotBubble name="tama" size="sm" bubbleTone="blue" priority className="flex-1">
                            Hai! Aku <b>Tama</b>. Kita latih bagian yang paling perlu dulu, ya — pelan-pelan tapi konsisten.
                        </MascotBubble>
                        <Mascot name="tara" size="sm" tone="plain" priority className="hidden shrink-0 md:inline-flex animate-bob" />
                    </div>
                </div>

                <div className="st-card-lg relative bg-white p-6 md:p-8">
                    <WashiTape className="-top-3 left-1/2 -translate-x-1/2" />
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Siklus belajar SiapTempur</p>
                    <h2 className="st-heading-display mt-3 text-4xl md:text-5xl">Ukur, pahami, lalu perbaiki.</h2>
                    <div className="mt-7 divide-y-2 divide-dashed divide-gray-200">
                        {tkaCycleSteps.slice(0, 3).map((step) => (
                            <div key={step.number} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                <span className="font-display text-3xl font-black text-blue-600">{step.number}</span>
                                <div>
                                    <p className="font-black">{step.title}</p>
                                    <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{step.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Sticker tone="blue" rotate="left" className="mt-6">Semua jenjang</Sticker>
                </div>
            </div>
        </section>
    )
}

export function TkaBenefits() {
    return (
        <section className="px-4 pb-8 md:px-8">
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-st-2xl border-2 border-[var(--st-ink)] bg-white p-6 st-shadow-md md:p-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-2 border-dashed border-blue-200 bg-[var(--st-blue-soft)]" aria-hidden="true" />
                <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <div className="st-kicker">Kenapa di SiapTempur</div>
                        <h2 className="st-heading-display mt-4 text-3xl md:text-4xl">Belajar yang menyesuaikan tingkatmu, bukan sebaliknya.</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {tkaBenefitCards.map(({ icon: Icon, title, text, surface }) => (
                                <article key={title} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] ${surface}`}>
                                        <Icon size={19} />
                                    </div>
                                    <h3 className="mt-3 font-black">{title}</h3>
                                    <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                    <MascotBubble name="tara" size="sm" side="right" bubbleTone="peach" className="hidden lg:flex" bubbleClassName="max-w-[13rem]">
                        Nggak perlu nunggu siap. Mulai dari satu sesi pendek dulu.
                    </MascotBubble>
                </div>
            </div>
        </section>
    )
}

/**
 * Kartu jenjang — mempertahankan kontrak spec: teks `TKA SD`/`TKA SMP`/`TKA SMA` persis satu kali,
 * `Segera hadir` 2×, `Belum tersedia` 2×, dan tautan SMP `TKA SMP … Buka jenjang` → `/tka/smp`.
 */
export function TkaLevels() {
    return (
        <section id="jenjang-tka" className="scroll-mt-28 border-y-2 border-[var(--st-ink)] bg-white px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="st-kicker">Pilih jenjang</div>
                        <Sticker tone="green" rotate="left" className="hover-wiggle">1 jenjang sudah aktif</Sticker>
                    </div>
                    <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Satu fondasi belajar, tiga tahap perjalanan.</h2>
                    <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Setiap jenjang memiliki jalur belajar tersendiri agar materi, hasil, dan progres tetap sesuai kebutuhanmu.</p>
                </div>
                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    <PublicLevelCard href="/tka/sd" level="SD" title="TKA SD" description="Bangun fondasi literasi dan numerasi melalui latihan yang terarah sejak jenjang dasar." icon={<School size={24} />} tone="amber" rotate="lg:-rotate-1" />
                    <PublicLevelCard href="/tka/smp" level="SMP" title="TKA SMP" description="Perkuat Bahasa Indonesia dan Matematika lewat latihan, tryout, serta pembahasan." icon={<BookOpenCheck size={24} />} tone="blue" available rotate="lg:rotate-1" />
                    <PublicLevelCard href="/tka/sma" level="SMA" title="TKA SMA" description="Siapkan kemampuan akademik sesuai jenjang dan pilihan mata pelajaran yang tersedia." icon={<GraduationCap size={24} />} tone="green" rotate="lg:-rotate-1" />
                </div>
            </div>
        </section>
    )
}

export function TkaFlow({ primaryHref }: TkaCtaProps) {
    return (
        <section className="px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                    <div className="lg:sticky lg:top-28 lg:self-start">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="st-kicker">Cara kerjanya</div>
                            <Sticker tone="blue" rotate="left" className="hover-wiggle">4 langkah</Sticker>
                        </div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Dari latihan pertama sampai perbaikan.</h2>
                        <p className="st-muted mt-4 max-w-xl text-lg font-semibold leading-relaxed">Kamu tidak perlu menebak harus mulai dari mana, dan tidak berhenti bingung setelah melihat hasil.</p>
                        <CtaLink href={primaryHref} className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                            Mulai dari langkah pertama <ArrowRight size={17} />
                        </CtaLink>
                    </div>

                    <div className="relative space-y-4">
                        <div className="pointer-events-none absolute left-[3.25rem] top-6 hidden h-[calc(100%-3rem)] border-l-2 border-dashed border-[var(--st-ink)]/20 md:block" aria-hidden="true" />
                        {tkaCycleSteps.map(({ number, title, text, icon: Icon, surface }, index) => (
                            <article key={number} className={`relative rounded-2xl border-2 border-[var(--st-ink)] p-5 md:p-6 ${surface} ${index === 0 || index === tkaCycleSteps.length - 1 ? 'st-shadow-sm' : ''}`}>
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

export function TkaSubjects() {
    return (
        <section className="px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl rounded-st-2xl border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-6 md:p-10 lg:p-12">
                <div className="max-w-3xl">
                    <div className="st-kicker bg-white">Yang dilatih</div>
                    <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Kompetensi yang tumbuh seiring jenjang.</h2>
                    <p className="st-muted mt-4 font-semibold leading-relaxed">Setiap jenjang punya fokus berbeda. Materi disusun mengikuti kemampuan yang memang diuji pada tingkat itu.</p>
                </div>

                <div className="mt-9 grid gap-5 md:grid-cols-3">
                    {tkaSubjectCards.map(({ level, title, text, icon: Icon, surface, sticker, tone }) => (
                        <article key={title} className="relative rounded-2xl border-2 border-[var(--st-ink)] bg-white p-6 transition-transform hover:-translate-y-1">
                            <div className="flex items-center justify-between gap-3">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] ${surface}`}><Icon size={22} /></div>
                                <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">{level}</span>
                            </div>
                            <Sticker tone={tone} rotate="left" className="mt-5">{sticker}</Sticker>
                            <h3 className="mt-4 text-xl font-black">{title}</h3>
                            <p className="st-muted mt-2 font-semibold leading-relaxed">{text}</p>
                        </article>
                    ))}
                </div>

                <p className="st-muted mt-6 text-sm font-semibold">Ketersediaan kompetensi dan mata pelajaran mengikuti jenjang serta program yang sedang aktif.</p>
            </div>
        </section>
    )
}

export function TkaFaq({ primaryHref, altLabel }: TkaCtaProps) {
    return (
        <section id="tanya-tka" className="scroll-mt-28 px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-4xl">
                <div className="text-center">
                    <div className="st-kicker">Pertanyaan orang tua & siswa</div>
                    <h2 className="st-heading-display mt-5 text-4xl md:text-5xl">Hal yang biasanya ditanyakan sebelum mulai.</h2>
                </div>

                <div className="mt-10 space-y-3">
                    {tkaFaqs.map(({ question, answer }) => (
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
                        Masih ragu pilih jenjang? Mulai dari akun dulu — jenjangnya bisa dipilih sambil jalan.
                    </MascotBubble>
                    <CtaLink href={primaryHref} className="st-focus inline-flex min-h-11 items-center gap-2 font-black text-blue-700 hover:underline">
                        {altLabel} <ArrowRight size={17} />
                    </CtaLink>
                </div>
            </div>
        </section>
    )
}

export function TkaCta({ primaryHref, finalLabel }: TkaCtaProps) {
    return (
        <section className="px-4 pb-20 pt-6 md:px-8 md:pb-28">
            <div className="relative mx-auto grid max-w-7xl items-center gap-8 rounded-st-2xl border-2 border-[var(--st-ink)] bg-blue-600 px-6 py-10 text-white st-shadow-md md:grid-cols-[1fr_auto] md:px-10 md:py-12">
                <Doodle variant="dots" className="absolute right-8 top-6 hidden opacity-40 md:block" />
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.1em]"><Sparkles size={14} /> Mulai dari jenjangmu</div>
                    <h2 className="mt-5 font-display text-4xl font-black leading-tight md:text-5xl">Mulai dari jenjangmu hari ini.</h2>
                    <p className="mt-3 max-w-2xl font-semibold leading-relaxed text-blue-100">Satu akun menyimpan perjalanan belajar TKA dari SD, SMP, hingga SMA.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch">
                    <MascotPair size="xs" tone="plain" className="mb-1 hidden justify-center md:flex" />
                    <CtaLink href={primaryHref} className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black text-gray-900">
                        {finalLabel} <ArrowRight size={18} />
                    </CtaLink>
                    <Link href="#jenjang-tka" className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-white bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800">
                        Lihat jenjang
                    </Link>
                </div>
            </div>
        </section>
    )
}

export function TkaFooter() {
    return <LandingFooter />
}

function PublicLevelCard({
    href,
    level,
    title,
    description,
    icon,
    tone,
    available = false,
    rotate,
}: {
    href: string
    level: string
    title: string
    description: string
    icon: React.ReactNode
    tone: 'amber' | 'blue' | 'green'
    available?: boolean
    rotate?: string
}) {
    const toneClass = tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'green'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-blue-100 text-blue-700'

    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <span className={`flex h-13 w-13 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${toneClass}`}>{icon}</span>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{available ? `Jenjang ${level}` : 'Segera hadir'}</span>
            </div>
            <h3 className="st-heading-display mt-6 text-4xl">{title}</h3>
            <p className="st-muted mt-3 flex-1 font-semibold leading-relaxed">{description}</p>
            <span className={`mt-6 inline-flex items-center gap-2 font-black ${available ? 'text-blue-700' : 'text-gray-400'}`}>
                {available ? 'Buka jenjang' : 'Belum tersedia'}
                {available && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
            </span>
        </>
    )

    if (!available) {
        // Kartu non-interaktif: status "Belum tersedia" sudah disampaikan lewat teks,
        // jadi `aria-disabled` tidak diperlukan (dan tidak valid pada role article).
        return <article className={`st-card-md flex min-h-72 flex-col bg-slate-50 p-6 transition-transform md:p-7 ${rotate ?? ''}`}>{content}</article>
    }

    return (
        <TkaSurfaceLink href={href} className={`st-card-md st-focus group relative flex min-h-72 flex-col bg-white p-6 transition-transform hover:-translate-y-1 md:p-7 ${rotate ?? ''}`}>
            <WashiTape tone="blue" className="-top-3 left-8" />
            {content}
        </TkaSurfaceLink>
    )
}
