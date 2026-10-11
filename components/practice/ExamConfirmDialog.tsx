'use client'

import { useId, type ReactNode } from 'react'
import DialogSurface from '@/components/ui/DialogSurface'

/** Presentation only: callers retain save barriers, timers and completion locks. */
export default function ExamConfirmDialog({
  title,
  description,
  pending,
  onCancel,
  children,
  actions,
  actionLayout = 'split',
}: {
  title: string
  description: ReactNode
  pending: boolean
  onCancel: () => void
  children?: ReactNode
  actions: ReactNode
  actionLayout?: 'single' | 'split'
}) {
  const titleId = useId()
  const descriptionId = useId()
  return (
    <DialogSurface
      isOpen
      onClose={onCancel}
      dismissible={!pending}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
      className="max-w-md border border-border bg-white"
    >
      <div className="p-5 sm:p-6">
        <h2 id={titleId} className="text-xl font-semibold text-foreground">
          {title}
        </h2>
        {children}
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div
          className={`mt-6 grid gap-3 ${actionLayout === 'single' ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          {actions}
        </div>
      </div>
    </DialogSurface>
  )
}
