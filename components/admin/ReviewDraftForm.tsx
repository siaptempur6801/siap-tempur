'use client'

import { useEffect, useState, type ReactNode } from 'react'

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

    useEffect(() => {
        if (!dirty) return
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirty])

    return (
        <form
            action={action}
            className={className}
            data-dirty={dirty || undefined}
            onInput={() => setDirty(true)}
            onSubmit={() => setDirty(false)}
        >
            {children}
        </form>
    )
}
