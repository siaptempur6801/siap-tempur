import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdminField, AdminStatusBadge, adminInputClass } from '@/components/admin/AdminUi'
import { adminEventStatusLabel } from '@/lib/admin-event-format'

describe('Admin status labels', () => {
  it('lets domain labels replace the generic label for common statuses', () => {
    const markup = renderToStaticMarkup(<AdminStatusBadge status="scheduled" label="Dijadwalkan" />)
    expect(markup).toContain('Dijadwalkan')
    expect(markup).not.toContain('Scheduled')
  })

  it.each([
    ['scheduled', 'Dijadwalkan'],
    ['live', 'Berlangsung'],
    ['closed', 'Selesai'],
    ['archived', 'Diarsipkan'],
  ])('localizes event status %s', (status, expected) => {
    expect(adminEventStatusLabel(status)).toBe(expected)
  })
})

describe('Admin form field accessibility', () => {
  it('keeps helper text out of the accessible name and associates it as a description', () => {
    const markup = renderToStaticMarkup(
      <AdminField
        label="Status event"
        fieldId="event-status"
        hint="Status mengatur tampilan event; jadwal menentukan waktunya."
      >
        <select className={adminInputClass}>
          <option value="draft">Draft</option>
        </select>
      </AdminField>,
    )

    expect(markup).toContain('<label for="event-status"')
    expect(markup).toContain('>Status event</label>')
    expect(markup).toContain('id="event-status-hint"')
    expect(markup).toContain('aria-describedby="event-status-hint"')
  })
})
