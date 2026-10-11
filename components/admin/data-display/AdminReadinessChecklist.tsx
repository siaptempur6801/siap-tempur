import { CheckCircle2, CircleAlert, Info } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

export type ReadinessItem = {
  label: string
  ready: boolean
  detail?: string
  href?: string
  informational?: boolean
}
export function AdminReadinessChecklist({ items }: { items: ReadinessItem[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3 py-3">
          {item.informational ? (
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-info" />
          ) : item.ready ? (
            <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
          ) : (
            <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">{item.label}</span>
            <span className="sr-only">
              — {item.informational ? 'Informasi tambahan' : item.ready ? 'Siap' : 'Belum siap'}
            </span>
            {item.detail && (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            )}
            {item.href && (
              <Link
                className="text-xs font-medium text-info underline"
                href={item.href}
                aria-label={`Lihat detail: ${item.label}`}
              >
                Lihat Detail
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
