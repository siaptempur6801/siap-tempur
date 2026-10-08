import Link from '@/components/admin/navigation/AdminLink'
import type { ReactNode } from 'react'
import { adminSecondaryButtonClass } from '../AdminUi'

export function AdminFormActions({
  cancelHref,
  children
}: {
  cancelHref: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <Link className={adminSecondaryButtonClass} href={cancelHref}>
        Batal
      </Link>
      {children}
    </div>
  )
}
