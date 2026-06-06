'use client'

import { BookOpen, Bookmark, Clock3 } from 'lucide-react'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

const learningNav = [
    { label: 'Semua Materi', items: ['Ringkasan SKD', 'Strategi belajar', 'Peta topik'] },
    { label: 'TWK', items: ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Negara'] },
    { label: 'TIU', items: ['Analogi', 'Silogisme', 'Analitis', 'Berhitung', 'Deret Angka', 'Perbandingan Kuantitatif', 'Soal Cerita', 'Figural'] },
    { label: 'TKP', items: ['Pelayanan Publik', 'Jejaring Kerja', 'Sosial Budaya', 'TIK', 'Profesionalisme', 'Anti Radikalisme'] },
]

export default function BelajarMateriClient() {
    return (
        <PageAnimateContainer className="space-y-4">
            <PageAnimateItem>
                <div className="flex items-center gap-3">
                    <div className="border-2 border-gray-900 bg-yellow-300 p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <BookOpen className="h-6 w-6 text-gray-900" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 md:text-3xl">Materi Belajar</h1>
                        <p className="text-sm font-bold text-gray-600">Rangkuman dan latihan per submateri SKD.</p>
                    </div>
                </div>
            </PageAnimateItem>

            <PageAnimateItem>
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <aside className="border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="mb-4 flex items-center justify-between border-b-2 border-gray-900 pb-3">
                            <div>
                                <h2 className="font-handwriting text-2xl font-black text-gray-900">Daftar Materi</h2>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Coming Soon</p>
                            </div>
                            <Clock3 className="h-5 w-5 text-gray-500" />
                        </div>

                        <div className="space-y-3">
                            {learningNav.map((group) => (
                                <div key={group.label} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-500">{group.label}</span>
                                        <span className="rounded-sm border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-gray-400">
                                            Soon
                                        </span>
                                    </div>
                                    <div className="grid gap-1">
                                        {group.items.map((item) => (
                                            <button
                                                key={`${group.label}-${item}`}
                                                type="button"
                                                disabled
                                                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-bold text-gray-400"
                                            >
                                                <span>{item}</span>
                                                <span className="text-[10px] font-black uppercase">Soon</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="relative overflow-hidden border-2 border-gray-900 bg-yellow-50 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-gray-900 bg-yellow-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <Bookmark className="h-7 w-7 text-gray-900" />
                            </div>
                            <div className="space-y-2">
                                <div className="inline-flex border-2 border-gray-900 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    Coming Soon
                                </div>
                                <h2 className="font-handwriting text-3xl font-black text-gray-900">
                                    Nanti setiap submateri punya halaman belajar sendiri.
                                </h2>
                                <p className="max-w-2xl text-sm font-medium leading-relaxed text-gray-700">
                                    Struktur materi sudah disiapkan. Nanti halaman ini bisa diisi rangkuman, contoh soal, pembahasan, dan latihan per topik.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </PageAnimateItem>
        </PageAnimateContainer>
    )
}
