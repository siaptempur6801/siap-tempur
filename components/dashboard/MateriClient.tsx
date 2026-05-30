'use client'

import { BookOpen, CheckCircle2, Target, Shield, Star, Scale } from 'lucide-react'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { Section } from '@/components/ui/Section'
import { Badge } from '@/components/ui/Badge'
import { SUBJECTS, PASSING_GRADES } from '@/lib/constants'

interface SubTopic {
    title: string
    description: string
    items?: string[]
}

interface SectionData {
    key: string
    icon: React.ReactNode
    color: string
    borderColor: string
    bgColor: string
    textColor: string
    subTopics: SubTopic[]
}

const materiData: SectionData[] = [
    {
        key: 'TWK',
        icon: <Shield className="w-6 h-6" />,
        color: 'red',
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        subTopics: [
            {
                title: 'Nasionalisme',
                description: 'Mampu mewujudkan kepentingan nasional melalui cita-cita dan tujuan yang sama dengan tetap mempertahankan identitas nasional.',
            },
            {
                title: 'Integritas',
                description: 'Mampu menjunjung tinggi kejujuran, ketangguhan, komitmen dan konsistensi sebagai satu kesatuan sikap untuk mencapai tujuan nasional.',
            },
            {
                title: 'Bela Negara',
                description: 'Mampu berperan aktif dalam mempertahankan eksistensi bangsa dan negara.',
            },
            {
                title: 'Pilar Negara',
                description: 'Mampu membentuk karakter positif melalui pemahaman dan pengamalan nilai-nilai dalam Pancasila, UUD 1945, NKRI dan Bhinneka Tunggal Ika.',
            },
            {
                title: 'Bahasa Negara',
                description: 'Mampu menggunakan bahasa Indonesia sebagai bahasa persatuan yang sangat penting kedudukannya dalam kehidupan bermasyarakat, berbangsa, dan bernegara.',
            },
        ],
    },
    {
        key: 'TIU',
        icon: <Target className="w-6 h-6" />,
        color: 'blue',
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        subTopics: [
            {
                title: 'Kemampuan Verbal',
                description: 'Mengukur kemampuan bernalar dan menganalisis informasi berbasis kata.',
                items: [
                    'Analogi — Mengukur kemampuan individu dalam bernalar melalui perbandingan dua konsep kata.',
                    'Silogisme — Mengukur kemampuan untuk menarik kesimpulan dari dua pernyataan.',
                    'Analitis — Mengukur kemampuan menganalisis informasi dan menarik kesimpulan.',
                ],
            },
            {
                title: 'Kemampuan Numerik',
                description: 'Mengukur kemampuan berhitung dan menganalisis data kuantitatif.',
                items: [
                    'Berhitung — Mengukur kemampuan hitung sederhana.',
                    'Deret Angka — Mengukur kemampuan melihat pola hubungan angka.',
                    'Perbandingan Kuantitatif — Mengukur kemampuan menarik kesimpulan berdasarkan dua data kuantitatif.',
                    'Soal Cerita — Mengukur kemampuan analisis kuantitatif dari informasi cerita.',
                ],
            },
            {
                title: 'Kemampuan Figural',
                description: 'Mengukur kemampuan bernalar melalui pola dan gambar.',
                items: [
                    'Analogi — Bernalar melalui perbandingan dua gambar.',
                    'Ketidaksamaan — Melihat perbedaan beberapa gambar.',
                    'Serial — Melihat pola hubungan dalam bentuk gambar.',
                ],
            },
        ],
    },
    {
        key: 'TKP',
        icon: <Star className="w-6 h-6" />,
        color: 'green',
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        subTopics: [
            {
                title: 'Pelayanan Publik',
                description: 'Mampu menampilkan perilaku keramahtamahan dalam bekerja yang efektif agar bisa memenuhi kebutuhan dan kepuasan orang lain sesuai dengan tugas dan wewenang yang dimiliki.',
            },
            {
                title: 'Jejaring Kerja',
                description: 'Mampu membangun dan membina hubungan, bekerja sama, berbagi informasi dan berkolaborasi dengan orang lain secara efektif.',
            },
            {
                title: 'Sosial Budaya',
                description: 'Mampu beradaptasi dan bekerja secara efektif dalam masyarakat majemuk, terdiri atas beragam agama, suku, budaya, dan sebagainya.',
            },
            {
                title: 'Teknologi Informasi (TIK)',
                description: 'Mampu memanfaatkan teknologi informasi secara efektif untuk meningkatkan kinerja.',
            },
            {
                title: 'Profesionalisme',
                description: 'Mampu melaksanakan tugas dan fungsi sesuai dengan tuntutan Jabatan.',
            },
            {
                title: 'Anti Radikalisme',
                description: 'Menjaring informasi dari individu tentang pengetahuan terhadap anti radikalisme, kecenderungan bersikap, dan bertindak saat menanggapi stimulus dengan beberapa alternatif situasi.',
            },
        ],
    },
]

export default function MateriClient() {
    return (
        <PageAnimateContainer className="space-y-4">
            {/* Header */}
            <PageAnimateItem>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-yellow-300 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <BookOpen className="w-6 h-6 text-gray-900" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900">
                                Kisi-Kisi Materi SKD
                            </h1>
                            <p className="text-sm text-gray-600 font-bold">
                                Panduan lengkap materi Tes Seleksi Kompetensi Dasar CPNS
                            </p>
                        </div>
                    </div>
                </div>
            </PageAnimateItem>

            {/* Legal Reference */}
            <PageAnimateItem>
                <div className="border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gradient-to-r from-amber-100 to-yellow-50 p-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white border-2 border-gray-900 shrink-0">
                            <Scale className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">
                                Dasar Hukum Nilai Ambang Batas
                            </h3>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Berdasarkan <strong>Keputusan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (KepmenPANRB) Nomor 321 Tahun 2024</strong> tentang Nilai Ambang Batas Seleksi Kompetensi Dasar Pengadaan Pegawai Negeri Sipil.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className="inline-block bg-red-100 border border-red-400 text-red-700 text-xs font-black px-2 py-0.5">
                                    TWK: {PASSING_GRADES.TWK}
                                </span>
                                <span className="inline-block bg-blue-100 border border-blue-400 text-blue-700 text-xs font-black px-2 py-0.5">
                                    TIU: {PASSING_GRADES.TIU}
                                </span>
                                <span className="inline-block bg-green-100 border border-green-400 text-green-700 text-xs font-black px-2 py-0.5">
                                    TKP: {PASSING_GRADES.TKP}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </PageAnimateItem>

            {/* SKD Overview */}
            <PageAnimateItem>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {materiData.map((section) => {
                        const subject = SUBJECTS[section.key as keyof typeof SUBJECTS]
                        const passing = PASSING_GRADES[section.key as keyof typeof PASSING_GRADES]
                        return (
                            <div
                                key={section.key}
                                className={`border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${section.bgColor} p-5`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={section.textColor}>{section.icon}</span>
                                    <h3 className={`text-lg font-black ${section.textColor}`}>
                                        {subject.name}
                                    </h3>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-gray-600">Soal</span>
                                        <span className="text-gray-900">{subject.fullMark / 5}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-gray-600">Nilai Maks</span>
                                        <span className="text-gray-900">{subject.fullMark}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-gray-600">Passing Grade</span>
                                        <span className={`font-black ${section.textColor}`}>{passing}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </PageAnimateItem>

            {/* Detailed Sections */}
            {materiData.map((section) => {
                const subject = SUBJECTS[section.key as keyof typeof SUBJECTS]
                return (
                    <PageAnimateItem key={section.key}>
                        <Section className="py-8">
                            <div className="space-y-5">
                                {/* Section Header */}
                                <div className={`flex items-center gap-3 pb-3 border-b-2 ${section.borderColor} border-dashed`}>
                                    <Badge variant={section.color === 'red' ? 'red' : section.color === 'blue' ? 'blue' : 'green'}>
                                        {section.key}
                                    </Badge>
                                    <h2 className="text-xl font-black text-gray-900">
                                        {subject.name}
                                    </h2>
                                </div>

                                {/* Sub Topics */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {section.subTopics.map((sub) => (
                                        <div
                                            key={sub.title}
                                            className={`border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white p-4 hover:-translate-y-0.5 transition-transform`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${section.textColor}`} />
                                                <div className="space-y-1.5 min-w-0">
                                                    <h4 className="font-black text-gray-900 text-sm">
                                                        {sub.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed">
                                                        {sub.description}
                                                    </p>
                                                    {sub.items && sub.items.length > 0 && (
                                                        <ul className="space-y-1 mt-2 pl-1">
                                                            {sub.items.map((item, i) => (
                                                                <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                                                                    <span className="text-gray-400 shrink-0">•</span>
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Section>
                    </PageAnimateItem>
                )
            })}
        </PageAnimateContainer>
    )
}
