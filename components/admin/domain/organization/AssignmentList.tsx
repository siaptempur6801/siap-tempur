import { saveAssignmentAction } from '@/app/actions/admin-organization-exam'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import {
  AdminField,
  AdminStatusBadge,
  AdminTh,
  adminInputClass,
  adminSecondaryButtonClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { formatDateTime, formatLocalDateTimeInput } from '@/lib/admin-format'
import type { AssignmentRow } from '@/lib/organization-exam'
import Link from '@/components/admin/navigation/AdminLink'
export function AssignmentList({
  assignments,
  batchId,
  organizationId,
  returnTo,
}: {
  assignments: AssignmentRow[]
  batchId: string
  organizationId: string
  returnTo: string
}) {
  const context = (a: AssignmentRow) => (
    <>
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="org" value={organizationId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="assignment_id" value={a.id} />
      <input type="hidden" name="exam_id" value={a.exam_id} />
    </>
  )
  return (
    <AdminDataTable
      caption="Penugasan batch"
      empty={
        !assignments.length
          ? {
              title: 'Belum ada penugasan',
              description:
                'Pilih assessment di atas untuk menugaskannya kepada seluruh peserta batch.',
            }
          : undefined
      }
    >
      <thead className={adminTableHeadClass}>
        <tr>
          {['Assessment', 'Masa berlaku', 'Percobaan', 'Status', 'Tindakan'].map((h) => (
            <AdminTh key={h}>{h}</AdminTh>
          ))}
        </tr>
      </thead>
      <tbody>
        {assignments.map((a) => (
          <tr key={a.id} data-assignment-id={a.id}>
            <td>
              <p className="font-medium">{a.exam_title}</p>
              <p className="text-xs text-muted-foreground">{a.question_count} soal</p>
            </td>
            <td>
              {formatDateTime(a.starts_at)} — {formatDateTime(a.due_at)}
            </td>
            <td>{a.attempt_count}</td>
            <td>
              <AdminStatusBadge status={a.is_active ? 'active' : 'inactive'} />
            </td>
            <td>
              <Link
                className={adminSecondaryButtonClass}
                href={`/admin/monitoring?${new URLSearchParams({ org: organizationId, batch: batchId, assignment: a.id, returnTo })}`}
              >
                Lihat Monitoring
              </Link>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Pengaturan Penugasan</summary>
                <form action={saveAssignmentAction} className="mt-3 grid gap-3">
                  {context(a)}
                  <AdminField label="Buka (WIB)">
                    <input
                      className={adminInputClass}
                      type="datetime-local"
                      name="starts_at"
                      defaultValue={formatLocalDateTimeInput(a.starts_at)}
                    />
                  </AdminField>
                  <AdminField label="Tutup (WIB)">
                    <input
                      className={adminInputClass}
                      type="datetime-local"
                      name="due_at"
                      defaultValue={formatLocalDateTimeInput(a.due_at)}
                    />
                  </AdminField>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={a.is_active} />
                    Penugasan aktif
                  </label>
                  <AdminSubmitButton variant="secondary">Simpan perubahan</AdminSubmitButton>
                </form>
                <form action={saveAssignmentAction} className="mt-3">
                  {context(a)}
                  <input
                    type="hidden"
                    name="starts_at"
                    value={formatLocalDateTimeInput(a.starts_at)}
                  />
                  <input type="hidden" name="due_at" value={formatLocalDateTimeInput(a.due_at)} />
                  <input type="hidden" name="is_active" value={a.is_active ? '' : 'on'} />
                  {a.is_active ? (
                    <ConfirmSubmit
                      message="Nonaktifkan penugasan?"
                      confirmLabel="Nonaktifkan"
                      trigger={
                        <button type="button" className={adminSecondaryButtonClass}>
                          Nonaktifkan
                        </button>
                      }
                    />
                  ) : (
                    <AdminSubmitButton variant="secondary">Aktifkan</AdminSubmitButton>
                  )}
                </form>
              </details>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminDataTable>
  )
}
