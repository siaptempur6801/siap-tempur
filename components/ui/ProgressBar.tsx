import { cn } from '@/lib/utils'

export default function ProgressBar({
  value,
  label,
  size = 'md',
  className,
  indicatorClassName = 'bg-blue-600',
}: {
  value: number
  label: string
  size?: 'sm' | 'md'
  className?: string
  indicatorClassName?: string
}) {
  const boundedValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0

  return (
    <div
      className={cn(
        'overflow-hidden border-2 border-slate-900 bg-slate-100',
        size === 'sm' ? 'h-3' : 'h-4',
        className,
      )}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(boundedValue)}
    >
      <div
        className={cn('h-full transition-[width] duration-500 ease-out', indicatorClassName)}
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  )
}
