'use client'

import { AlertTriangle } from 'lucide-react'
import { useEffect,useId,useRef,type KeyboardEvent,type ReactNode } from 'react'

/**
 * Kerangka dialog konfirmasi admin: overlay, `role="alertdialog"`, focus trap,
 * Escape, dan slot tombol.
 *
 * Diekstrak dari `ConfirmSubmit` (S10) supaya alur yang TIDAK mengirim form —
 * mis. "perubahan belum disimpan, tinggalkan halaman?" — memakai dialog yang
 * sama, bukan `window.confirm`. `ConfirmSubmit` tetap memiliki tombol
 * `requestSubmit()`-nya sendiri lewat slot `children`.
 *
 * Kontrak fokus: elemen pertama dengan `data-autofocus` menerima fokus saat
 * dialog dibuka; bila tidak ada, tombol pertama. Pemulihan fokus ke pemicu
 * adalah tanggung jawab pemanggil (`ConfirmSubmit` menyimpan referensinya;
 * `useAdminConfirm` mengembalikannya ke elemen yang aktif saat dipanggil).
 */
export default function AdminConfirmDialog({
    open,
    title,
    message,
    detail,
    onCancel,
    children,
}: {
    open: boolean
    title: string
    message: string
    detail?: string
    onCancel: () => void
    children: ReactNode
}) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const titleId = useId()

    useEffect(() => {
        if (!open) return
        const panel = dialogRef.current
        const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>('button')
        target?.focus()
    }, [open])

    // Trap Tab di dalam dialog: `role="alertdialog"` tanpa trap membuat fokus
    // melompat ke halaman di belakang overlay.
    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
            return
        }
        if (event.key !== 'Tab' || !dialogRef.current) return
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (event.shiftKey && active === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && active === last) {
            event.preventDefault()
            first.focus()
        }
    }

    if (!open) return null

    return (
        <div
            role="presentation"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"
            onClick={(event) => {
                if (event.target === event.currentTarget) onCancel()
            }}
        >
            <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg"
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-start gap-3 p-5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-muted text-danger">
                        <AlertTriangle size={18}/>
                    </span>
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
                        <p className="mt-1.5 text-sm font-medium leading-6 text-muted-foreground">{message}</p>
                        {detail ? (
                            <p className="mt-2 rounded-lg border border-warning-border bg-warning-muted px-3 py-2 text-xs font-medium text-warning">{detail}</p>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">{children}</div>
            </div>
        </div>
    )
}
