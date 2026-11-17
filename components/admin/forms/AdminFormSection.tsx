import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AdminFormSection({
  id,
  title,
  description,
  children,
  columns = 2,
  showHeading = true,
  showDivider = true,
}: {
  id?: string
  title: string
  description?: string
  children: ReactNode
  columns?: 1 | 2 | 3
  showHeading?: boolean
  showDivider?: boolean
}) {
  const columnClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
  }[columns]

  return (
    <fieldset
      id={id}
      className={cn('min-w-0', showDivider ? 'border-b border-border pb-6 last:border-0' : 'pb-2')}
    >
      <legend className={showHeading ? 'mb-1 text-lg font-semibold text-foreground' : 'sr-only'}>
        {title}
      </legend>
      {showHeading && description && (
        <p className="mb-4 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
      )}
      <div className={cn('grid gap-4', columnClass)}>{children}</div>
    </fieldset>
  )
}
