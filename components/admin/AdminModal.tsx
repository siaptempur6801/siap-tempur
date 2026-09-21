'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'

const triggerVariants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-900/5',
} as const

const sizes = {
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    wide: 'max-w-6xl',
} as const

type AdminModalProps = {
    title: string
    description?: string
    triggerLabel?: string
    triggerVariant?: keyof typeof triggerVariants
    triggerIcon?: ReactNode
    children: ReactNode
    defaultOpen?: boolean
    closeHref?: string
    confirmUnsaved?: boolean
    size?: keyof typeof sizes
    /**
     * Dipanggil saat trigger diklik, SEBELUM modal terbuka.
     *
     * Dipakai modal yang isinya dimuat malas (mis. katalog Question Bank yang
     * menarik seluruh stimulus satu track):
     * anak modal sudah dirender di server, jadi pemuatan harus dipicu dari sini.
     */
    onOpen?: () => void
}

export default function AdminModal({
    title,
    description,
    triggerLabel,
    triggerVariant = 'primary',
    triggerIcon,
    children,
    defaultOpen = false,
    closeHref,
    size = 'lg',
    confirmUnsaved = false,
    onOpen,
}: AdminModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [open, setOpen] = useState(defaultOpen)
    const router = useRouter()
    const titleId = useId()
    const descriptionId = useId()
    const { confirm, dialog } = useAdminConfirm()

    useEffect(() => {
        setOpen(defaultOpen)
    }, [defaultOpen])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return

        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    /**
     * `onOpen` juga dipanggil untuk modal yang terbuka sejak render pertama
     * (`defaultOpen`) — mis. tautan `?edit=` yang membuka form langsung. Sekali
     * saja; identitas callback boleh berubah tanpa memicu pemuatan ulang.
     */
    const defaultOpenNotified = useRef(false)
    useEffect(() => {
        if (!defaultOpen || defaultOpenNotified.current) return
        defaultOpenNotified.current = true
        onOpen?.()
    }, [defaultOpen, onOpen])

    async function closeModal() {
        if (confirmUnsaved && dialogRef.current?.querySelector('[data-pending="true"]')) return
        if (confirmUnsaved && dialogRef.current?.querySelector('[data-dirty="true"]')) {
            const confirmed = await confirm({
                title: 'Tutup form?',
                message: 'Ada perubahan yang belum disimpan.',
                detail: 'Perubahan yang belum disimpan akan hilang bila form ditutup.',
                confirmLabel: 'Tutup tanpa simpan',
                danger: true,
            })
            if (!confirmed) return
        }
        setOpen(false)
        if (defaultOpen && closeHref) router.replace(closeHref, { scroll: false })
    }

    return (
        <>
            {triggerLabel ? (
                <button
                    type="button"
                    onClick={() => {
                        onOpen?.()
                        setOpen(true)
                    }}
                    className={cn(
                        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
                        triggerVariants[triggerVariant],
                    )}
                >
                    {triggerIcon ?? <Plus size={16} aria-hidden="true"/>} {triggerLabel}
                </button>
            ) : null}

            <dialog
                ref={dialogRef}
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                onCancel={(event) => {
                    event.preventDefault()
                    closeModal()
                }}
                onClick={(event) => {
                    if (event.target === dialogRef.current) closeModal()
                }}
                className={cn(
                    'm-auto w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px]',
                    sizes[size],
                )}
            >
                <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col">
                    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                        <div className="min-w-0">
                            <h2 id={titleId} className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
                            {description ? <p id={descriptionId} className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            aria-label="Tutup modal"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5"
                        >
                            <X size={18}/>
                        </button>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                        {children}
                    </div>
                </div>
                {dialog}
            </dialog>
        </>
    )
}
