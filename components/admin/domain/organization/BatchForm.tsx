import { saveBatchAction } from '@/app/actions/admin-organization'
import { AdminField, adminInputClass, adminPrimaryButtonClass } from '@/components/admin/AdminUi'
import { AdminFormActions } from '@/components/admin/forms/AdminFormActions'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { adminStatusLabel, formatLocalDateTimeInput } from '@/lib/admin-format'
import { organizationService } from '@/src/services/organization.service'
type Detail = NonNullable<Awaited<ReturnType<typeof organizationService.getOrganization>>>
type Context = Record<string, string | undefined>
const BATCH_STATUSES = ['draft', 'active', 'closed', 'archived'] as const
export function BatchForm({
  editingOrg,
  selectedBatch,
  params,
  tab,
  cancelHref,
}: {
  editingOrg: Detail['organization']
  selectedBatch: Detail['batches'][number] | null
  params: Context
  tab: string
  cancelHref: string
}) {
  return (
    <form action={saveBatchAction} data-admin-form>
      <input type="hidden" name="batch_id" value={selectedBatch?.id ?? ''} />
      <input type="hidden" name="organization_id" value={editingOrg.id} />
      {/* Konteks filter dibawa supaya menyimpan batch tidak
                                        mengembalikan admin ke daftar tanpa filternya. */}
      <input type="hidden" name="q" value={params.q || ''} />
      <input type="hidden" name="status" value={params.status || ''} />
      <input type="hidden" name="returnTo" value={params.returnTo || ''} />
      <input type="hidden" name="return_exam_id" value={params.exam || ''} />
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="page" value={params.page || ''} />
      <AdminFormSection title="Informasi Batch">
        <AdminField label="Nama batch" className="sm:col-span-2">
          <input
            className={adminInputClass}
            name="name"
            required
            minLength={2}
            defaultValue={selectedBatch?.name ?? ''}
            placeholder="CPNS 2026 Batch A"
          />
        </AdminField>
        <AdminField label="Kode" hint="Unik di dalam instansi ini">
          <input
            className={adminInputClass}
            name="code"
            required
            defaultValue={selectedBatch?.code ?? ''}
            placeholder="CPNS-2026-A"
          />
        </AdminField>
        <AdminField label="Mulai (WIB)">
          <input
            className={adminInputClass}
            name="starts_at"
            type="datetime-local"
            defaultValue={formatLocalDateTimeInput(selectedBatch?.starts_at ?? null)}
          />
        </AdminField>
        <AdminField label="Selesai (WIB)">
          <input
            className={adminInputClass}
            name="ends_at"
            type="datetime-local"
            defaultValue={formatLocalDateTimeInput(selectedBatch?.ends_at ?? null)}
          />
        </AdminField>
        <AdminField label="Status">
          <select
            className={adminInputClass}
            name="batch_status"
            aria-label="Status batch"
            defaultValue={selectedBatch?.status ?? 'draft'}
          >
            {BATCH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {adminStatusLabel(status)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Catatan" className="sm:col-span-2">
          <input
            className={adminInputClass}
            name="notes"
            defaultValue={selectedBatch?.notes ?? ''}
            placeholder="Catatan batch..."
          />
        </AdminField>
      </AdminFormSection>
      <AdminFormActions cancelHref={cancelHref}>
        <button className={adminPrimaryButtonClass}>
          {selectedBatch ? 'Simpan batch' : 'Buat batch'}
        </button>
      </AdminFormActions>
    </form>
  )
}
