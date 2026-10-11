'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { adminHref } from '@/lib/admin-routes'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { adminPrimaryButtonClass } from '@/components/admin/AdminUi'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

/**
 * Form draft Review Queue dengan penjaga "perubahan belum tersimpan".
 *
 * Sebelumnya form create/edit tidak punya penjaga apa pun: menutup tab atau
 * berpindah halaman setelah menulis soal membuang pekerjaan tanpa peringatan.
 * Saat ada perubahan, `beforeunload` dipasang dan `data-dirty` ditandai sehingga
 * dialog konfirmasi lain (mis. `AdminModal`) dapat memeriksanya.
 *
 * Form tetap di-render server (children dikirim sebagai elemen); komponen ini
 * hanya membungkusnya agar bisa memasang handler.
 */
export default function ReviewDraftForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>
  className?: string
  children: ReactNode
}) {
  const [dirty, setDirty] = useState(false)
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const guardReviewSubmission = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLFormElement) || !target.hasAttribute('data-review-submit')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      toast.error('Simpan perubahan draf terlebih dahulu.', {
        description: 'Pengajuan review hanya memakai versi soal yang sudah tersimpan.',
      })
    }
    document.addEventListener('submit', guardReviewSubmission, true)
    return () => document.removeEventListener('submit', guardReviewSubmission, true)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return

    async function guardNavigation(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest<HTMLAnchorElement>('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return

      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return

      event.preventDefault()
      const confirmed = await confirm({
        title: 'Tinggalkan form soal?',
        message: 'Ada perubahan draf yang belum disimpan.',
        detail: 'Perubahan akan hilang jika Anda berpindah ke halaman lain.',
        confirmLabel: 'Tinggalkan form',
        danger: true,
      })
      if (confirmed)
        router.push(adminHref(`${destination.pathname}${destination.search}${destination.hash}`))
    }

    document.addEventListener('click', guardNavigation, true)
    return () => document.removeEventListener('click', guardNavigation, true)
  }, [confirm, dirty, router])

  return (
    <>
      <form
        data-admin-form
        action={action}
        className={className}
        data-dirty={dirty || undefined}
        onInput={() => setDirty(true)}
        onSubmit={(event) => {
          // Jangan menghilangkan penanda perubahan bila validasi
          // contenteditable menghentikan submit di fase DOM.
          if (!event.defaultPrevented) setDirty(false)
        }}
      >
        {dirty ? (
          <div
            role="status"
            className="sticky top-20 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning-muted/95 px-4 py-3 shadow-md backdrop-blur"
          >
            <p className="text-sm font-semibold text-warning">Perubahan belum disimpan</p>
            <button type="submit" className={adminPrimaryButtonClass}>
              <Save size={15} />
              Simpan perubahan
            </button>
          </div>
        ) : null}
        {children}
      </form>
      {dialog}
    </>
  )
}
