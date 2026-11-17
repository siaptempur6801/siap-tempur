export const BUTTON_REPEAT_WINDOW_MS = 700
export const FORM_REPEAT_WINDOW_MS = 1_500

export function isRapidRepeat(
  previousActivation: number | undefined,
  currentActivation: number,
  windowMs: number,
) {
  if (previousActivation === undefined) return false

  const elapsed = currentActivation - previousActivation
  return elapsed >= 0 && elapsed < windowMs
}
