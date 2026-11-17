import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/utils/supabase/server'
import { protectedHref } from '@/lib/protected-href'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, BarChart3, CalendarDays, Clock3, Trophy } from 'lucide-react'
import SeoNavbar from '@/components/SeoNavbar'

export const metadata: Metadata = {
  title: 'Event Tryout CPNS | SiapTempur',
  description:
    'Lihat event tryout CPNS yang tersedia di SiapTempur, ikuti sesi terjadwal, dan tinjau hasil setelah event selesai.',
  alternates: {
    canonical: '/cpns/event',
  },
}

const eventBenefits = [
  {
    icon: CalendarDays,
    title: 'Sesi terjadwal',
    text: 'Ikuti event pada jadwal yang ditentukan agar pengalaman pengerjaan lebih terstruktur.',
    surface: 'bg-yellow-50',
  },
  {
    icon: Clock3,
    title: 'Latihan dengan batas waktu',
    text: 'Gunakan event untuk membiasakan diri mengatur waktu selama sesi berlangsung.',
    surface: 'bg-blue-50',
  },
  {
    icon: BarChart3,
    title: 'Lihat hasil event',
    text: 'Setelah sesi selesai, gunakan hasil yang tersedia untuk menilai performa dan menentukan latihan berikutnya.',
    surface: 'bg-green-50',
  },
] as const

export default async function EventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authed = Boolean(user)

  return (
    <div data-experience-mode="marketing" className="min-h-screen bg-background">
      <SeoNavbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link
            href="/cpns"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 font-body font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke persiapan CPNS
          </Link>

          <section className="text-center py-10 md:py-16">
            <Badge variant="yellow" className="mb-6 inline-flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Event tryout
            </Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight max-w-4xl mx-auto">
              Ikuti tryout bersama dalam sesi terjadwal.
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Event tryout memberi kamu kesempatan mengerjakan sesi pada waktu yang sama dengan
              peserta event lainnya, lalu meninjau hasil setelah sesi selesai.
            </p>
            <Button handwriting={false} asChild size="lg" variant="primary">
              <Link href={protectedHref('/cpns/dashboard/event', authed)}>
                Lihat event yang tersedia
              </Link>
            </Button>
          </section>

          <section className="grid md:grid-cols-3 gap-6 mb-16">
            {eventBenefits.map(({ icon: Icon, title, text, surface }) => (
              <Card key={title} className={`p-6 border-2 border-gray-900 ${surface}`}>
                <div className="w-12 h-12 bg-white border-2 border-gray-900 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-blue-700" />
                </div>
                <h2 className="text-xl font-bold mb-3">{title}</h2>
                <p className="text-gray-600 leading-relaxed">{text}</p>
              </Card>
            ))}
          </section>

          <Section dashedBorder="both" className="rounded-2xl bg-blue-50 border-2 border-gray-900">
            <div className="max-w-3xl mx-auto text-center px-4">
              <CalendarDays className="w-10 h-10 text-blue-700 mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Belum ada event yang cocok?
              </h2>
              <p className="text-gray-600 mb-7 leading-relaxed">
                Kamu tetap bisa berlatih secara mandiri dengan latihan fokus, mini tryout, atau full
                tryout sambil menunggu jadwal event berikutnya.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button handwriting={false} asChild size="lg">
                  <Link href="/cpns/full-tryout">Lihat full tryout</Link>
                </Button>
                <Button handwriting={false} asChild size="lg" variant="outline">
                  <Link href="/cpns#pilihan-latihan">Lihat pilihan latihan</Link>
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </main>
    </div>
  )
}
