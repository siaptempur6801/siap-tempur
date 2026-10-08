import { adminStatusLabel } from './admin-format'

/** User-facing Indonesian labels for the Event lifecycle and session states. */
export function adminEventStatusLabel(value: unknown) {
  const status = String(value ?? '').toLowerCase()
  const labels: Record<string, string> = {
    draft: 'Draft',
    scheduled: 'Dijadwalkan',
    live: 'Berlangsung',
    active: 'Berlangsung',
    closed: 'Selesai',
    ended: 'Selesai',
    archived: 'Diarsipkan',
  }
  return labels[status] || adminStatusLabel(value)
}
