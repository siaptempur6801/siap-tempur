import * as React from 'react'
import { cn } from '@/lib/utils'

function Table({
  className,
  containerProps,
  ...props
}: React.ComponentProps<'table'> & { containerProps?: React.ComponentProps<'div'> }) {
  return (
    <div
      {...containerProps}
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

export { Table }
