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
        tone: 'bg-amber-50 text-amber-700',
        border: 'border-amber-100',
    },
    SMP: {
        title: 'TKA SMP',
        subtitle: 'Tersedia sekarang',
        description: 'Latihan, mini tryout, full tryout, pembahasan, soal yang perlu diulang, dan rekomendasi belajar dalam satu jalur.',
        icon: BookOpenCheck,
        available: true,
        tone: 'bg-emerald-50 text-emerald-700',
        border: 'border-emerald-100',
    },
    SMA: {
        title: 'TKA SMA',
        subtitle: 'Sedang disiapkan',
        description: 'Pengalaman belajar TKA SMA sedang kami siapkan dengan struktur yang konsisten dan sesuai kebutuhan jenjangnya.',
        icon: GraduationCap,
        available: false,
        tone: 'bg-violet-50 text-violet-700',
        border: 'border-violet-100',
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
        <main data-experience-mode="marketing" className="min-h-screen bg-white text-slate-950">
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
                    <Link
                        href="/"
                        className="rounded-md font-handwriting text-2xl font-bold tracking-tight text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:text-3xl"
                    >
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link href="/cpns" className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">
                            CPNS
                        </Link>
                        {user ? (
                            <Button size="sm" asChild><Link href="/tka/smp">Lanjutkan TKA</Link></Button>
                        ) : (
                            <Button size="sm" variant="outline" asChild><Link href="/login?returnTo=%2Ftka%2Fsmp">Masuk</Link></Button>
                        )}
                    </div>
                </div>
            </header>

            <section className="border-b border-slate-200 bg-slate-50/70 px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <p className="text-sm font-semibold text-emerald-700">Persiapan TKA</p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-6xl md:text-7xl md:leading-[0.98]">
                            Belajar terarah untuk kemampuan yang terus berkembang.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
                            Pilih jenjangmu, kerjakan latihan dan tryout, pelajari pembahasan, lalu gunakan hasil untuk menentukan fokus belajar berikutnya.
                        </p>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[var(--px-shadow-md)] md:p-8">
                        <p className="text-sm font-semibold text-emerald-700">Satu pola belajar</p>
                        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Ukur. Pahami. Tingkatkan.</h2>
                        <div className="mt-6 space-y-4">
                            {[
                                ['01', 'Mulai dari latihan yang sesuai jenjangmu.'],
                                ['02', 'Lihat hasil dan perkembangan setelah mengerjakan.'],
                                ['03', 'Pelajari pembahasan serta soal yang perlu diulang.'],
                                ['04', 'Gunakan rekomendasi untuk memilih fokus berikutnya.'],
                            ].map(([number, text]) => (
                                <div key={number} className="flex gap-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">{number}</span>
                                    <p className="pt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold text-emerald-700">Pilih jenjang</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Satu SiapTempur, pengalaman yang konsisten.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                            Struktur utama tetap sama di setiap jenjang, sementara materi dan latihan mengikuti kebutuhan tingkat pendidikan.
                        </p>
                    </div>

                    {params.error && (
                        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                            {params.error}
                        </div>
                    )}

                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {TKA_LEVELS.map((level) => {
                            const copy = LEVEL_COPY[level]
                            const Icon = copy.icon

                            if (!copy.available) {
                                return (
                                    <article key={level} data-program={`tka-${level.toLowerCase()}`} className={`flex min-h-[19rem] flex-col rounded-3xl border bg-white p-6 shadow-[var(--px-shadow-xs)] ${copy.border}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${copy.tone}`}><Icon size={23} /></div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                                <LockKeyhole size={12} /> Segera hadir
                                            </span>
                                        </div>
                                        <h3 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">{copy.title}</h3>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">{copy.subtitle}</p>
                                        <p className="mt-4 flex-1 leading-relaxed text-slate-600">{copy.description}</p>
                                        <p className="mt-5 text-sm font-semibold text-slate-500">Kami sedang menyiapkannya.</p>
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
                                    className={`group flex min-h-[19rem] flex-col rounded-3xl border bg-white p-6 shadow-[var(--px-shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--px-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${copy.border}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${copy.tone}`}><Icon size={23} /></div>
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Tersedia</span>
                                    </div>
                                    <h3 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">{copy.title}</h3>
                                    <p className="mt-1 text-sm font-semibold text-emerald-700">{copy.subtitle}</p>
                                    <p className="mt-4 flex-1 leading-relaxed text-slate-600">{copy.description}</p>
                                    <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700">
                                        {user ? 'Mulai belajar' : 'Masuk dan mulai'} <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} />
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="border-t border-slate-200 bg-slate-50 px-4 py-10 md:px-8">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold text-slate-900">Sedang mempersiapkan CPNS?</p>
                        <p className="mt-1 text-sm text-slate-500">Akun yang sama juga bisa digunakan untuk persiapan SKD CPNS.</p>
                    </div>
                    <Button variant="outline" asChild><Link href="/cpns">Lihat persiapan CPNS</Link></Button>
                </div>
            </section>
        </main>
    )
}
