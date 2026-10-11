import { archiveProductAction } from '@/app/actions/admin-v2'
import AdminPagination from '@/components/admin/AdminPagination'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminReadinessChecklist } from '@/components/admin/data-display/AdminReadinessChecklist'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import {
  AdminCard,
  AdminEmptyState,
  AdminRowActions,
  AdminSectionHeading,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  ContextFields,
  DOMAIN_SEARCH_PLACEHOLDER,
  DOMAIN_STATUS_OPTIONS,
  PageOutOfRange,
  PermissionEmpty,
  s,
  type AdminProductsPanelProps,
} from '@/components/admin/AdminResourceShared'
import Link from '@/components/admin/navigation/AdminLink'
import { formatRupiah } from '@/lib/admin-format'
import { adminPageHref, adminPageSummaryLabel } from '@/lib/admin-pagination'
import { productReadiness } from '@/src/services/admin-content-readiness.service'

export default async function AdminProductsPanel(props: AdminProductsPanelProps) {
  const {
    canProducts,
    program,
    track,
    pathname,
    activeFilters,
    pageSummary,
    pageOutOfRange,
    products,
    priceByProduct,
    editHref,
  } = props

  if (!canProducts) return <PermissionEmpty permission="product.manage" />

  const readinessEntries = await Promise.all(
    products.map(async (product) => {
      const id = s(product.id)
      return [id, await productReadiness(program, track, s(product.product_type), id)] as const
    }),
  )
  const readinessByProduct = new Map(readinessEntries)
  const returnTo = `${pathname}?${new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(activeFilters).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
    page: String(pageSummary?.page || 1),
  })}`

  return (
    <section className="flex flex-col gap-5">
      <AdminTableToolbar
        pathname={pathname}
        program={program}
        track={track}
        search={activeFilters.q}
        status={activeFilters.status}
        statusOptions={DOMAIN_STATUS_OPTIONS.products}
        placeholder={DOMAIN_SEARCH_PLACEHOLDER.products}
        resultCount={pageSummary?.total || products.length}
      />
      <AdminCard>
        <div className="p-5">
          <AdminSectionHeading
            title="Katalog produk"
            description={pageSummary ? adminPageSummaryLabel(pageSummary, 'produk') : undefined}
          />
        </div>
        <AdminDataTable className="w-full min-w-[950px] text-sm" caption="Katalog produk">
          <thead className={adminTableHeadClass}>
            <tr>
              <AdminTh>Produk</AdminTh>
              <AdminTh>Program / track</AdminTh>
              <AdminTh align="right">Harga</AdminTh>
              <AdminTh>Ketersediaan</AdminTh>
              <AdminTh>Kesiapan konten</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Tindakan</AdminTh>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => {
              const id = s(product.id)
              const readiness = readinessByProduct.get(id)!
              const price = priceByProduct.get(id)
              const productStatus = s(product.status).toUpperCase()
              const availabilityLabel =
                productStatus !== 'ACTIVE'
                  ? 'Belum aktif'
                  : readiness.ready
                    ? 'Tersedia'
                    : 'Konten belum siap'

              return (
                <tr key={id} className="hover:bg-muted/60">
                  <td className="px-5 py-4 font-semibold">
                    {s(product.name)}
                    <p className="text-xs font-normal text-muted-foreground">{s(product.code)}</p>
                  </td>
                  <td className="px-4">
                    {program} · {track}
                  </td>
                  <td className="whitespace-nowrap px-4 text-right tabular-nums">
                    {price ? formatRupiah(price.amount) : 'Tanpa harga'}
                  </td>
                  <td className="px-4">{availabilityLabel}</td>
                  <td className="max-w-sm px-4 py-4">
                    <details>
                      <summary className="cursor-pointer font-semibold">
                        {readiness.ready ? 'Siap' : 'Belum siap'} · Lihat persyaratan
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-muted-foreground">{readiness.reason}</p>
                        <AdminReadinessChecklist items={readiness.items} />
                      </div>
                    </details>
                  </td>
                  <td className="px-4">
                    <AdminStatusBadge status={product.status} />
                  </td>
                  <td className="px-5">
                    <AdminRowActions>
                      <Link
                        className={adminTableActionClass}
                        href={editHref('products', id)}
                        aria-label={`Lihat produk ${s(product.name)}`}
                      >
                        Lihat
                      </Link>
                      <details className="relative">
                        <summary className={adminTableActionClass}>Lainnya</summary>
                        <form
                          className="absolute right-0 z-10 mt-1 min-w-40 rounded-lg border border-border bg-card p-2 shadow-lg"
                          action={archiveProductAction}
                        >
                          <ContextFields program={program} track={track} />
                          <input type="hidden" name="id" value={id} />
                          <input type="hidden" name="return_to" value={returnTo} />
                          <ConfirmSubmit
                            message={`Produk “${s(product.name)}” akan diarsipkan.`}
                            confirmLabel="Arsipkan produk"
                            trigger={
                              <button
                                type="button"
                                className={`${adminSecondaryButtonClass} w-full`}
                              >
                                Arsipkan
                              </button>
                            }
                          />
                        </form>
                      </details>
                    </AdminRowActions>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </AdminDataTable>
        {!products.length &&
          (pageOutOfRange ? (
            <PageOutOfRange
              lastPage={pageSummary?.totalPages || 1}
              href={adminPageHref(pathname, activeFilters, pageSummary?.totalPages || 1)}
              noun="produk"
            />
          ) : (
            <AdminEmptyState
              title="Belum ada produk yang cocok"
              description="Ubah filter atau buat produk baru."
              action={
                <Link
                  className={adminSecondaryButtonClass}
                  href={`${pathname}?program=${program}&track=${track}`}
                >
                  Reset filter
                </Link>
              }
            />
          ))}
        {pageSummary && (
          <AdminPagination
            pathname={pathname}
            params={activeFilters}
            summary={pageSummary}
            noun="produk"
          />
        )}
      </AdminCard>
    </section>
  )
}
