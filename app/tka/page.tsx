import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, BookOpenCheck, GraduationCap, LockKeyhole, School } from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import { TKA_LEVELS, tkaLevelPath } from '@/src/tka/context'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
    title: 'Persiapan TKA - SiapTempur',
    description: 'Persiapan TKA dengan TKA SMP yang tersedia saat ini, sementara pengalaman belajar TKA SD dan SMA sedang disiapkan.',
    alternates: { canonical: '/tka' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEVEL_COPY = {
    SD: {
        title: 'TKA SD',
        subtitle: 'Sedang disiapkan',
        description: 'Pengalaman belajar TKA SD sedang kami siapkan agar mengikuti pola latihan, evaluasi, dan pembahasan yang sama.',
        icon: School,
        available: false,
        tone: 'bg-yellow-100 text-amber-800',
    },
    SMP: {
        title: 'TKA SMP',
        subtitle: 'Tersedia sekarang',
        description: 'Latihan, Mini Tryout, Full Tryout, pembahasan, soal yang perlu diulang, dan rekomendasi belajar dalam satu jalur.',
        icon: BookOpenCheck,
        available: true,
        tone: 'bg-emerald-100 text-emerald-700',
    },
    SMA: {
        title: 'TKA SMA',
        subtitle: 'Sedang disiapkan',
        description: 'Pengalaman belajar TKA SMA sedang kami siapkan dengan struktur yang konsisten dan sesuai kebutuhan jenjangnya.',
        icon: GraduationCap,
        available: false,
        tone: 'bg-violet-100 text-violet-700',
    },
} as const

export default async function TkaLandingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <main data-experience-mode="marketing" className="st-product min-h-screen">
            <header className="border-b-2 border-slate-900 bg-[#fbfaf7]/95 backdrop-blur">
                <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
                    <Link href="/" className="st-focus font-handwriting text-3xl font-black tracking-tight text-slate-950">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link href="/cpns" className="st-focus hidden min-h-11 items-center px-3 text-sm font-black text-slate-800 hover:text-blue-700 sm:inline-flex">
                            CPNS
                        </Link>
                        {user ? (
                            <Button size="sm" asChild><Link href="/tka/smp">TKA SMP</Link></Button>
                        ) : (
                            <Button size="sm" variant="outline" asChild><Link href="/login?returnTo=%2Ftka%2Fsmp">Masuk</Link></Button>
                        )}
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden border-b-2 border-slate-900 px-4 py-16 md:px-8 md:py-24">
                <div className="pointer-events-none absolute -left-20 top-16 h-44 w-44 rounded-full border-2 border-dashed border-yellow-500 bg-yellow-50" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-20 bottom-[-4rem] h-64 w-64 -rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <span className="st-kicker">Persiapan TKA</span>
                        <h1 className="st-heading-display mt-7 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Belajar TKA lebih terarah. Tahu apa yang perlu diperbaiki.
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            Pilih jenjangmu, kerjakan latihan dan tryout, pelajari pembahasan, lalu gunakan hasil untuk menentukan fokus belajar berikutnya.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button size="lg" asChild>
                                <Link href={user ? '/tka/smp' : '/login?returnTo=%2Ftka%2Fsmp'}>
                                    Mulai TKA SMP <ArrowRight size={18} />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild><Link href="#pilih-jenjang">Lihat jenjang</Link></Button>
                        </div>
                    </div>

                    <div className="st-card-lg rotate-[-0.5deg] p-6 md:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Satu pola belajar</p>
                        <h2 className="st-heading-display mt-3 text-3xl md:text-4xl">Ukur. Pahami. Tingkatkan.</h2>
                        <div className="mt-6 divide-y-2 divide-dashed divide-slate-200">
                            {[
                                ['01', 'Mulai dari latihan yang sesuai jenjangmu.'],
                                ['02', 'Lihat hasil dan perkembangan setelah mengerjakan.'],
                                ['03', 'Pelajari pembahasan serta soal yang perlu diulang.'],
                                ['04', 'Gunakan rekomendasi untuk memilih fokus berikutnya.'],
                            ].map(([number, text]) => (
                                <div key={number} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-blue-50 text-xs font-black text-blue-700">{number}</span>
                                    <p className="st-muted pt-1 text-sm font-bold leading-relaxed">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="pilih-jenjang" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-3xl">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Pilih jenjang</p>
                        <h2 className="st-heading-display mt-2 text-4xl md:text-5xl">Satu SiapTempur, pengalaman yang konsisten.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">
                            Struktur utama tetap sama di setiap jenjang, sementara materi dan latihan mengikuti kebutuhan tingkat pendidikan.
                        </p>
                    </div>

                    {params.error && (
                        <div role="alert" className="st-danger mt-6 px-4 py-3 text-sm font-black text-red-800">{params.error}</div>
                    )}

                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {TKA_LEVELS.map((level) => {
                            const copy = LEVEL_COPY[level]
                            const Icon = copy.icon

                            if (!copy.available) {
                                return (
                                    <article key={level} data-program={`tka-${level.toLowerCase()}`} className="st-card flex min-h-[19rem] flex-col p-6 opacity-80">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className={`flex h-12 w-12 items-center justify-center border-2 border-slate-900 ${copy.tone}`}><Icon size={23} /></div>
                                            <span className="st-pill bg-slate-100 text-slate-600"><LockKeyhole size={12} /> Segera hadir</span>
                                        </div>
                                        <h3 className="st-heading mt-6 text-2xl">{copy.title}</h3>
                                        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{copy.subtitle}</p>
                                        <p className="st-muted mt-4 flex-1 font-semibold leading-relaxed">{copy.description}</p>
                                        <p className="mt-5 text-sm font-black text-slate-500">Kami sedang menyiapkannya.</p>
                                    </article>
                                )
                            }

                            const path = tkaLevelPath(level)
                            const href = user ? path : `/login?returnTo=${encodeURIComponent(path)}`

                            return (
                                <Link
                                    key={level}
                                    data-program={`tka-${level.toLowerCase()}`}
                                    href={href}
                                    className="st-card-md st-focus group flex min-h-[19rem] flex-col p-6 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`flex h-12 w-12 items-center justify-center border-2 border-slate-900 ${copy.tone}`}><Icon size={23} /></div>
                                        <span className="st-pill bg-emerald-100 text-emerald-800">Tersedia</span>
                                    </div>
                                    <h3 className="st-heading mt-6 text-2xl">{copy.title}</h3>
                                    <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{copy.subtitle}</p>
                                    <p className="st-muted mt-4 flex-1 font-semibold leading-relaxed">{copy.description}</p>
                                    <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-blue-700 group-hover:underline">
                                        {user ? 'Mulai belajar' : 'Masuk dan mulai'} <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} />
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="st-section-soft px-4 py-10 md:px-8">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="st-heading text-lg">Sedang mempersiapkan CPNS?</p>
                        <p className="st-muted mt-1 text-sm font-semibold">Akun yang sama juga bisa digunakan untuk persiapan SKD CPNS.</p>
                    </div>
                    <Button variant="outline" asChild><Link href="/cpns">Lihat persiapan CPNS</Link></Button>
                </div>
            </section>
        </main>
    )
}
