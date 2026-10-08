import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
AdminCard,
AdminEmptyState,
AdminPage,
AdminPageHeader,
AdminStatusBadge,
AdminTh,
adminSecondaryButtonClass,
adminTableHeadClass
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { formatDateTime,formatRupiah } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import { PERMISSIONS } from '@/src/auth/permissions'
import { listAdminOrders } from '@/src/services/admin-commerce-workspace.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'
type Params = { q?: string; status?: string; payment?: string; page?: string }
export default async function OrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams,
    actor = await authorizationService.requireAuthenticated()
  if (
    !actor.permissions.some((p) => p === PERMISSIONS.ORDER_READ || p === PERMISSIONS.PAYMENT_MANAGE)
  )
    return (
      <AdminEmptyState
        title="Akses tidak tersedia"
        description="Hubungi pengelola untuk akses Orders."
      />
    )
  let data
  try {
    data = await listAdminOrders(params)
  } catch {
    return <AdminErrorState noun="order" retryHref="/admin/commerce/orders" />
  }
  const current = `/admin/commerce/orders?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>)}`
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Commerce' }, { label: 'Orders' }]} />
      <AdminPageHeader
        title="Orders"
        description="Telusuri pesanan, pembayaran, dan akses yang diberikan."
      />
      <AdminTableToolbar
        pathname="/admin/commerce/orders"
        search={params.q || ''}
        placeholder="Cari nomor order..."
        status={params.status}
        statusOptions={['pending', 'paid', 'cancelled', 'failed'].map((value) => ({
          value,
          label: value
        }))}
        resultCount={data.total}
        selects={[
          {
            name: 'payment',
            ariaLabel: 'Filter pembayaran',
            placeholder: 'Semua pembayaran',
            defaultValue: params.payment || '',
            options: ['pending', 'paid', 'failed', 'expired'].map((value) => ({
              value,
              label: value
            }))
          }
        ]}
      />
      <AdminCard>
        <AdminDataTable
          caption="Orders"
          className="min-w-[950px]"
          empty={
            !data.rows.length
              ? {
                  title: 'Belum ada order yang cocok',
                  description:
                    'Order tercatat saat peserta melakukan checkout. Ubah filter untuk melihat pesanan lainnya.'
                }
              : undefined
          }
          pagination={
            <AdminPagination
              pathname="/admin/commerce/orders"
              params={params}
              summary={adminPageSummary(data.page, data.rows.length, data.total)}
              noun="order"
            />
          }
        >
          <thead className={adminTableHeadClass}>
            <tr>
              {[
                'Order',
                'User',
                'Product',
                'Amount',
                'Payment Status',
                'Order Status',
                'Created',
                'Actions'
              ].map((h) => (
                <AdminTh key={h}>{h}</AdminTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link
                    className="font-medium text-info hover:underline"
                    href={`/admin/commerce/orders/${o.id}?${new URLSearchParams({ returnTo: current })}`}
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td>{o.customer_name}</td>
                <td className="max-w-xs">{o.product_names || 'Produk tidak tercatat'}</td>
                <td className="whitespace-nowrap tabular-nums">{formatRupiah(o.total_amount)}</td>
                <td>
                  <AdminStatusBadge status={o.payment_status} />
                </td>
                <td>
                  <AdminStatusBadge status={o.status} />
                </td>
                <td className="whitespace-nowrap text-xs">{formatDateTime(o.created_at)}</td>
                <td>
                  <Link
                    className={adminSecondaryButtonClass}
                    href={`/admin/commerce/orders/${o.id}?${new URLSearchParams({ returnTo: current })}`}
                  >
                    Lihat Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
      </AdminCard>
    </AdminPage>
  )
}
