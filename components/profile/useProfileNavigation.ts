'use client'

import { usePathname } from 'next/navigation'

export function useProfileNavigation() {
  const pathname = usePathname()
  const match = pathname.match(/^\/tka\/(sd|smp|sma)(?:\/|$)/)
  const base = match ? `/tka/${match[1]}` : '/cpns/dashboard'
  return {
    isTka: Boolean(match),
    level: match?.[1].toUpperCase(),
    profilePath: `${base}/profile`,
    purchasePath: match ? `${base}/beli-token` : `${base}/beli-paket`,
    accessPath: match ? `${base}/pass` : `${base}/dashboard/pass`,
    landingPath: match ? '/tka' : '/cpns',
  }
}
