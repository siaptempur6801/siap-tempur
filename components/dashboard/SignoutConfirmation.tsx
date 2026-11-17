'use client'

import { useId, useRef, useState, type RefObject } from 'react'
import { LogOut } from 'lucide-react'
import DialogSurface from '@/components/ui/DialogSurface'
import { Button } from '@/components/ui/Button'

/** Shared presentation; the supplied server action retains CSRF and redirect policy. */
export default function SignoutConfirmation({
  isOpen,
  onClose,
  signoutAction,
  redirectTo,
  program = 'cpns',
  returnFocusRef,
}: {
  isOpen: boolean
  onClose: () => void
  signoutAction: (redirectTo?: string) => Promise<{ success: boolean }>
  redirectTo: string
  program?: 'cpns' | 'tka'
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const titleId = useId()
  const descriptionId = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const committing = useRef(false)

  function close() {
    if (committing.current) return
    setError('')
    onClose()
  }

  async function signout() {
    if (committing.current) return
    committing.current = true
    setPending(true)
    setError('')
    try {
      const result = await signoutAction(redirectTo)
      if (!result?.success) setError('Belum bisa keluar. Coba lagi.')
    } catch (failure) {
      // Keep Next's redirect/server-error control flow with its existing boundary.
      if (failure && typeof failure === 'object' && 'digest' in failure) throw failure
      setError('Belum bisa keluar. Periksa koneksi lalu coba lagi.')
    } finally {
      committing.current = false
      setPending(false)
    }
  }

  return (
    <DialogSurface
      isOpen={isOpen}
      onClose={close}
      dismissible={!pending}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
      returnFocusRef={returnFocusRef}
      className="max-w-sm border border-border bg-white p-6"
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
        <LogOut size={22} aria-hidden="true" />
      </div>
      <h2 id={titleId} className="text-xl font-semibold text-foreground">
        {program === 'tka' ? 'Yakin ingin keluar?' : 'Yakin mau keluar?'}
      </h2>
      <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {program === 'tka'
          ? 'Kamu akan keluar dari sesi TKA. Progres yang sudah tersimpan tetap tersedia di akunmu.'
          : 'Kamu bisa masuk kembali untuk melanjutkan belajar. Progres yang sudah tersimpan tetap tersedia di akunmu.'}
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" data-autofocus disabled={pending} onClick={close}>
          Batal
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          aria-busy={pending}
          onClick={signout}
        >
          {pending ? 'Keluar...' : 'Ya, Keluar'}
        </Button>
      </div>
    </DialogSurface>
  )
}
