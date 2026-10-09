'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
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
    role = 'dialog', className, children, dialogRef, keepMounted = false, returnFocusRef,
}: {
    isOpen: boolean
    onClose: () => void
    labelledBy: string
    describedBy?: string
    dismissible?: boolean
    role?: 'dialog' | 'alertdialog'
    className?: string
    children: ReactNode
    /** Domain adapters may inspect dirty/pending form markers. */
    dialogRef?: RefObject<HTMLDialogElement | null>
    /** Preserve adapters whose children initialize before the modal opens. */
    keepMounted?: boolean
    /** Surviving trigger when an opening disclosure removes the clicked item. */
    returnFocusRef?: RefObject<HTMLElement | null>
}) {
    const internalRef = useRef<HTMLDialogElement>(null)
    const ref = dialogRef ?? internalRef

    useEffect(() => {
        const dialog = ref.current
        if (!isOpen || !dialog) return
        const doc = dialog.ownerDocument
        const trigger = returnFocusRef?.current ?? (doc.activeElement instanceof HTMLElement ? doc.activeElement : null)
        dialog.showModal()
        const unlock = lockScroll(doc)
        dialog.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)')?.focus()
        return () => {
            dialog.close()
            unlock()
            // React may remove a conditional dialog before native close restores focus.
            if (trigger?.isConnected) trigger.focus({ preventScroll: true })
        }
    }, [isOpen, ref, returnFocusRef])

    return (
        <dialog
            ref={ref}
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            tabIndex={-1}
            onKeyDown={(event) => {
                if (event.key !== 'Tab' || event.defaultPrevented) return
                const dialog = event.currentTarget
                if (event.target instanceof Element && event.target.closest('dialog') !== dialog) return
                const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]',
                )).filter((element) => element.closest('dialog') === dialog && element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') &&
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
                event.stopPropagation()
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
            {isOpen || keepMounted ? children : null}
        </dialog>
    )
}
