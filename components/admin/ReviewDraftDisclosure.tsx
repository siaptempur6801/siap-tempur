'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export default function ReviewDraftDisclosure({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === `#${id}` && detailsRef.current) {
        detailsRef.current.open = true
      }
    }

    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [id])

  return (
    <details
      ref={detailsRef}
      id={id}
      className={`scroll-mt-20 rounded-lg border border-warning-border bg-card ${className ?? 'xl:col-start-1'}`}
    >
      <summary className="cursor-pointer list-none border-b border-border p-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{description}</p>
        </div>
      </summary>
      {children}
    </details>
  )
}
