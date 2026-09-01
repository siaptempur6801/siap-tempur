'use client'

import { BookOpen, CheckCircle2, Scale, Shield, Star, Target } from 'lucide-react'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { SUBJECTS, PASSING_GRADES } from '@/lib/constants'

interface SubTopic {
    title: string
    description: string
    items?: string[]
}

interface SectionData {
    key: keyof typeof SUBJECTS
    icon: React.ReactNode
    softClass: string
    textClass: string
    subTopics: SubTopic[]
}

const materiData: SectionData[] = [
    {
        key: 'TWK',
        icon: <Shield className="h-5 w-5" />,
        softClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-700',
        subTopics: [
            { title: 'Nasionalisme', description: 'Mampu mewujudkan kepentingan nasional melalui cita-cita dan tujuan yang sama dengan tetap mempertahankan identitas nasional.' },
            { title: 'Integritas', description: 'Mampu menjunjung tinggi kejujuran, ketangguhan, komitmen dan konsistensi sebagai satu kesatuan sikap untuk mencapai tujuan nasional.' },
            { title: 'Bela Negara', description: 'Mampu berperan aktif dalam mempertahankan eksistensi bangsa dan negara.' },
            { title: 'Pilar Negara', description: 'Mampu membentuk karakter positif melalui pemahaman dan pengamalan nilai-nilai dalam Pancasila, UUD 1945, NKRI dan Bhinneka Tunggal Ika.' },
            { title: 'Bahasa Negara', description: 'Mampu menggunakan bahasa Indonesia sebagai bahasa persatuan dalam kehidupan bermasyarakat, berbangsa, dan bernegara.' },
        ],
    },
    {
        key: 'TIU',
        icon: <Target className="h-5 w-5" />,
        softClass: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-800',
        subTopics: [
            {
                title: 'Kemampuan Verbal',
                description: 'Mengukur kemampuan bernalar dan menganalisis informasi berbasis kata.',
                items: [
                    'Analogi — bernalar melalui perbandingan dua konsep kata.',
                    'Silogisme — menarik kesimpulan dari dua pernyataan.',
                    'Analitis — menganalisis informasi dan menarik kesimpulan.',
                ],
            },
            {
                title: 'Kemampuan Numerik',
                description: 'Mengukur kemampuan berhitung dan menganalisis data kuantitatif.',
                items: [
                    'Berhitung — kemampuan hitung sederhana.',
                    'Deret Angka — melihat pola hubungan angka.',
                    'Perbandingan Kuantitatif — menarik kesimpulan dari data kuantitatif.',
                    'Soal Cerita — menganalisis informasi kuantitatif dalam konteks cerita.',
                ],
            },
            {
                title: 'Kemampuan Figural',
                description: 'Mengukur kemampuan bernalar melalui pola dan gambar.',
                items: [
                    'Analogi — bernalar melalui perbandingan gambar.',
                    'Ketidaksamaan — melihat perbedaan beberapa gambar.',
                    'Serial — melihat pola hubungan dalam bentuk gambar.',
                ],
            },
        ],
    },
    {
        key: 'TKP',
        icon: <Star className="h-5 w-5" />,
        softClass: 'bg-blue-50 border-blue-200',
        textClass: 'text-blue-700',
        subTopics: [
            { title: 'Pelayanan Publik', description: 'Mampu menampilkan perilaku pelayanan yang efektif sesuai tugas dan wewenang yang dimiliki.' },
            { title: 'Jejaring Kerja', description: 'Mampu membangun hubungan, bekerja sama, berbagi informasi, dan berkolaborasi dengan orang lain secara efektif.' },
            { title: 'Sosial Budaya', description: 'Mampu beradaptasi dan bekerja secara efektif dalam masyarakat yang majemuk.' },
            { title: 'Teknologi Informasi (TIK)', description: 'Mampu memanfaatkan teknologi informasi secara efektif untuk meningkatkan kinerja.' },
            { title: 'Profesionalisme', description: 'Mampu melaksanakan tugas dan fungsi sesuai tuntutan jabatan.' },
            { title: 'Anti Radikalisme', description: 'Mengukur pengetahuan, sikap, dan respons terhadap situasi yang berkaitan dengan anti radikalisme.' },
        ],
    },
]

export default function MateriClient() {
    return (
        <PageAnimateContainer className="mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
            <PageAnimateItem>
                <div className="st-kicker"><BookOpen size={14} /> Kisi-kisi SKD</div>
                <div className="mt-4 max-w-3xl">
                    <h1 className="st-heading text-3xl sm:text-4xl lg:text-5xl">Pahami cakupan TWK, TIU, dan TKP.</h1>
                    <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                        Gunakan halaman ini sebagai peta materi sebelum memilih Latihan Fokus, Mini Tryout, atau Full Tryout.
                    </p>
                </div>
            </PageAnimateItem>

            <PageAnimateItem>
                <div className="st-flat-card flex items-start gap-3 p-4 sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-amber-50">
                        <Scale className="h-5 w-5 text-amber-800" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Nilai ambang batas</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                            Mengacu pada KepmenPANRB Nomor 321 Tahun 2024 tentang Nilai Ambang Batas Seleksi Kompetensi Dasar Pengadaan Pegawai Negeri Sipil.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="st-pill bg-red-50 text-red-700">TWK {PASSING_GRADES.TWK}</span>
                            <span className="st-pill bg-amber-50 text-amber-800">TIU {PASSING_GRADES.TIU}</span>
                            <span className="st-pill bg-blue-50 text-blue-700">TKP {PASSING_GRADES.TKP}</span>
                        </div>
                    </div>
                </div>
            </PageAnimateItem>

            <PageAnimateItem className="grid gap-4 md:grid-cols-3">
                {materiData.map((section) => {
                    const subject = SUBJECTS[section.key]
                    const passing = PASSING_GRADES[section.key]
                    return (
                        <div key={section.key} className={`border-2 p-5 ${section.softClass}`}>
                            <div className={`flex items-center gap-2 ${section.textClass}`}>
                                {section.icon}
                                <span className="text-xs font-black uppercase tracking-[0.12em]">{section.key}</span>
                            </div>
                            <h2 className="mt-3 text-lg font-black text-slate-950">{subject.name}</h2>
                            <dl className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between gap-4"><dt className="text-slate-500">Jumlah soal</dt><dd className="font-black text-slate-950">{subject.fullMark / 5}</dd></div>
                                <div className="flex justify-between gap-4"><dt className="text-slate-500">Skor maksimal</dt><dd className="font-black text-slate-950">{subject.fullMark}</dd></div>
                                <div className="flex justify-between gap-4"><dt className="text-slate-500">Nilai ambang</dt><dd className={`font-black ${section.textClass}`}>{passing}</dd></div>
                            </dl>
                        </div>
                    )
                })}
            </PageAnimateItem>

            {materiData.map((section) => {
                const subject = SUBJECTS[section.key]
                return (
                    <PageAnimateItem key={section.key}>
                        <section className="st-card-md p-5 sm:p-6">
                            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
                                <span className={`st-pill ${section.softClass} ${section.textClass}`}>{section.key}</span>
                                <h2 className="text-xl font-black text-slate-950">{subject.name}</h2>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                {section.subTopics.map((subTopic) => (
                                    <article key={subTopic.title} className="border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${section.textClass}`} />
                                            <div>
                                                <h3 className="font-black text-slate-950">{subTopic.title}</h3>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">{subTopic.description}</p>
                                                {subTopic.items && subTopic.items.length > 0 && (
                                                    <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-500">
                                                        {subTopic.items.map((item) => <li key={item}>• {item}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </PageAnimateItem>
                )
            })}
        </PageAnimateContainer>
    )
}
