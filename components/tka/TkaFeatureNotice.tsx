import Link from 'next/link'
import { ArrowRight, BookOpenCheck } from 'lucide-react'
import type { TkaLevel } from '@/src/tka/context'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

export default function TkaFeatureNotice({
  level,
  title,
  description,
  actionHref,
  actionLabel,
  noticeTitle = 'Konten jenjang ini sedang disiapkan',
  noticeDescription = `Gunakan riwayat atau katalog evaluasi TKA ${level} untuk melanjutkan kegiatan belajar.`,
}: {
  level: TkaLevel
  title: string
  description: string
  actionHref: string
  actionLabel: string
  noticeTitle?: string
  noticeDescription?: string
}) {
  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <PageHeader
          eyebrow={<>TKA {level} · Pusat Belajar</>}
          title={title}
          description={description}
        />
        <section
          className="st-card-md flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          role="status"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <BookOpenCheck size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">{noticeTitle}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {noticeDescription}
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>
    </main>
  )
}
