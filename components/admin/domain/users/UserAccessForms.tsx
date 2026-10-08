import {
assignUserRoleAction,
revokeUserRoleAction,
setUserStatusAction
} from '@/app/actions/admin-directory'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import { AdminField,adminInputClass,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { adminDirectoryService,roleLabel } from '@/src/services/admin-directory.service'
export async function UserAccessForms({
  userId,
  returnTo,
  assignedRoles,
  status,
  mode
}: {
  userId: string
  returnTo: string
  assignedRoles?: string[]
  status?: string
  mode: 'roles' | 'status'
}) {
  const context = (
    <>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="return_to" value={returnTo} />
    </>
  )
  if (mode === 'status')
    return (
      <form action={setUserStatusAction} data-admin-form>
        {context}
        <AdminFormSection
          title="Status akun"
          description="Perubahan akses berlaku setelah disimpan."
        >
          <AdminField label="Status pengguna">
            <select className={adminInputClass} name="status" defaultValue={status}>
              {[
                ['active', 'Active'],
                ['inactive', 'Unavailable'],
                ['suspended', 'Blocked']
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </AdminField>
        </AdminFormSection>
        <ConfirmSubmit
          message="Ubah status pengguna?"
          confirmLabel="Simpan status"
          trigger={
            <button type="button" className={adminSecondaryButtonClass}>
              Simpan status
            </button>
          }
        />
      </form>
    )
  const roles = await adminDirectoryService.listRoles()
  return (
    <section className="flex flex-col gap-4">
      <form action={assignUserRoleAction} data-admin-form>
        {context}
        <AdminFormSection title="Berikan peran">
          <AdminField label="Peran">
            <select className={adminInputClass} name="role_code" required defaultValue="">
              <option value="">Pilih peran</option>
              {roles
                .filter((role) => !assignedRoles?.includes(role.code))
                .map((role) => (
                  <option key={role.code} value={role.code}>
                    {roleLabel(role.code)}
                  </option>
                ))}
            </select>
          </AdminField>
        </AdminFormSection>
        <AdminSubmitButton variant="secondary">Berikan peran</AdminSubmitButton>
      </form>
      {assignedRoles?.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Kelola peran yang diberikan
          </summary>
          <div className="mt-3 flex flex-wrap gap-3">
            {assignedRoles.map((role) => (
              <form key={role} action={revokeUserRoleAction}>
                {context}
                <input type="hidden" name="role_code" value={role} />
                <ConfirmSubmit
                  message={`Cabut peran ${roleLabel(role)}?`}
                  confirmLabel="Cabut peran"
                  trigger={
                    <button type="button" className={adminSecondaryButtonClass}>
                      Cabut {roleLabel(role)}
                    </button>
                  }
                />
              </form>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}
