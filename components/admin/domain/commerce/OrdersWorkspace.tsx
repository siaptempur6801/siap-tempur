import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminRowActions,
  AdminStatusBadge,
  AdminTh,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { adminStatusLabel, formatDateTime, formatRupiah } from '@/lib/admin-format'
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
        description="Hubungi pengelola untuk mendapatkan akses pesanan."
      />
    )
  let data
  try {
    data = await listAdminOrders(params)
  } catch {
    return <AdminErrorState noun="pesanan" retryHref="/admin/commerce/orders" />
  }
  const current = `/admin/commerce/orders?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>)}`
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Commerce' }, { label: 'Pesanan' }]} />
      <AdminPageHeader
        title="Pesanan"
        description="Telusuri pesanan, pembayaran, dan akses yang diberikan."
      />
      <AdminTableToolbar
        pathname="/admin/commerce/orders"
        search={params.q || ''}
        placeholder="Cari nomor pesanan..."
        status={params.status}
        statusOptions={[
          'pending',
          'paid',
          'partial_refund_review',
          'partial_chargeback_review',
          'refunded',
          'chargeback',
          'cancelled',
          'failed',
        ].map((value) => ({
          value,
          label: adminStatusLabel(value),
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
              label: adminStatusLabel(value),
            })),
          },
        ]}
      />
      <AdminCard>
        <AdminDataTable
          caption="Pesanan"
          className="min-w-[950px]"
          empty={
            !data.rows.length
              ? {
                  title: 'Belum ada pesanan yang cocok',
                  description:
                    'Pesanan tercatat saat peserta melakukan checkout. Ubah filter untuk melihat pesanan lainnya.',
                }
              : undefined
          }
          pagination={
            <AdminPagination
              pathname="/admin/commerce/orders"
              params={params}
              summary={adminPageSummary(data.page, data.rows.length, data.total)}
              noun="pesanan"
            />
          }
        >
          <thead className={adminTableHeadClass}>
            <tr>
              {[
                'No. pesanan',
                'Pengguna',
                'Produk',
                'Jumlah',
                'Status pembayaran',
                'Status pesanan',
                'Dibuat',
                'Tindakan',
              ].map((h) => (
                <AdminTh key={h} align={h === 'Jumlah' ? 'right' : 'left'}>
                  {h}
                </AdminTh>
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
                <td className="whitespace-nowrap text-right tabular-nums">
                  {formatRupiah(o.total_amount)}
                </td>
                <td>
                  <AdminStatusBadge status={o.payment_status} />
                </td>
                <td>
                  <AdminStatusBadge status={o.status} />
                </td>
                <td className="whitespace-nowrap text-xs">{formatDateTime(o.created_at)}</td>
                <td>
                  <AdminRowActions>
                    <Link
                      className={`${adminTableActionClass} whitespace-nowrap`}
                      aria-label={`Lihat pesanan ${o.order_number}`}
                      href={`/admin/commerce/orders/${o.id}?${new URLSearchParams({ returnTo: current })}`}
                    >
                      Lihat
                    </Link>
                  </AdminRowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
      </AdminCard>
    </AdminPage>
  )
}
