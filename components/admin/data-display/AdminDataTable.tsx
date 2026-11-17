import { Skeleton } from '@/components/ui/LoadingState'
import { Table } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ComponentProps,ReactNode } from 'react'
import { AdminEmptyState } from '../AdminUi'
import { AdminErrorState } from '../feedback/AdminErrorState'

/** Server-rendered table; pagination and domain rows stay with their owners. */
export function AdminDataTable({
  children,
  className,
  caption = 'Data workspace',
  loading,
  empty,
  error,
  pagination,
  ...props
}: ComponentProps<'table'> & {
  caption?: string
  loading?: boolean
  empty?: { title: string; description: string; action?: ReactNode }
  error?: { noun: string; retryHref: string }
  pagination?: ReactNode
}) {
  if (error) return <AdminErrorState {...error} />
  if (loading)
    return (
      <div role="status" aria-label={`Memuat ${caption}`} className="flex flex-col gap-4 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  if (empty)
    return (
      <>
        <AdminEmptyState {...empty} />
        {pagination}
      </>
    )
  return (
    <>
      <Table
        containerProps={{ role: 'region', 'aria-label': caption, tabIndex: 0 }}
        {...props}
        className={cn('admin-data-table w-full text-left text-sm', className)}
      >
        <caption className="sr-only">{caption}</caption>
        {children}
      </Table>
      {pagination}
    </>
  )
}
