import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'binder' | 'sketch'
  rotate?: number
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'standard', rotate = 0, interactive = false, ...props }, ref) => {
    const variants = {
      standard: 'bg-background border-2 border-gray-900 st-shadow-md',
      binder: 'bg-amber-50 border-4 border-blue-600 st-shadow-md',
      sketch: 'bg-white border-2 border-gray-900 st-shadow-lg',
    }

    return (
      <div
        ref={ref}
        style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        className={cn(
          'rounded-xl transition-all duration-300',
          variants[variant],
          interactive && 'hover:st-shadow-lg hover:-translate-y-1',
          className,
        )}
        {...props}
      />
    )
  },
)

Card.displayName = 'Card'

export { Card }
