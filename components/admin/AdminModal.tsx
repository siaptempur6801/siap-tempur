'use client'

import { adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import DialogSurface from '@/components/ui/DialogSurface'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { cn } from '@/lib/utils'
import { Plus,X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect,useId,useRef,useState,type ReactNode } from 'react'

const triggerVariants = { primary: adminPrimaryButtonClass, secondary: adminSecondaryButtonClass } as const

const sizes = {
    md: 'max-w-xl',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    wide: 'max-w-2xl',
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
                    className={cn(triggerVariants[triggerVariant])}
                >
                    {triggerIcon ?? <Plus size={16} aria-hidden="true"/>} {triggerLabel}
                </button>
            ) : null}

            <DialogSurface
                dialogRef={dialogRef}
                keepMounted
                isOpen={open}
                onClose={closeModal}
                labelledBy={titleId}
                describedBy={description ? descriptionId : undefined}
                className={cn(
                    'max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px]',
                    sizes[size],
                )}
            >
                <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col">
                    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                        <div className="min-w-0">
                            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                            {description ? <p id={descriptionId} className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{description}</p> : null}
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            aria-label="Tutup modal"
                            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <X size={16} aria-hidden="true"/>
                        </button>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                        {children}
                    </div>
                </div>
                {dialog}
            </DialogSurface>
        </>
    )
}
