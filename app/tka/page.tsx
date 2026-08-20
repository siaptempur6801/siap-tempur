import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, BookOpenCheck, GraduationCap, School } from 'lucide-react'
import { TKA_LEVELS, tkaLevelPath } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'TKA SD, SMP, SMA - SiapTempur',
    description: 'Persiapan Tes Kemampuan Akademik untuk jenjang SD, SMP, dan SMA di SiapTempur.',
    alternates: { canonical: '/tka' },
}

const LEVEL_COPY = {
    SD: {
        title: 'TKA SD',
        subtitle: 'Fondasi literasi dan numerasi',
        description: 'Matematika, Bahasa Indonesia, dan Bahasa Inggris dalam satu jalur belajar.',
        icon: School,
    },
    SMP: {
        title: 'TKA SMP',
        subtitle: 'Persiapan akademik tingkat lanjut',
        description: 'Belajar terarah berdasarkan mapel dan kemampuan yang diuji pada jenjang SMP.',
        icon: BookOpenCheck,
    },
    SMA: {
        title: 'TKA SMA',
        subtitle: 'Persiapan menuju jenjang berikutnya',
        description: 'Pilih jalur TKA SMA dan fokus pada mapel yang sesuai kebutuhan akademikmu.',
        icon: GraduationCap,
    },
} as const

export default async function TkaLandingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams

    return (
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-10 text-gray-900 md:px-8 md:py-16">
            <div className="mx-auto max-w-6xl space-y-8">
                <header className="border-2 border-gray-900 bg-white p-6 shadow-[7px_7px_0_0_#111] md:p-9">
                    <div className="inline-flex border-2 border-gray-900 bg-yellow-300 px-3 py-1 text-xs font-black uppercase">
                        SiapTempur TKA
                    </div>
                    <h1 className="mt-4 font-handwriting text-4xl font-black leading-tight md:text-6xl">
                        Pilih jenjang TKA kamu.
                    </h1>
                    <p className="mt-3 max-w-3xl text-base font-semibold text-gray-600 md:text-lg">
                        Satu akun dapat mengikuti lebih dari satu jalur. Progress setiap jenjang disimpan terpisah melalui Schema V2.
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
                        return (
                            <Link
                                key={level}
                                href={tkaLevelPath(level)}
                                className="group border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                            >
                                <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-cyan-100">
                                    <Icon size={25} />
                                </div>
                                <h2 className="mt-5 text-2xl font-black">{copy.title}</h2>
                                <p className="mt-1 text-sm font-black uppercase text-blue-700">{copy.subtitle}</p>
                                <p className="mt-3 min-h-20 font-semibold text-gray-600">{copy.description}</p>
                                <div className="mt-5 inline-flex items-center gap-2 font-black">
                                    Buka jalur <ArrowRight className="transition group-hover:translate-x-1" size={18} />
                                </div>
                            </Link>
                        )
                    })}
                </section>

                <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-dashed border-gray-400 bg-white/60 p-4 text-sm font-semibold text-gray-600">
                    <span>Sudah belajar CPNS?</span>
                    <Link className="font-black text-blue-700 underline" href="/cpns/dashboard">Buka dashboard CPNS</Link>
                </div>
            </div>
        </main>
    )
}
