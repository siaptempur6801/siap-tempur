'use client'

import { useEffect } from 'react'
import {
  BUTTON_REPEAT_WINDOW_MS,
  FORM_REPEAT_WINDOW_MS,
  isRapidRepeat,
} from '@/lib/interaction-guard'

const ALLOW_REPEAT_SELECTOR = '[data-allow-repeat="true"]'

export function InteractionGuard() {
  useEffect(() => {
    const buttonActivations = new WeakMap<HTMLButtonElement, number>()
    const formSubmissions = new WeakMap<HTMLFormElement, number>()
    const timers = new Set<number>()

    const clearLockLater = (
      element: HTMLElement,
      attribute: 'pressLock' | 'submitLock',
      delay: number,
    ) => {
      const timer = window.setTimeout(() => {
        delete element.dataset[attribute]
        timers.delete(timer)
      }, delay)

      timers.add(timer)
    }

    const preventRepeatedClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const button = event.target.closest<HTMLButtonElement>('button')
      if (!button || button.disabled || button.closest(ALLOW_REPEAT_SELECTOR)) return

      const isFormSubmit = button.form !== null && button.type === 'submit'
      if (button.dataset.preventDouble !== 'true' && !isFormSubmit) return

      const now = performance.now()
      if (isRapidRepeat(buttonActivations.get(button), now, BUTTON_REPEAT_WINDOW_MS)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      buttonActivations.set(button, now)
      button.dataset.pressLock = 'true'
      clearLockLater(button, 'pressLock', BUTTON_REPEAT_WINDOW_MS)
    }

    const preventRepeatedSubmit = (event: SubmitEvent) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement) || form.closest(ALLOW_REPEAT_SELECTOR)) return

      const now = performance.now()
      if (isRapidRepeat(formSubmissions.get(form), now, FORM_REPEAT_WINDOW_MS)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      formSubmissions.set(form, now)
      form.dataset.submitLock = 'true'
      clearLockLater(form, 'submitLock', FORM_REPEAT_WINDOW_MS)
    }

    document.addEventListener('click', preventRepeatedClick, true)
    document.addEventListener('submit', preventRepeatedSubmit, true)
    document.documentElement.dataset.interactionGuard = 'ready'

    return () => {
      document.removeEventListener('click', preventRepeatedClick, true)
      document.removeEventListener('submit', preventRepeatedSubmit, true)
      delete document.documentElement.dataset.interactionGuard
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return null
}
