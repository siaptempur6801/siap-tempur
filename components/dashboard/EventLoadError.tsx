'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

export default function EventLoadError() {
  const router = useRouter()

  return (
    <section className="st-card-md w-full max-w-xl p-6 text-left" role="alert">
      <PageHeader
        title="Event belum bisa dimuat"
        description="Coba muat ulang halaman beberapa saat lagi."
      />
      <Button type="button" variant="outline" className="mt-5" onClick={() => router.refresh()}>
        <RefreshCw size={16} aria-hidden="true" />
        Coba lagi
      </Button>
    </section>
  )
}
