import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Compact learning header; admin retains its operational PageHeader adapter. */
export default function PageHeader({
  title,
  description,
  eyebrow,
  aside,
  className,
}: {
  title: string
  description?: ReactNode
  eyebrow?: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {aside}
    </header>
  )
}
