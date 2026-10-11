import Link from 'next/link'
import { adminHref } from '@/lib/admin-routes'
import type { ComponentProps } from 'react'

/** One URL boundary for admin links, including contextual/compatibility destinations. */
export default function AdminLink({
  href,
  prefetch = false,
  ...props
}: ComponentProps<typeof Link>) {
  // Dynamic workspaces verify permissions and query live data. Prefetching every
  // visible row/sidebar destination causes unnecessary authenticated requests.
  return (
    <Link {...props} prefetch={prefetch} href={typeof href === 'string' ? adminHref(href) : href} />
  )
}
