import Link from '@/components/admin/navigation/AdminLink'
import { cn } from '@/lib/utils'

/** Navigation links deliberately keep URL state and native browser history. */
export function AdminTabs({
  tabs,
  active,
  label = 'Bagian workspace',
  className,
}: {
  tabs: { id: string; label: string; href: string }[]
  active: string
  label?: string
  className?: string
}) {
  return (
    <nav
      aria-label={label}
      className={cn('flex min-h-10 gap-1 overflow-x-auto border-b border-border', className)}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring ${active === tab.id ? 'border-primary text-info' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
