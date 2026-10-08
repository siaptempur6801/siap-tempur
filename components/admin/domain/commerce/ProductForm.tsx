import { saveProductAction } from '@/app/actions/admin-v2'
import { ContextFields,s,type ViewRow } from '@/components/admin/AdminResourceShared'
import { AdminField,adminInputClass,adminPrimaryButtonClass } from '@/components/admin/AdminUi'
import { AdminFormActions } from '@/components/admin/forms/AdminFormActions'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import ProductAvailabilityFields from '@/components/admin/ProductAvailabilityFields'
import { productReadiness } from '@/src/services/admin-content-readiness.service'
import { Save } from 'lucide-react'

export default async function ProductForm({
  product,
  price,
  grant,
  program,
  track,
  returnTo
}: {
  product?: ViewRow
  price?: ViewRow
  grant?: number
  program: string
  track: string
  returnTo: string
}) {
  const readiness = Object.fromEntries(
    await Promise.all(
      ['PASS', 'TOKEN_PACK', 'EVENT_TICKET'].map(async (type) => [
        type,
        await productReadiness(program, track, type, product ? s(product.id) : undefined)
      ])
    )
  )
  return (
    <form data-admin-form action={saveProductAction}>
      <ContextFields program={program} track={track} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="currency" value="IDR" />
      {product && <input type="hidden" name="id" value={s(product.id)} />}
      <AdminFormSection
        title="Informasi Produk"
        description="Nama dan manfaat yang ditampilkan kepada peserta."
      >
        <AdminField label="Kode">
          <input
            className={adminInputClass}
            name="code"
            required
            defaultValue={s(product?.code)}
            placeholder={`${program}_${track}_PRODUCT`}
          />
        </AdminField>
        <AdminField label="Nama">
          <input className={adminInputClass} name="name" required defaultValue={s(product?.name)} />
        </AdminField>
        <AdminField label="Deskripsi" className="sm:col-span-2">
          <textarea
            className={adminInputClass}
            name="description"
            rows={3}
            defaultValue={s(product?.description)}
          />
        </AdminField>
      </AdminFormSection>
      <AdminFormSection
        title="Harga & Akses"
        description="Harga, masa berlaku, dan token yang didapat peserta."
      >
        <AdminField label="Harga">
          <input
            className={adminInputClass}
            name="price"
            type="number"
            min="0"
            defaultValue={price ? s(price.amount) : ''}
          />
        </AdminField>
        <input type="hidden" name="current_price" value={price ? s(price.amount) : ''} />
        <AdminField label="Token yang diberikan">
          <input
            className={adminInputClass}
            name="token_grant"
            type="number"
            min="0"
            defaultValue={grant ?? ''}
          />
        </AdminField>
        <AdminField label="Durasi hari">
          <input
            className={adminInputClass}
            name="duration_days"
            type="number"
            min="1"
            defaultValue={s(product?.duration_days)}
          />
        </AdminField>
      </AdminFormSection>
      <AdminFormSection
        title="Availability & Readiness"
        description="Requirement konten harus terpenuhi sebelum produk dapat diaktifkan."
      >
        <ProductAvailabilityFields
          type={s(product?.product_type) || 'PASS'}
          status={s(product?.status) || 'DRAFT'}
          readiness={readiness}
        />
      </AdminFormSection>
      <AdminFormActions cancelHref={returnTo}>
        <button className={adminPrimaryButtonClass}>
          <Save size={16} />
          {product ? 'Simpan perubahan' : 'Simpan produk'}
        </button>
      </AdminFormActions>
    </form>
  )
}
