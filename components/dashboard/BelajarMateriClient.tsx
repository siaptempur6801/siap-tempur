'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Bookmark, Dumbbell, FileText } from 'lucide-react'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import PageHeader from '@/components/ui/PageHeader'

const learningGroups = [
  {
    label: 'TWK',
    items: ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Negara'],
  },
  { label: 'TIU', items: ['Verbal', 'Numerik', 'Figural', 'Logika', 'Analitis'] },
  {
    label: 'TKP',
    items: [
      'Pelayanan Publik',
      'Jejaring Kerja',
      'Sosial Budaya',
      'TIK',
      'Profesionalisme',
      'Anti Radikalisme',
    ],
  },
]

export default function BelajarMateriClient() {
  return (
    <PageAnimateContainer className="space-y-6">
      <PageAnimateItem>
        <PageHeader
          title="Pilih jalur belajar yang sesuai."
          description="Mulai dari kisi-kisi, perkuat topik tertentu, atau ukur kesiapanmu lewat Mini Tryout."
        />
      </PageAnimateItem>

      <PageAnimateItem className="grid gap-4 md:grid-cols-3">
        <Link
          href="/cpns/dashboard/materi"
          className="st-card-md st-focus group p-5 focus-visible:outline-none"
        >
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Lihat Kisi-kisi SKD</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pelajari cakupan TWK, TIU, TKP, jumlah soal, dan nilai ambang.
          </p>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
            Buka kisi-kisi{' '}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/cpns/dashboard/drilling-materi"
          className="st-card-md st-focus group p-5 focus-visible:outline-none"
        >
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Dumbbell className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Mulai Latihan Fokus</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pilih submateri tertentu dan kerjakan latihan yang lebih terarah.
          </p>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
            Pilih materi{' '}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/cpns/dashboard/mini-tryout"
          className="st-card-md st-focus group p-5 focus-visible:outline-none"
        >
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Bookmark className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Uji satu bagian</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Gunakan Mini Tryout untuk mengukur TWK, TIU, atau TKP secara terpisah.
          </p>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
            Buka Mini Tryout{' '}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </PageAnimateItem>

      <PageAnimateItem>
        <section className="st-flat-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Materi mendalam</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Materi per topik sedang disiapkan.
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Sambil menunggu rangkuman dan pembahasan lengkap, gunakan kisi-kisi, Latihan Fokus,
                dan Mini Tryout yang sudah tersedia.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {learningGroups.map((group) => (
              <div key={group.label} className="border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={`${group.label}-${item}`}
                      className="border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500"
                    >
                      {item}
                    </span>
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
