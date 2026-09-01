import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, BookOpenCheck, GraduationCap, LockKeyhole, School } from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import { TKA_LEVELS, tkaLevelPath } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'TKA SMP - SiapTempur',
    description: 'Persiapan TKA SMP dengan latihan, mini tryout, full tryout, pembahasan, latihan perbaikan, dan analisis perkembangan belajar.',
    alternates: { canonical: '/tka' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEVEL_COPY = {
    SD: {
        title: 'TKA SD',
        subtitle: 'Segera hadir',
        description: 'Latihan dan tryout TKA SD sedang kami siapkan.',
        icon: School,
        available: false,
    },
    SMP: {
        title: 'TKA SMP',
        subtitle: 'Siap dipelajari',
        description: 'Latihan, mini tryout, full tryout, pembahasan, soal yang perlu diulang, dan rekomendasi belajar dalam satu jalur.',
        icon: BookOpenCheck,
        available: true,
    },
    SMA: {
        title: 'TKA SMA',
        subtitle: 'Segera hadir',
        description: 'Latihan dan tryout TKA SMA sedang kami siapkan.',
        icon: GraduationCap,
        available: false,
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
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-8 text-gray-900 md:px-8 md:py-14">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link href="/" className="inline-flex items-center gap-2 font-black text-gray-700 hover:text-blue-700">
                        <ArrowLeft size={18} /> SiapTempur
                    </Link>
                    {user ? (
                        <span className="border-2 border-gray-900 bg-green-100 px-3 py-2 text-sm font-black shadow-[3px_3px_0_0_#111]">
                            Siap lanjut belajar
                        </span>
                    ) : (
                        <Link
                            href="/login?returnTo=%2Ftka%2Fsmp"
                            className="border-2 border-gray-900 bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                        >
                            Masuk untuk mulai TKA
                        </Link>
                    )}
                </div>

                <header className="border-2 border-gray-900 bg-white p-6 shadow-[7px_7px_0_0_#111] md:p-9">
                    <div className="inline-flex border-2 border-gray-900 bg-cyan-200 px-3 py-1 text-xs font-black uppercase">
                        SiapTempur TKA
                    </div>
                    <h1 className="mt-4 font-handwriting text-4xl font-black leading-tight md:text-6xl">
                        Belajar TKA lebih terarah.
                    </h1>
                    <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-gray-600 md:text-lg">
                        Mulai dari TKA SMP. Latihan, ikut tryout, pelajari pembahasan, lalu fokus memperbaiki bagian yang masih lemah.
                    </p>
                </header>

                {params.error && (
                    <div className="border-2 border-gray-900 bg-red-100 px-4 py-3 font-bold text-red-800 shadow-[3px_3px_0_0_#111]">
                        {params.error}
                    </div>
                )}

                <section className="grid gap-5 md:grid-cols-3">
                    {TKA_LEVELS.map((level) => {
                        const copy = LEVEL_COPY[level]
                        const Icon = copy.icon
                        const cardClass = 'border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0_0_#111]'

                        if (!copy.available) {
                            return (
                                <article key={level} className={`${cardClass} opacity-70`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-gray-100">
                                            <Icon size={25} />
                                        </div>
                                        <span className="inline-flex items-center gap-1 border-2 border-gray-900 bg-gray-100 px-2 py-1 text-xs font-black uppercase">
                                            <LockKeyhole size={13} /> Segera hadir
                                        </span>
                                    </div>
                                    <h2 className="mt-5 text-2xl font-black">{copy.title}</h2>
                                    <p className="mt-1 text-sm font-black uppercase text-gray-500">{copy.subtitle}</p>
                                    <p className="mt-3 min-h-20 font-semibold text-gray-600">{copy.description}</p>
                                    <div className="mt-5 font-black text-gray-500">Kami sedang menyiapkannya.</div>
                                </article>
                            )
                        }

                        const path = tkaLevelPath(level)
                        const href = user ? path : `/login?returnTo=${encodeURIComponent(path)}`

                        return (
                            <Link
                                key={level}
                                href={href}
                                className={`group ${cardClass} transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-cyan-200">
                                        <Icon size={25} />
                                    </div>
                                    <span className="border-2 border-gray-900 bg-green-100 px-2 py-1 text-xs font-black uppercase">Tersedia</span>
                                </div>
                                <h2 className="mt-5 text-2xl font-black">{copy.title}</h2>
                                <p className="mt-1 text-sm font-black uppercase text-blue-700">{copy.subtitle}</p>
                                <p className="mt-3 min-h-20 font-semibold text-gray-600">{copy.description}</p>
                                <div className="mt-5 inline-flex items-center gap-2 font-black text-blue-700">
                                    {user ? 'Mulai belajar' : 'Masuk dan mulai'} <ArrowRight className="transition group-hover:translate-x-1" size={18} />
                                </div>
                            </Link>
                        )
                    })}
                </section>

                <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-dashed border-gray-400 bg-white/60 p-4 text-sm font-semibold text-gray-600">
                    <span>Persiapan CPNS/SKD juga tersedia dalam akun yang sama.</span>
                    <Link className="font-black text-blue-700 underline" href="/cpns">Lihat persiapan CPNS</Link>
                </div>
            </div>
        </main>
    )
}
