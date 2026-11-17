'use client'
import { useFormStatus } from 'react-dom'
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from './AdminUi'
export default function AdminSubmitButton({
  children,
  pendingLabel = 'Menyimpan...',
  disabled = false,
  variant = 'primary',
}: {
  children: React.ReactNode
  pendingLabel?: string
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}) {
  const { pending } = useFormStatus()
  return (
    <button
      className={variant === 'primary' ? adminPrimaryButtonClass : adminSecondaryButtonClass}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
