import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageAnimateProps {
  children: ReactNode
  className?: string
}

/**
 * Stable learner work surfaces: SSR content remains visible before hydration and
 * under reduced motion. Keep these wrapper contracts for existing consumers.
 */
export function PageAnimateContainer({ children, className }: PageAnimateProps) {
  return <div className={cn('w-full', className)}>{children}</div>
}

export function PageAnimateItem({ children, className }: PageAnimateProps) {
  return <div className={className}>{children}</div>
}
