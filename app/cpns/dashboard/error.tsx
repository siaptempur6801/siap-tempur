'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div
      data-experience-mode="learning"
      data-program="cpns"
      className="st-product flex min-h-[60vh] w-full items-center justify-center py-10 font-body"
    >
      <section
        className="st-card-md w-full max-w-xl bg-danger-muted p-6 text-center sm:p-8"
        role="alert"
      >
        <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-danger-border bg-card text-danger">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-medium text-danger">Ada gangguan</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Dashboard belum bisa dimuat.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Coba muat ulang bagian ini. Jika masalah masih muncul, kembali beberapa saat lagi tanpa
          perlu mengulang aktivitas yang sudah tersimpan.
        </p>
        <Button type="button" className="mt-5" onClick={() => reset()}>
          <RotateCcw size={16} aria-hidden="true" /> Coba lagi
        </Button>
      </section>
    </div>
  )
}
