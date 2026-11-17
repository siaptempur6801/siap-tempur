import AdminPagination from '@/components/admin/AdminPagination'
import {
  AdminCard,
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { RolePermissions } from '@/components/admin/domain/users/RolePermissions'
import { UserAccessForms } from '@/components/admin/domain/users/UserAccessForms'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import { formatDateTime, formatNumber, formatRupiah } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { PERMISSIONS } from '@/src/auth/permissions'
import {
  entitlementStatusLabel,
  transactionSourceLabel,
  walletTypeLabel,
} from '@/src/services/admin-platform.service'
import { listAdminOrders } from '@/src/services/admin-commerce-workspace.service'
import {
  getAdminUserAccess,
  getAdminUserDetail,
} from '@/src/services/admin-context-details.service'
import { roleLabel, userStatusLabel } from '@/src/services/admin-directory.service'
import {
  getAdminUserActivity,
  getAdminUserIdentity,
  getAdminUserRoles,
} from '@/src/services/admin-user-workspace.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'
import { notFound } from 'next/navigation'
export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{
    tab?: string
    returnTo?: string
    page?: string
    ok?: string
    error?: string
  }>
}) {
  const [{ userId }, query] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound()
  const actor = await authorizationService.requireAuthenticated(),
    canAccess = actor.permissions.includes(PERMISSIONS.ENTITLEMENT_MANAGE),
    canRead = actor.permissions.some(
      (p) => p === PERMISSIONS.USER_READ || p === PERMISSIONS.USER_MANAGE,
    ),
    canOrders = actor.permissions.some(
      (p) => p === PERMISSIONS.ORDER_READ || p === PERMISSIONS.PAYMENT_MANAGE,
    )
  if (!canAccess && !canRead)
    return (
      <AdminEmptyState
        title="Akses tidak tersedia"
        description="Akun ini tidak memiliki akses detail pengguna."
      />
    )
  const user = await getAdminUserDetail(userId)
  if (!user) notFound()
  const back = adminReturnUrl(query.returnTo, '/admin/users'),
    href = `/admin/users/${userId}`,
    name = user.full_name || user.display_name || 'Pengguna'
  const tabs = [
    { id: 'profile', label: 'Profil', allowed: true },
    { id: 'roles', label: 'Peran & izin', allowed: canRead },
    { id: 'entitlements', label: 'Akses', allowed: canAccess },
    { id: 'orders', label: 'Pesanan', allowed: canOrders },
    { id: 'activity', label: 'Aktivitas', allowed: canRead },
  ].filter((t) => t.allowed)
  const tab = tabs.some((t) => t.id === query.tab) ? query.tab! : 'profile'
  const [identity, access, roles, orders, activity] = await Promise.all([
    tab === 'profile' && canRead ? getAdminUserIdentity(userId) : null,
    tab === 'entitlements' && canAccess ? getAdminUserAccess(userId) : null,
    tab === 'roles' && canRead ? getAdminUserRoles(userId) : null,
    tab === 'orders' && canOrders ? listAdminOrders({ user: userId, page: query.page }) : null,
    tab === 'activity' && canRead ? getAdminUserActivity(userId) : null,
  ])
  const self = `${href}?${new URLSearchParams({ tab, returnTo: back, ...(query.page ? { page: query.page } : {}) })}`
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Pengguna', href: back }, { label: name }]} />
      <AdminPageHeader
        title={name}
        description="Profil, akses, dan aktivitas pengguna dalam satu workspace."
      />
      <AdminTabs
        label="Tampilan detail pengguna"
        active={tab}
        tabs={tabs.map((t) => ({
          ...t,
          href: `${href}?${new URLSearchParams({ tab: t.id, returnTo: back })}`,
        }))}
      />
      <AdminFeedbackBanner ok={query.ok} error={query.error} />
      {tab === 'profile' && (
        <AdminCard className="p-5">
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            {[
              ['Nama', name],
              ['Email', identity?.email || 'Akses terbatas'],
              ['Terdaftar', formatDateTime(user.created_at)],
              ['Aktivitas terakhir', formatDateTime(identity?.lastActivity)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <AdminStatusBadge status={user.status} label={userStatusLabel(user.status)} />
              </dd>
            </div>
          </dl>
        </AdminCard>
      )}
      {tab === 'profile' && actor.permissions.includes(PERMISSIONS.USER_MANAGE) && (
        <UserAccessForms userId={userId} status={user.status} returnTo={self} mode="status" />
      )}
      {tab === 'roles' && actor.permissions.includes(PERMISSIONS.ROLE_MANAGE) && (
        <UserAccessForms
          userId={userId}
          assignedRoles={roles?.map((r) => r.code)}
          returnTo={self}
          mode="roles"
        />
      )}
      {roles && (
        <section className="flex flex-col gap-4">
          {!roles.length && (
            <AdminEmptyState
              title="Belum ada peran"
              description="Pengguna ini belum memiliki peran admin."
            />
          )}
          {roles.map((role) => (
            <AdminCard key={role.code} className="p-5">
              <h2 className="font-semibold">{roleLabel(role.code)}</h2>
              <RolePermissions permissions={role.permissions} />
            </AdminCard>
          ))}
        </section>
      )}
      {access && (
        <>
          <section>
            <h2 className="mb-3 font-semibold">Token</h2>
            <AdminCard>
              <AdminDataTable
                caption="Token pengguna"
                className="min-w-[450px]"
                empty={
                  !access.wallets.length
                    ? {
                        title: 'Belum ada token',
                        description: 'Pengguna ini belum memiliki dompet token.',
                      }
                    : undefined
                }
              >
                <thead className={adminTableHeadClass}>
                  <tr>
                    <AdminTh>Dompet</AdminTh>
                    <AdminTh>Saldo</AdminTh>
                    <AdminTh>Diperbarui</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {access.wallets.map((w) => (
                    <tr key={String(w.id)}>
                      <td>{walletTypeLabel(String(w.wallet_type))}</td>
                      <td>{formatNumber(w.balance)}</td>
                      <td>{formatDateTime(w.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminDataTable>
            </AdminCard>
          </section>
          <section>
            <h2 className="mb-3 font-semibold">Akses fitur</h2>
            <AdminCard>
              <AdminDataTable
                caption="Akses pengguna"
                className="min-w-[650px]"
                empty={
                  !access.entitlements.length
                    ? {
                        title: 'Belum ada akses fitur',
                        description: 'Pengguna ini belum memiliki akses fitur.',
                      }
                    : undefined
                }
              >
                <thead className={adminTableHeadClass}>
                  <tr>
                    {['Akses', 'Sumber', 'Penggunaan', 'Status', 'Berakhir pada'].map((h) => (
                      <AdminTh key={h}>{h}</AdminTh>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {access.entitlements.map((e) => (
                    <tr key={e.id}>
                      <td>{e.feature_name}</td>
                      <td>{transactionSourceLabel(String(e.source_type))}</td>
                      <td>
                        {formatNumber(e.usage_count)} /{' '}
                        {e.usage_limit == null ? 'Tidak dibatasi' : formatNumber(e.usage_limit)}
                      </td>
                      <td>
                        <AdminStatusBadge
                          status={e.status}
                          label={entitlementStatusLabel(e.status)}
                        />
                      </td>
                      <td>{formatDateTime(e.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminDataTable>
            </AdminCard>
          </section>
          <Link
            className={adminSecondaryButtonClass}
            href={`/admin/users/access?${new URLSearchParams({ user: userId, q: name, returnTo: self })}`}
          >
            Kelola token & voucher
          </Link>
        </>
      )}
      {orders && (
        <AdminCard>
          <AdminDataTable
            caption="Pesanan pengguna"
            className="min-w-[650px]"
            empty={
              !orders.rows.length
                ? {
                    title: 'Belum ada pesanan',
                    description: 'Pesanan pengguna akan muncul setelah checkout.',
                  }
                : undefined
            }
          >
            <thead className={adminTableHeadClass}>
              <tr>
                {['Pesanan', 'Produk', 'Jumlah', 'Status', 'Dibuat'].map((h) => (
                  <AdminTh key={h}>{h}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link
                      className="text-info"
                      href={`/admin/commerce/orders/${o.id}?${new URLSearchParams({ returnTo: self })}`}
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td>{o.product_names}</td>
                  <td>{formatRupiah(o.total_amount)}</td>
                  <td>
                    <AdminStatusBadge status={o.status} />
                  </td>
                  <td>{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
          <AdminPagination
            pathname={href}
            params={{ tab, returnTo: back }}
            summary={adminPageSummary(orders.page, orders.rows.length, orders.total)}
            noun="order"
          />
        </AdminCard>
      )}
      {activity && (
        <AdminCard>
          <AdminDataTable
            caption="Aktivitas pengguna"
            className="min-w-[650px]"
            empty={
              !activity.length
                ? {
                    title: 'Belum ada aktivitas assessment',
                    description:
                      'Aktivitas akan tercatat saat pengguna mulai mengerjakan assessment.',
                  }
                : undefined
            }
          >
            <thead className={adminTableHeadClass}>
              <tr>
                {['Assessment', 'Status', 'Dimulai', 'Selesai', 'Skor'].map((h) => (
                  <AdminTh key={h}>{h}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={String(a.id)}>
                  <td>
                    {String((a.exams as unknown as { title: string })?.title || 'Assessment')}
                  </td>
                  <td>
                    <AdminStatusBadge status={a.status} />
                  </td>
                  <td>{formatDateTime(a.started_at)}</td>
                  <td>{formatDateTime(a.submitted_at)}</td>
                  <td>{a.total_score ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
        </AdminCard>
      )}
    </AdminPage>
  )
}
