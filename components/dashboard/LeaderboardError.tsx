'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function LeaderboardError() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <section
      data-experience-mode="learning"
      data-program="cpns"
      className="st-product st-card-md bg-danger-muted p-6"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Ranking belum bisa dimuat.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba muat ulang halaman. Hasil tryout dan progres belajarmu tetap tersimpan.
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={isPending}
            aria-busy={isPending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RotateCcw className="size-4" aria-hidden="true" />{' '}
            {isPending ? 'Memuat ulang…' : 'Coba lagi'}
          </Button>
        </div>
      </div>
    </section>
  )
}
