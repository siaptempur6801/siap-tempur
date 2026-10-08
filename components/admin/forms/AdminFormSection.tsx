import type { ReactNode } from 'react'

export function AdminFormSection({
  id,
  title,
  description,
  children
}: {
  id?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <fieldset id={id} className="min-w-0 border-b border-border pb-6 last:border-0">
      <legend className="mb-1 text-lg font-semibold text-foreground">{title}</legend>
      {description && <p className="mb-4 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
