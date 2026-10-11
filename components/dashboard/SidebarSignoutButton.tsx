'use client'

import { useState } from 'react'
import SignoutConfirmation from './SignoutConfirmation'
import { LogOut } from 'lucide-react'

interface SidebarSignoutButtonProps {
  signoutAction: (redirectTo?: string) => Promise<{ success: boolean }>
  redirectTo?: string
  compact?: boolean
  variant?: 'brand' | 'soft'
  program?: 'cpns' | 'tka'
}

export default function SidebarSignoutButton({
  signoutAction,
  redirectTo = '/',
  compact = false,
  variant = 'brand',
  program = 'cpns',
}: SidebarSignoutButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const soft = variant === 'soft'

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        aria-label={compact ? 'Keluar' : undefined}
        className={
          compact
            ? soft
              ? 'st-focus flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-danger-muted hover:text-danger transition'
              : 'st-focus flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100'
            : soft
              ? 'st-focus inline-flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-danger-muted hover:text-danger transition'
              : 'flex min-h-9 w-full items-center gap-2 rounded-md border-2 border-transparent px-3 py-1.5 font-display text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm'
        }
      >
        <LogOut size={soft ? 14 : 16} aria-hidden="true" />
        {compact ? null : 'Keluar'}
      </button>

      <SignoutConfirmation
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        signoutAction={signoutAction}
        redirectTo={redirectTo}
        program={program}
      />
    </>
  )
}
