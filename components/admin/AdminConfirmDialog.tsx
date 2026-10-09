'use client'

import { AlertTriangle } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import DialogSurface from '@/components/ui/DialogSurface'

/** Admin presentation over the shared native modal interaction contract. */
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
    const titleId = useId()
    const messageId = useId()
    const detailId = useId()

    return (
        <DialogSurface
            isOpen={open}
            onClose={onCancel}
            role="alertdialog"
            labelledBy={titleId}
            describedBy={detail ? `${messageId} ${detailId}` : messageId}
            className="max-w-md rounded-lg border border-border bg-card text-foreground shadow-lg backdrop:bg-slate-950/40"
        >
            <div className="flex items-start gap-3 p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-muted text-danger">
                    <AlertTriangle size={18} aria-hidden="true"/>
                </span>
                <div className="min-w-0">
                    <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
                    <p id={messageId} className="mt-1.5 text-sm font-medium leading-6 text-muted-foreground">{message}</p>
                    {detail ? (
                        <p id={detailId} className="mt-2 rounded-lg border border-warning-border bg-warning-muted px-3 py-2 text-xs font-medium text-warning">{detail}</p>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">{children}</div>
        </DialogSurface>
    )
}
