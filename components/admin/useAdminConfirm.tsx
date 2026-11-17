'use client'

import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog'
import { adminDangerButtonClass,adminPrimaryButtonClass,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { useCallback,useRef,useState,type ReactElement } from 'react'

export type AdminConfirmOptions = {
    title?: string
    /** Kalimat konsekuensi: apa yang akan terjadi, bukan sekadar "yakin?". */
    message: string
    /** Rincian tambahan, mis. sifat ireversibel. */
    detail?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Aksi yang menghilangkan pekerjaan pengguna sebaiknya memakai tombol merah. */
    danger?: boolean
}

type PendingConfirm = AdminConfirmOptions & { resolve: (confirmed: boolean) => void }

/**
 * Konfirmasi imperatif bergaya dialog admin (bukan `window.confirm`).
 *
 * Dipakai alur yang tidak mengirim form, mis. "perubahan belum disimpan —
 * tinggalkan halaman?" atau "muat ulang akan mengganti input?". Pemanggil
 * merender `dialog` di dalam komponennya lalu `await confirm({...})`.
 *
 * Catatan penting untuk dialog yang hidup di dalam modal `<dialog>`: render
 * `dialog` di dalam elemen `<dialog>` modal, karena overlay `fixed` di luar
 * native top layer akan tertutup oleh modal tersebut.
 */
export function useAdminConfirm() {
    const [pending, setPending] = useState<PendingConfirm | null>(null)
    const restoreFocusRef = useRef<HTMLElement | null>(null)

    const confirm = useCallback((options: AdminConfirmOptions) => {
        restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        return new Promise<boolean>((resolve) => setPending({ ...options, resolve }))
    }, [])

    const finish = useCallback((request: PendingConfirm, confirmed: boolean) => {
        setPending(null)
        request.resolve(confirmed)
        const target = restoreFocusRef.current
        restoreFocusRef.current = null
        if (target?.isConnected) target.focus()
    }, [])

    const dialog: ReactElement | null = pending ? (
        <AdminConfirmDialog
            open
            title={pending.title ?? 'Konfirmasi tindakan'}
            message={pending.message}
            detail={pending.detail}
            onCancel={() => finish(pending, false)}
        >
            <button type="button" onClick={() => finish(pending, false)} className={adminSecondaryButtonClass}>
                {pending.cancelLabel ?? 'Batal'}
            </button>
            <button type="button" data-autofocus onClick={() => finish(pending, true)} className={pending.danger ? adminDangerButtonClass : adminPrimaryButtonClass}>
                {pending.confirmLabel ?? 'Ya, lanjutkan'}
            </button>
        </AdminConfirmDialog>
    ) : null

    return { confirm, dialog }
}
