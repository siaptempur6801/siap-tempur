import { adminInputClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import type { MonitoringParams } from '@/src/services/admin-monitoring.service'
import type { AssignmentRow } from '@/lib/organization-exam'

export default function MonitoringAssignmentScope({
  pathname,
  params,
  assignments,
  returnTo,
}: {
  pathname: string
  params: MonitoringParams
  assignments: AssignmentRow[]
  returnTo: string
}) {
  if (!params.org || !params.batch) return null

  return (
    <form
      action={pathname}
      method="get"
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-end sm:gap-3"
      aria-label="Cakupan penugasan monitoring"
    >
      <input type="hidden" name="org" value={params.org} />
      <input type="hidden" name="batch" value={params.batch} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <label className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Cakupan penugasan</span>
        <select
          name="assignment"
          className={adminInputClass}
          defaultValue={params.assignment || ''}
          aria-describedby="monitoring-assignment-help"
        >
          <option value="">Semua penugasan</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.exam_title || 'Assessment tanpa judul'}
              {assignment.is_active ? '' : ' · Nonaktif'}
            </option>
          ))}
        </select>
      </label>
      <p
        id="monitoring-assignment-help"
        className="text-xs leading-5 text-muted-foreground sm:max-w-xs"
      >
        Semua penugasan menampilkan pengerjaan terakhir tiap peserta. Pilih satu penugasan untuk
        melihat progres assessment tertentu.
      </p>
      <button type="submit" className={`${adminSecondaryButtonClass} shrink-0`}>
        Terapkan cakupan
      </button>
    </form>
  )
}
