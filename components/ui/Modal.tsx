'use client'

import { useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import DialogSurface from './DialogSurface'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
    dismissible?: boolean
}

export default function Modal({ isOpen, onClose, title, children, className, dismissible = true }: ModalProps) {
    const titleId = useId()

    return (
        <DialogSurface isOpen={isOpen} onClose={onClose} labelledBy={titleId} dismissible={dismissible}
            className={cn('border border-slate-200', className)}>
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                <h2 id={titleId} className="text-lg font-bold text-slate-900">{title}</h2>
                <button type="button" onClick={onClose} disabled={!dismissible}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
                    aria-label="Tutup dialog">
                    <X size={20} aria-hidden="true" />
                </button>
            </header>
            <div className="p-4 sm:p-6">{children}</div>
        </DialogSurface>
    )
}
