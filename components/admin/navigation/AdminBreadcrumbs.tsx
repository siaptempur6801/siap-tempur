import { ChevronRight } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

export function AdminBreadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
            {item.href ? (
              <Link
                className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={i === items.length - 1 ? 'page' : undefined}
                className="text-foreground"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
