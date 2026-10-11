import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle2, Target } from 'lucide-react'
import SeoNavbar from '@/components/SeoNavbar'
import { appHref } from '@/lib/protected-href'
import { createClient } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Latihan Soal TWK CPNS 2026 - Materi & Simulasi',
  description:
    'Pelajari materi Tes Wawasan Kebangsaan (TWK) CPNS 2026. Latihan soal TWK lengkap dengan pembahasan, tips mencapai passing grade, dan materi nasionalisme, integritas, pilar negara, dan bela negara.',
  keywords: [
    'tryout twk cpns',
    'latihan soal twk',
    'materi twk cpns',
    'passing grade twk',
    'twk pilar negara',
    'twk integritas',
    'twk bela negara',
  ],
  alternates: {
    canonical: 'https://siaptempur.id/cpns/twk',
  },
}

export default async function TWKPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authed = Boolean(user)

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <SeoNavbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Link>

          {/* Hero Section */}
          <div className="mb-12">
            <Badge variant="red" className="mb-4">
              SKD Subtes 1
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-tight">
              Latihan Soal TWK CPNS <br className="hidden md:block" />
              <span className="text-red-600">Tes Wawasan Kebangsaan</span>
            </h1>
            <p className="text-xl text-gray-600 font-display max-w-2xl">
              Uji pemahamanmu tentang Nasionalisme, Integritas, Bela Negara, dan Pilar Negara.
              Jangan sampai gagal di TWK hanya karena kurang latihan soal penalaran!
            </p>
          </div>

          {/* Passing Grade Card */}
          <Card variant="binder" className="p-8 mb-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="bg-red-100 p-6 rounded-full border-4 border-red-600 shrink-0">
                <Target className="w-12 h-12 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-display mb-2">Passing Grade TWK: 65 Poin</h2>
                <p className="text-gray-700 font-body mb-4">
                  Dari total 30 soal TWK, Anda harus menjawab benar minimal <strong>13 soal</strong>{' '}
                  (masing-masing bernilai 5 poin). Jika salah, tidak ada pengurangan nilai (0 poin).
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border-2 border-gray-900 text-center">
                    <div className="text-sm text-gray-500 font-bold mb-1">Total Soal</div>
                    <div className="text-xl font-black">30</div>
                  </div>
                  <div className="bg-white p-3 rounded border-2 border-gray-900 text-center">
                    <div className="text-sm text-gray-500 font-bold mb-1">Skor Maksimal</div>
                    <div className="text-xl font-black">150</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Materi Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold mb-6">
              Materi TWK (Sesuai Kisi-Kisi BKN)
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Nasionalisme',
                  desc: 'Mampu mewujudkan kepentingan nasional melalui cita-cita dan tujuan yang sama dengan tetap mempertahankan identitas nasional.',
                },
                {
                  title: 'Integritas',
                  desc: 'Mampu menjunjung tinggi kejujuran, ketangguhan, komitmen dan konsistensi sebagai satu kesatuan sikap.',
                },
                {
                  title: 'Bela Negara',
                  desc: 'Mampu berperan aktif dalam mempertahankan eksistensi bangsa dan negara.',
                },
                {
                  title: 'Pilar Negara',
                  desc: 'Mampu membentuk karakter positif melalui pemahaman Pancasila, UUD 1945, NKRI, dan Bhinneka Tunggal Ika.',
                },
                {
                  title: 'Bahasa Indonesia',
                  desc: 'Mampu menggunakan bahasa Indonesia sebagai bahasa persatuan yang sangat penting kedudukannya dalam kehidupan.',
                },
              ].map((item, i) => (
                <Card key={i} variant="standard" className="p-5 flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold font-display text-xl mb-1">{item.title}</h3>
                    <p className="text-gray-600 font-body text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <Section
            dashedBorder="top"
            pattern="dots"
            className="text-center rounded-3xl mt-16 bg-white border-4 border-gray-900"
          >
            <h2 className="text-3xl font-display font-bold mb-4">Siap Uji Kemampuan TWK Kamu?</h2>
            <p className="text-gray-600 font-body mb-8 max-w-lg mx-auto">
              Soal TWK CPNS saat ini banyak yang bertipe HOTS (Higher Order Thinking Skills) dan
              penalaran panjang. Jangan cuma hafal pasal, coba simulasinya sekarang!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" variant="primary">
                <Link href={appHref('/cpns/mini-tryout', '/cpns/dashboard/mini-tryout', authed)}>
                  Mulai Mini Tryout (TWK)
                </Link>
              </Button>
              <Button asChild size="lg" variant="white">
                <Link href={appHref('/cpns/full-tryout', '/cpns/dashboard/tryout', authed)}>
                  Simulasi Full 110 Soal
                </Link>
              </Button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  )
}
