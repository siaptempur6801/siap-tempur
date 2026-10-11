import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { formatDateTime, formatRupiah } from '@/lib/admin-format'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { PERMISSIONS } from '@/src/auth/permissions'
import { getAdminOrderResources } from '@/src/services/admin-commerce-workspace.service'
import { getAdminOrderDetail } from '@/src/services/admin-context-details.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const [{ orderId }, { returnTo }] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) notFound()
  const actor = await authorizationService.requireAuthenticated()
  if (
    !actor.permissions.some((p) => p === PERMISSIONS.ORDER_READ || p === PERMISSIONS.PAYMENT_MANAGE)
  )
    return (
      <AdminEmptyState
        title="Akses tidak tersedia"
        description="Akun ini tidak memiliki akses pesanan."
      />
    )
  const { order, payments } = await getAdminOrderDetail(orderId)
  if (!order) notFound()
  const resources = await getAdminOrderResources(orderId, String(order.user_id)),
    back = adminReturnUrl(returnTo, '/admin/commerce/orders')
  const canUser = actor.permissions.some(
    (p) =>
      p === PERMISSIONS.USER_READ ||
      p === PERMISSIONS.USER_MANAGE ||
      p === PERMISSIONS.ENTITLEMENT_MANAGE,
  )
  const name = String(
    resources.customer?.full_name || resources.customer?.display_name || 'Pengguna',
  )
  return (
    <AdminPage>
      <AdminBreadcrumbs
        items={[
          { label: 'Commerce' },
          { label: 'Pesanan', href: back },
          { label: String(order.order_number) },
        ]}
      />
      <AdminPageHeader
        title="Detail pesanan"
        description="Pengguna, produk, pembayaran, dan akses dalam satu konteks."
      />
      <AdminCard className="p-5">
        <dl className="grid gap-5 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Pengguna</dt>
            <dd className="mt-1 text-sm font-medium">
              {canUser ? (
                <Link
                  className="text-info hover:underline"
                  href={`/admin/users/${order.user_id}?${new URLSearchParams({ returnTo: `/admin/commerce/orders/${orderId}?${new URLSearchParams({ returnTo: back })}` })}`}
                >
                  {name}
                </Link>
              ) : (
                name
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="mt-1 font-semibold tabular-nums">{formatRupiah(order.total_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status pesanan</dt>
            <dd className="mt-1">
              <AdminStatusBadge status={order.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dibuat</dt>
            <dd className="mt-1 text-sm">{formatDateTime(order.created_at)}</dd>
          </div>
        </dl>
      </AdminCard>
      <section>
        <h2 className="mb-3 text-base font-semibold">Produk dan harga</h2>
        <AdminCard>
          <AdminDataTable
            caption="Produk dalam pesanan"
            className="min-w-[600px]"
            empty={
              !resources.items.length
                ? {
                    title: 'Produk belum tercatat',
                    description: 'Pesanan ini belum memiliki item produk.',
                  }
                : undefined
            }
          >
            <thead className={adminTableHeadClass}>
              <tr>
                {['Produk', 'Jumlah', 'Harga satuan', 'Total'].map((h) => (
                  <AdminTh key={h}>{h}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.items.map((i) => (
                <tr key={String(i.id)}>
                  <td>{String((i.products as unknown as { name: string })?.name || 'Produk')}</td>
                  <td>{String(i.quantity)}</td>
                  <td>{formatRupiah(i.unit_price)}</td>
                  <td>{formatRupiah(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
        </AdminCard>
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">Informasi pembayaran</h2>
        <AdminCard>
          <AdminDataTable
            caption="Pembayaran pesanan"
            className="min-w-[650px]"
            empty={
              !payments.length
                ? {
                    title: 'Belum ada pembayaran',
                    description: 'Pembayaran untuk pesanan ini belum tercatat.',
                  }
                : undefined
            }
          >
            <thead className={adminTableHeadClass}>
              <tr>
                {['Penyedia', 'Metode', 'Jumlah', 'Status', 'Dibayar pada'].map((h) => (
                  <AdminTh key={h}>{h}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={String(p.id)}>
                  <td>{String(p.provider)}</td>
                  <td>{String(p.payment_method || 'Belum tersedia')}</td>
                  <td>{formatRupiah(p.amount)}</td>
                  <td>
                    <AdminStatusBadge status={p.status} />
                  </td>
                  <td className="text-xs">{formatDateTime(p.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
        </AdminCard>
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">Riwayat transaksi</h2>
        <ol className="flex flex-col gap-3 text-sm">
          <li>
            <span className="text-muted-foreground">{formatDateTime(order.created_at)}</span> ·
            Pesanan dibuat
          </li>
          {payments.map((p) => (
            <li key={String(p.id)}>
              <span className="text-muted-foreground">
                {formatDateTime(p.paid_at || p.created_at)}
              </span>{' '}
              · {String(p.provider)} <AdminStatusBadge status={p.status} />
            </li>
          ))}
        </ol>
      </section>
      {resources.canAccess && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Akses yang diberikan</h2>
          <AdminCard>
            <AdminDataTable
              caption="Akses yang diberikan"
              className="min-w-[550px]"
              empty={
                !resources.grants.length
                  ? {
                      title: 'Belum ada akses fitur dari pesanan ini',
                      description:
                        'Akses diberikan setelah pembayaran dan pemrosesan berhasil. Produk token menambah saldo dompet pengguna.',
                    }
                  : undefined
              }
            >
              <thead className={adminTableHeadClass}>
                <tr>
                  {['Akses', 'Status', 'Berakhir pada'].map((h) => (
                    <AdminTh key={h}>{h}</AdminTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resources.grants.map((g) => (
                  <tr key={String(g.id)}>
                    <td>
                      {String((g.features as unknown as { name: string })?.name || 'Akses fitur')}
                    </td>
                    <td>
                      <AdminStatusBadge status={g.status} />
                    </td>
                    <td>{formatDateTime(g.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminDataTable>
          </AdminCard>
          <Link
            className={`${adminSecondaryButtonClass} mt-3`}
            href={`/admin/users/${order.user_id}?${new URLSearchParams({ tab: 'entitlements', returnTo: `/admin/commerce/orders/${orderId}?${new URLSearchParams({ returnTo: back })}` })}`}
          >
            Akses pengguna
          </Link>
        </section>
      )}
    </AdminPage>
  )
}
