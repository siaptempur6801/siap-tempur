'use client'

import { useEffect, useRef } from 'react'

/** Clear child selects when a parent filter changes, before the GET form submits. */
export default function AdminDependentFilterReset() {
  const markerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const formElement = markerRef.current?.closest('form')
    if (!formElement) return

    const clearChildren = (form: HTMLFormElement) => (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLSelectElement)) return
      const fields = target.dataset.clearFields?.split(',').filter(Boolean) ?? []
      for (const name of fields) {
        const child = form.elements.namedItem(name)
        if (child instanceof HTMLSelectElement) child.value = ''
      }
    }

    const handleChange = clearChildren(formElement)
    formElement.addEventListener('change', handleChange)
    return () => formElement.removeEventListener('change', handleChange)
  }, [])

  return <span ref={markerRef} className="hidden" aria-hidden="true" />
}
