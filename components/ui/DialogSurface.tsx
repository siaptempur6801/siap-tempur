'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Nested dialogs share the scroll lock, and restore the caller's exact style.
const scrollLocks = new WeakMap<Document, { count: number; value: string; priority: string }>()

function lockScroll(doc: Document) {
    const style = doc.body.style
    const lock = scrollLocks.get(doc) ?? {
        count: 0,
        value: style.getPropertyValue('overflow'),
        priority: style.getPropertyPriority('overflow'),
    }
    lock.count += 1
    scrollLocks.set(doc, lock)
    style.setProperty('overflow', 'hidden')
    return () => {
        lock.count -= 1
        if (lock.count !== 0) return
        if (lock.value) style.setProperty('overflow', lock.value, lock.priority)
        else style.removeProperty('overflow')
        scrollLocks.delete(doc)
    }
}

/** Native modal focus containment, background inertness and trigger restoration. */
export default function DialogSurface({
    isOpen, onClose, labelledBy, describedBy, dismissible = true,
    role = 'dialog', className, children,
}: {
    isOpen: boolean
    onClose: () => void
    labelledBy: string
    describedBy?: string
    dismissible?: boolean
    role?: 'dialog' | 'alertdialog'
    className?: string
    children: ReactNode
}) {
    const ref = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const dialog = ref.current
        if (!isOpen || !dialog) return
        dialog.showModal()
        const unlock = lockScroll(dialog.ownerDocument)
        dialog.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)')?.focus()
        return () => {
            dialog.close()
            unlock()
        }
    }, [isOpen])

    return (
        <dialog
            ref={ref}
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            tabIndex={-1}
            onKeyDown={(event) => {
                if (event.key !== 'Tab') return
                const dialog = event.currentTarget
                const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]',
                )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') &&
                    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
                const first = controls[0]
                const last = controls.at(-1)
                const active = dialog.ownerDocument.activeElement
                if (!first || !last) {
                    event.preventDefault()
                    dialog.focus()
                } else if (event.shiftKey && (active === first || active === dialog)) {
                    event.preventDefault()
                    last.focus()
                } else if (!event.shiftKey && (active === last || active === dialog)) {
                    event.preventDefault()
                    first.focus()
                }
            }}
            onCancel={(event) => {
                event.preventDefault()
                if (dismissible) onClose()
            }}
            onClick={(event) => {
                if (!dismissible || event.target !== event.currentTarget) return
                const bounds = event.currentTarget.getBoundingClientRect()
                if (event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
            }}
            className={cn(
                'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm',
                className,
            )}
        >
            {isOpen ? children : null}
        </dialog>
    )
}
