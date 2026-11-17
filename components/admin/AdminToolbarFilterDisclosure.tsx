'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export default function AdminToolbarFilterDisclosure({
  activeFilterCount,
  summaryClassName,
  children,
}: {
  activeFilterCount: number
  summaryClassName: string
  children: ReactNode
}) {
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !isExpanded) return
    event.preventDefault()
    setIsExpanded(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="admin-toolbar-filter-disclosure" data-expanded={isExpanded}>
      <button
        ref={triggerRef}
        type="button"
        className={`${summaryClassName} admin-toolbar-filter-summary`}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <span>Filter</span>
        {activeFilterCount ? <span>{activeFilterCount} aktif</span> : null}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div
        id={panelId}
        className="admin-toolbar-filter-panel"
        data-expanded={isExpanded}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  )
}
