import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'yellow' | 'blue' | 'pink' | 'green' | 'white' | 'red' | 'neutral' | 'orange' | 'violet'
  appearance?: 'brand' | 'admin'
  rotate?: number
  animated?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = 'yellow', rotate = 0, animated = false, appearance = 'brand', ...props },
    ref,
  ) => {
    const variants = {
      yellow: 'bg-yellow-200 border-gray-800',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      pink: 'bg-brand-peach-100 text-brand-peach-800 border-brand-peach-100',
      green: 'bg-green-200 border-gray-800',
      white: 'bg-white border-gray-800',
      red: 'bg-red-600 text-white border-red-700 shadow-lg',
      neutral: 'bg-white border-gray-800',
      orange: 'bg-yellow-200 border-gray-800',
      violet: 'bg-blue-100 text-blue-700 border-blue-200',
    }

    const adminVariants = {
      neutral: 'border-border bg-muted text-muted-foreground',
      white: 'border-border bg-card text-foreground',
      blue: 'border-info-border bg-info-muted text-info',
      pink: 'border-info-border bg-info-muted text-info',
      violet: 'border-info-border bg-info-muted text-info',
      green: 'border-success-border bg-success-muted text-success',
      yellow: 'border-warning-border bg-warning-muted text-warning',
      orange: 'border-warning-border bg-warning-muted text-warning',
      red: 'border-danger-border bg-danger-muted text-danger',
    }

    return (
      <span
        ref={ref}
        style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        className={cn(
          appearance === 'admin'
            ? 'admin-badge inline-flex min-h-6 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-4'
            : 'inline-flex items-center gap-2 px-4 py-1.5 font-display text-lg font-bold border-2 rounded-sm st-shadow-sm',
          animated && 'animate-pulse',
          appearance === 'admin' ? adminVariants[variant] : variants[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

Badge.displayName = 'Badge'

export { Badge }
