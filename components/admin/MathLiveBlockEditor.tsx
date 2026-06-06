'use client'

import React, { useEffect, useRef } from 'react'
import 'mathlive'

interface MathLiveBlockEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function MathLiveBlockEditor({ value, onChange }: MathLiveBlockEditorProps) {
  const mathFieldRef = useRef<HTMLElement>(null)
  const onChangeRef = useRef(onChange)
  const initialValueRef = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const mathField = mathFieldRef.current as HTMLElement & { value?: string; shadowRoot?: ShadowRoot }
    if (!mathField) return

    if (mathField.value !== initialValueRef.current) {
      mathField.value = initialValueRef.current
    }

    const fixMenuToggle = () => {
      const menuToggle = mathField.shadowRoot?.querySelector('[part="menu-toggle"]') as HTMLElement | null
      if (!menuToggle || menuToggle.dataset.fixed === 'true') return

      menuToggle.dataset.fixed = 'true'

      const interceptEvent = (event: Event) => {
        if (event.type === 'pointerdown' || event.type === 'mousedown' || event.type === 'touchstart') {
          if ((event.type === 'mousedown' || event.type === 'touchstart') && menuToggle.dataset.ignore === 'true') {
            event.stopPropagation()
            event.preventDefault()
            return
          }

          const isMenuOpen = document.querySelector('.ui-menu-container') !== null
          if (isMenuOpen) {
            menuToggle.dataset.ignore = 'true'
            event.stopPropagation()
            event.preventDefault()
            document.body.click()
          } else {
            menuToggle.dataset.ignore = 'false'
          }
          return
        }

        if (menuToggle.dataset.ignore === 'true') {
          event.stopPropagation()
          event.preventDefault()
        }
      }

      for (const type of ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'click']) {
        menuToggle.addEventListener(type, interceptEvent, { capture: true })
      }
    }

    fixMenuToggle()
    const observer = new MutationObserver(fixMenuToggle)
    observer.observe(mathField, { childList: true, subtree: true })

    const handleInput = (event: Event) => {
      onChangeRef.current((event.target as HTMLInputElement & { value?: string }).value || '')
    }

    mathField.addEventListener('input', handleInput)

    return () => {
      observer.disconnect()
      mathField.removeEventListener('input', handleInput)
      try {
        if (typeof window !== 'undefined' && 'mathVirtualKeyboard' in window) {
          ;(window as Window & { mathVirtualKeyboard?: { hide: () => void } }).mathVirtualKeyboard?.hide()
        }
      } catch {
        // MathLive cleanup is best-effort.
      }
    }
  }, [])

  useEffect(() => {
    const mathField = mathFieldRef.current as HTMLElement & { value?: string }
    if (mathField && mathField.value !== value && document.activeElement !== mathField) {
      mathField.value = value
    }
  }, [value])

  return (
    <div className="space-y-2">
      {React.createElement('math-field', {
        ref: mathFieldRef,
        style: {
          width: '100%',
          minHeight: '120px',
          fontSize: '1.2rem',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          border: '2px solid #d1d5db',
          backgroundColor: '#ffffff',
          color: '#111827',
          outline: 'none',
        },
      })}
      <p className="text-xs font-medium text-gray-500">
        Gunakan keypad matematika atau ketik LaTeX langsung. Hasil disimpan sebagai block rumus.
      </p>
    </div>
  )
}
