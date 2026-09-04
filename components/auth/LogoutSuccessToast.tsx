'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { LOGOUT_SUCCESS_PARAM } from '@/lib/auth-redirect'

export default function LogoutSuccessToast() {
    const searchParams = useSearchParams()
    const logoutStatus = searchParams.get(LOGOUT_SUCCESS_PARAM)

    useEffect(() => {
        if (logoutStatus !== 'success') return

        toast.success('Berhasil keluar', {
            description: 'Sesi kamu sudah berakhir dengan aman.',
        })

        const url = new URL(window.location.href)
        url.searchParams.delete(LOGOUT_SUCCESS_PARAM)
        window.history.replaceState(
            window.history.state,
            '',
            `${url.pathname}${url.search}${url.hash}`,
        )
    }, [logoutStatus])

    return null
}
