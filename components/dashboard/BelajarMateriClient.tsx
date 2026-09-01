'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Bookmark, Dumbbell, FileText } from 'lucide-react'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

const learningGroups = [
    { label: 'TWK', items: ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Negara'] },
    { label: 'TIU', items: ['Verbal', 'Numerik', 'Figural', 'Logika', 'Analitis'] },
    { label: 'TKP', items: ['Pelayanan Publik', 'Jejaring Kerja', 'Sosial Budaya', 'TIK', 'Profesionalisme', 'Anti Radikalisme'] },
]

export default function BelajarMateriClient() {
    return (
        <PageAnimateContainer className="mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
            <PageAnimateItem>
                <div className="st-kicker"><BookOpen size={14} /> Belajar</div>
                <div className="mt-4 max-w-3xl">
                    <h1 className="st-heading text-3xl sm:text-4xl lg:text-5xl">Bangun pemahaman sebelum latihan.</h1>
                    <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                        Halaman materi mendalam per topik sedang disiapkan. Untuk sekarang, kamu tetap bisa melihat kisi-kisi dan langsung berlatih pada bagian yang ingin diperkuat.
                    </p>
                </div>
            </PageAnimateItem>

            <PageAnimateItem className="grid gap-4 md:grid-cols-3">
                <Link href="/cpns/dashboard/materi" className="st-card-md st-focus group p-5 focus-visible:outline-none">
                    <div className="flex h-11 w-11 items-center justify-center border-2 border-slate-900 bg-amber-50"><FileText className="h-5 w-5 text-amber-800" /></div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">Lihat Kisi-kisi SKD</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Pelajari cakupan TWK, TIU, TKP, jumlah soal, dan nilai ambang.</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700">Buka kisi-kisi <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>

                <Link href="/cpns/dashboard/drilling-materi" className="st-card-md st-focus group p-5 focus-visible:outline-none">
                    <div className="flex h-11 w-11 items-center justify-center border-2 border-slate-900 bg-blue-50"><Dumbbell className="h-5 w-5 text-blue-700" /></div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">Mulai Latihan Fokus</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Pilih submateri tertentu dan kerjakan latihan yang lebih terarah.</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700">Pilih materi <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>

                <Link href="/cpns/dashboard/mini-tryout" className="st-card-md st-focus group p-5 focus-visible:outline-none">
                    <div className="flex h-11 w-11 items-center justify-center border-2 border-slate-900 bg-emerald-50"><Bookmark className="h-5 w-5 text-emerald-700" /></div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">Uji satu bagian</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Gunakan Mini Tryout untuk mengukur TWK, TIU, atau TKP secara terpisah.</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700">Buka Mini Tryout <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
            </PageAnimateItem>

            <PageAnimateItem>
                <section className="st-flat-card p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-slate-50"><BookOpen className="h-5 w-5 text-slate-700" /></div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Materi mendalam</p>
                            <h2 className="mt-1 text-xl font-black text-slate-950">Struktur topik sudah disiapkan.</h2>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Nantinya setiap topik dapat berisi rangkuman, contoh, pembahasan, dan latihan terkait. Sampai fitur itu tersedia, gunakan alur belajar yang sudah aktif di atas.</p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {learningGroups.map((group) => (
                            <div key={group.label} className="border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">{group.label}</p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {group.items.map((item) => (
                                        <span key={`${group.label}-${item}`} className="border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </PageAnimateItem>
        </PageAnimateContainer>
    )
}
