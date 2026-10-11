'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: string
  exact?: boolean
  active?: boolean
  variant?: 'brand' | 'soft'
}

function matchesPath(pathname: string, href: string, exact = false) {
  const pathOnly = href.split('#')[0] || href
  if (exact || pathOnly.endsWith('/dashboard')) return pathname === pathOnly
  return pathname.startsWith(pathOnly)
}

export function NavItem({
  href,
  icon,
  label,
  badge,
  exact = false,
  variant = 'brand',
  active,
}: NavItemProps) {
  const pathname = usePathname()
  const isActive = active ?? matchesPath(pathname, href, exact)
  const soft = variant === 'soft'

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex min-h-10 items-center justify-between px-3 py-2 text-[13px] font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
        soft
          ? isActive
            ? 'rounded-xl border border-indigo-200/80 bg-indigo-50/80 text-indigo-700 shadow-2xs'
            : 'rounded-xl border border-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-950'
          : isActive
            ? 'border-2 border-slate-900 bg-blue-600 text-white st-shadow-sm'
            : 'border-2 border-transparent text-slate-700 hover:border-slate-900 hover:bg-white hover:text-slate-950',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center transition-all',
            soft
              ? isActive
                ? 'h-7 w-7 rounded-lg bg-indigo-600 text-white shadow-2xs'
                : 'h-7 w-7 rounded-lg bg-slate-100/80 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
              : isActive
                ? 'h-7 w-7 border-2 border-white/70 bg-white text-blue-700'
                : 'h-7 w-7 border-2 border-transparent text-slate-500 group-hover:border-slate-900 group-hover:bg-yellow-100 group-hover:text-slate-900',
          )}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      {badge && (
        <span
          className={cn(
            'ml-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
            soft
              ? isActive
                ? 'rounded-full bg-white/90 text-indigo-700 shadow-2xs'
                : 'rounded-full bg-slate-100 text-slate-600'
              : isActive
                ? 'border border-white/70 bg-white text-blue-700'
                : 'border border-slate-900 bg-yellow-100 text-slate-900',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

export function MobileNavItem({
  href,
  icon,
  label,
  exact = false,
  variant = 'brand',
  active,
}: NavItemProps) {
  const pathname = usePathname()
  const isActive = active ?? matchesPath(pathname, href, exact)
  const soft = variant === 'soft'

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-inset',
        soft
          ? isActive
            ? 'text-indigo-600 rounded-xl'
            : 'text-slate-500 hover:text-slate-900'
          : isActive
            ? 'text-blue-700'
            : 'text-slate-500 hover:text-slate-900',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-9 items-center justify-center transition-all',
          soft
            ? isActive
              ? 'rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60 shadow-2xs'
              : 'rounded-xl bg-transparent text-slate-500'
            : isActive
              ? 'border-2 border-slate-900 bg-yellow-100 text-blue-700 st-shadow-sm'
              : 'border-2 border-transparent text-slate-500',
        )}
      >
        {icon}
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  )
}
