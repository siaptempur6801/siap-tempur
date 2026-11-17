'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { LOGOUT_SUCCESS_PARAM } from '@/lib/auth-redirect'

export default function LogoutSuccessToast() {
  const searchParams = useSearchParams()
  const logoutStatus = searchParams.get(LOGOUT_SUCCESS_PARAM)
  const passwordStatus = searchParams.get('password')
  const handledStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (logoutStatus !== 'success' && passwordStatus !== 'updated') return
    const statusKey = passwordStatus === 'updated' ? 'password-updated' : 'logout-success'
    if (handledStatusRef.current === statusKey) return
    handledStatusRef.current = statusKey

    if (passwordStatus === 'updated') {
      toast.success('Kata sandi berhasil diperbarui', {
        description: 'Semua sesi telah diakhiri. Masuk kembali dengan kata sandi baru.',
      })
    } else {
      toast.success('Berhasil keluar', {
        description: 'Sesi kamu sudah berakhir dengan aman.',
      })
    }

    const url = new URL(window.location.href)
    url.searchParams.delete(LOGOUT_SUCCESS_PARAM)
    url.searchParams.delete('password')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [logoutStatus, passwordStatus])

  return null
}
