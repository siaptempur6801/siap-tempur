import { saveOrganizationAction } from '@/app/actions/admin-organization'
import { AdminField,adminInputClass,adminPrimaryButtonClass } from '@/components/admin/AdminUi'
import { AdminFormActions } from '@/components/admin/forms/AdminFormActions'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { organizationService,organizationTypeLabel } from '@/src/services/organization.service'
type Detail = NonNullable<Awaited<ReturnType<typeof organizationService.getOrganization>>>
type Context = Record<string, string | undefined>
const ORG_TYPES = ['instansi', 'sekolah', 'komunitas', 'lainnya'] as const
export function OrganizationForm({
  editingOrg,
  params,
  tab,
  cancelHref
}: {
  editingOrg: Detail['organization'] | null
  params: Context
  tab: string
  cancelHref: string
}) {
  return (
    <form action={saveOrganizationAction} data-admin-form>
      <input type="hidden" name="id" value={editingOrg?.id ?? ''} />
      <input type="hidden" name="q" value={params.q || ''} />
      <input type="hidden" name="filter_status" value={params.status || ''} />
      <input type="hidden" name="returnTo" value={params.returnTo || ''} />
      <input type="hidden" name="return_exam_id" value={params.exam || ''} />
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="page" value={params.page || ''} />
      <AdminFormSection title="Informasi Instansi">
        <AdminField label="Nama instansi" className="sm:col-span-2">
          <input
            className={adminInputClass}
            name="name"
            required
            minLength={2}
            defaultValue={editingOrg?.name ?? ''}
            placeholder="Dinas Pendidikan Kota Medan"
          />
        </AdminField>
        <AdminField label="Kode" hint="2–24 karakter: A–Z, 0–9, atau -">
          <input
            className={adminInputClass}
            name="code"
            required
            defaultValue={editingOrg?.code ?? ''}
            placeholder="DINAS-MEDAN"
          />
        </AdminField>
        <AdminField label="Jenis">
          <select
            className={adminInputClass}
            name="type"
            defaultValue={editingOrg?.type ?? 'instansi'}
          >
            {ORG_TYPES.map((type) => (
              <option key={type} value={type}>
                {organizationTypeLabel(type)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Status">
          <select
            className={adminInputClass}
            name="status"
            aria-label="Status instansi"
            defaultValue={editingOrg?.status ?? 'active'}
          >
            <option value="active">Active</option>
            <option value="inactive">Unavailable</option>
          </select>
        </AdminField>
        <AdminField label="Kota">
          <input
            className={adminInputClass}
            name="city"
            defaultValue={editingOrg?.city ?? ''}
            placeholder="Medan"
          />
        </AdminField>
        <AdminField label="Provinsi">
          <input
            className={adminInputClass}
            name="province"
            defaultValue={editingOrg?.province ?? ''}
            placeholder="Sumatera Utara"
          />
        </AdminField>
        <AdminField label="Alamat" className="sm:col-span-2">
          <input
            className={adminInputClass}
            name="address"
            defaultValue={editingOrg?.address ?? ''}
            placeholder="Jl. ..."
          />
        </AdminField>
        <AdminField label="Nama PIC" hint="Kontak penanggung jawab instansi">
          <input
            className={adminInputClass}
            name="contact_name"
            defaultValue={editingOrg?.contact_name ?? ''}
            placeholder="Budi Santoso"
          />
        </AdminField>
        <AdminField label="Telepon PIC">
          <input
            className={adminInputClass}
            name="contact_phone"
            defaultValue={editingOrg?.contact_phone ?? ''}
            placeholder="0812..."
          />
        </AdminField>
        <AdminField label="Email PIC">
          <input
            className={adminInputClass}
            name="contact_email"
            type="email"
            defaultValue={editingOrg?.contact_email ?? ''}
            placeholder="pic@instansi.go.id"
          />
        </AdminField>
        <AdminField label="Catatan" className="sm:col-span-2">
          <textarea
            className={`${adminInputClass} min-h-20 resize-y`}
            name="notes"
            defaultValue={editingOrg?.notes ?? ''}
            placeholder="Catatan internal..."
          />
        </AdminField>
      </AdminFormSection>
      <AdminFormActions cancelHref={cancelHref}>
        <button className={adminPrimaryButtonClass}>
          {editingOrg ? 'Simpan perubahan' : 'Buat instansi'}
        </button>
      </AdminFormActions>
    </form>
  )
}
