import { CircleAlert } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import type { ReactNode } from 'react'
import { adminSecondaryButtonClass } from '../AdminUi'

export function AdminErrorState({
  noun,
  retryHref,
  action
}: {
  noun: string
  retryHref?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-muted p-5">
      <p role="alert" className="flex items-center gap-2 text-sm font-medium text-danger">
        <CircleAlert size={16} aria-hidden="true" />
        Gagal memuat {noun}.
      </p>
      {action ||
        (retryHref && (
          <Link className={adminSecondaryButtonClass} href={retryHref}>
            Coba Lagi
          </Link>
        ))}
    </div>
  )
}
