import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  AdminRowActions,
  AdminSectionHeading,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import AdminWorkspaceTabs from '@/components/admin/AdminWorkspaceTabs'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { RolePermissions } from '@/components/admin/domain/users/RolePermissions'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { formatDateTime } from '@/lib/admin-format'
import {
  ADMIN_PAGE_SIZE,
  adminOffset,
  adminPageHref,
  adminPageSummary,
  adminPageSummaryLabel,
  adminTotalPages,
  parseAdminPage,
} from '@/lib/admin-pagination'
import { PERMISSIONS } from '@/src/auth/permissions'
import { listAdminAccessUsers } from '@/src/services/admin-context-details.service'
import {
  adminDirectoryService,
  roleLabel,
  userStatusLabel,
} from '@/src/services/admin-directory.service'
import { getAdminUserAccessCounts } from '@/src/services/admin-user-workspace.service'
import { authorizationService } from '@/src/services/authorization.service'
import { ShieldCheck, UserCheck, Users } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

/**
 * Users.
 *
 * Halaman ini mengisi lubang yang paling besar di alur peran: `SUPPORT` punya
 * `user.read` + `user.manage` dan `SUPER_ADMIN` punya `role.manage`, tetapi
 * sebelumnya TIDAK ADA halaman untuk keduanya — permission itu tidak punya UI
 * sama sekali.
 *
 * Otorisasi rincinya ada di database (RPC), bukan di sini. Halaman ini hanya
 * menyembunyikan tombol yang pasti ditolak supaya tidak menawarkan aksi yang
 * tidak bisa dipakai (`docs/ADMIN_UI_UX_STANDARD.md` §4).
 */

type SearchParams = {
  tab?: string
  q?: string
  role?: string
  status?: string
  page?: string
  ok?: string
  error?: string
}

const USER_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'suspended', label: 'Ditangguhkan' },
] as const

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const authorization = await authorizationService.requireAuthenticated()
  const permissions = new Set(authorization.permissions)

  const canRead = permissions.has(PERMISSIONS.USER_READ) || permissions.has(PERMISSIONS.USER_MANAGE)
  const canManageStatus = permissions.has(PERMISSIONS.USER_MANAGE)
  const canManageRoles = permissions.has(PERMISSIONS.ROLE_MANAGE)

  if (!canRead && permissions.has(PERMISSIONS.ENTITLEMENT_MANAGE)) {
    const page = parseAdminPage(params.page)
    const result = await listAdminAccessUsers(params.q || '', adminOffset(page), ADMIN_PAGE_SIZE)
    const summary = adminPageSummary(page, result.users.length, result.total)
    const counts = await getAdminUserAccessCounts(result.users.map((user) => user.id))
    return (
      <AdminPage>
        <AdminBreadcrumbs items={[{ label: 'Pengguna' }]} />
        <AdminPageHeader
          title="Pengguna"
          description="Cari pengguna dan buka detailnya untuk mengelola token serta akses fitur."
        />
        <AdminWorkspaceTabs workspace="users" permissions={authorization.permissions} />
        <AdminTableToolbar
          pathname="/admin/users"
          search={params.q || ''}
          placeholder="Cari nama pengguna..."
          resultCount={result.total}
        />
        <AdminCard>
          <div className="p-5">
            <h2 className="text-base font-semibold">Daftar pengguna</h2>
          </div>
          <AdminDataTable
            caption="Akses pengguna"
            className="min-w-[600px]"
            empty={
              !result.users.length
                ? {
                    title: 'Tidak ada pengguna',
                    description:
                      'Tidak ada pengguna yang cocok dengan pencarian. Ubah kata kunci untuk melanjutkan.',
                  }
                : undefined
            }
          >
            <thead className={adminTableHeadClass}>
              <tr>
                {['Nama', 'Akses aktif', 'Tindakan'].map((label) => (
                  <AdminTh key={label}>{label}</AdminTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">
                    {user.full_name || user.display_name || 'Pengguna'}
                  </td>
                  <td>{counts.get(user.id) || 0} akses aktif</td>
                  <td>
                    <AdminRowActions>
                      <Link
                        className={adminTableActionClass}
                        href={`/admin/users/${user.id}?${new URLSearchParams({ returnTo: adminPageHref('/admin/users', { q: params.q || '' }, page) })}`}
                      >
                        Lihat pengguna
                      </Link>
                    </AdminRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
          <AdminPagination
            pathname="/admin/users"
            params={{ q: params.q || '' }}
            summary={summary}
            noun="pengguna"
          />
        </AdminCard>
      </AdminPage>
    )
  }

  if (!canRead) {
    return (
      <AdminPage>
        <AdminPageHeader
          title="Pengguna"
          description="Cari pengguna, lihat perannya, dan kelola akses akun."
        />
        <AdminCard>
          <AdminEmptyState
            title="Akses tidak tersedia"
            description="Akun ini tidak memiliki permission user.read atau user.manage."
          />
        </AdminCard>
      </AdminPage>
    )
  }

  const page = parseAdminPage(params.page)
  const filters = {
    search: params.q || null,
    role: params.role || null,
    status: params.status || null,
    limit: ADMIN_PAGE_SIZE,
    offset: adminOffset(page),
  }

  const [directory, roles] = await Promise.all([
    adminDirectoryService.listUsers(filters),
    adminDirectoryService.listRoles(),
  ])

  const accessCounts = permissions.has(PERMISSIONS.ENTITLEMENT_MANAGE)
    ? await getAdminUserAccessCounts(directory.users.map((user) => user.id))
    : null
  const summary = adminPageSummary(page, directory.users.length, directory.total)
  const activeCount = directory.users.filter((user) => user.status === 'active').length
  const privilegedCount = directory.users.filter((user) => user.roles.length > 0).length
  const showRoles = params.tab === 'roles'
  const hiddenParams = { q: params.q || '', role: params.role || '', status: params.status || '' }

  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Pengguna' }]} />
      <AdminPageHeader
        title="Pengguna"
        description="Cari pengguna, lalu kelola profil, peran, dan akses dari detail pengguna."
      />

      <AdminWorkspaceTabs workspace="users" permissions={authorization.permissions} />

      <AdminFeedbackBanner ok={params.ok} error={params.error} />

      {!showRoles ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <AdminMetric
              label="Pengguna"
              value={directory.total}
              helper="Sesuai filter"
              icon={<Users size={18} />}
              tone="blue"
            />
            <AdminMetric
              label="Aktif"
              value={activeCount}
              helper="Dari baris halaman ini"
              icon={<UserCheck size={18} />}
              tone="green"
            />
            <AdminMetric
              label="Punya peran"
              value={privilegedCount}
              helper="Dari baris halaman ini"
              icon={<ShieldCheck size={18} />}
              tone="violet"
            />
          </section>

          <AdminTableToolbar
            pathname="/admin/users"
            search={params.q || ''}
            status={params.status || ''}
            statusOptions={USER_STATUS_OPTIONS}
            placeholder="Cari nama atau email..."
            resultCount={directory.total}
            selects={[
              {
                name: 'role',
                ariaLabel: 'Filter peran',
                placeholder: 'Semua peran',
                defaultValue: params.role || '',
                options: roles.map((role) => ({ value: role.code, label: roleLabel(role.code) })),
              },
            ]}
          />

          <AdminCard className="overflow-hidden">
            <div className="border-b border-border p-5">
              <AdminSectionHeading
                title="Daftar pengguna"
                description={adminPageSummaryLabel(summary, 'pengguna')}
              />
            </div>
            {directory.users.length === 0 ? (
              page > 1 && summary.page > adminTotalPages(summary.total) ? (
                <AdminEmptyState
                  title={`Tidak ada pengguna di halaman ${page}`}
                  description={`Daftar hanya punya ${adminTotalPages(summary.total)} halaman. Kembali ke halaman pertama atau ubah pencarian.`}
                  action={
                    <Link
                      className={adminSecondaryButtonClass}
                      href={adminPageHref(
                        '/admin/users',
                        hiddenParams,
                        adminTotalPages(summary.total),
                      )}
                    >
                      Ke halaman terakhir
                    </Link>
                  }
                />
              ) : (
                <AdminEmptyState
                  title="Tidak ada pengguna"
                  description="Tidak ada pengguna yang cocok dengan filter ini. Coba ubah kata kunci, peran, atau status."
                />
              )
            ) : (
              <AdminDataTable className="w-full min-w-[980px] text-left text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <AdminTh>Pengguna</AdminTh>
                    <AdminTh>Peran</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Akses aktif</AdminTh>
                    <AdminTh>Masuk terakhir</AdminTh>
                    <AdminTh align="right">Tindakan</AdminTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {directory.users.map((user) => (
                    <tr key={user.id} className="align-top transition hover:bg-muted/70">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/users/${user.id}?${new URLSearchParams({ returnTo: adminPageHref('/admin/users', hiddenParams, page) })}`}
                          className="font-semibold text-info hover:underline"
                        >
                          {user.full_name}
                        </Link>
                        <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {user.email || 'Email tidak tersedia'}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                          Terdaftar {formatDateTime(user.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.length === 0 ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              Tanpa peran
                            </span>
                          ) : (
                            user.roles.map((role) => (
                              <AdminBadge key={role} variant="violet" className="gap-1 py-0.5">
                                {roleLabel(role)}
                              </AdminBadge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminStatusBadge
                          status={user.status}
                          label={userStatusLabel(user.status)}
                        />
                      </td>
                      <td className="px-4 py-4 font-bold tabular-nums text-muted-foreground">
                        {accessCounts
                          ? `${accessCounts.get(user.id) || 0} akses aktif`
                          : 'Akses terbatas'}
                      </td>
                      <td className="px-4 py-4 font-medium text-muted-foreground">
                        {formatDateTime(user.last_sign_in_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-end gap-2">
                          <Link
                            className={adminSecondaryButtonClass}
                            href={`/admin/users/${user.id}?${new URLSearchParams({ returnTo: adminPageHref('/admin/users', hiddenParams, page) })}`}
                          >
                            Lihat User
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminDataTable>
            )}

            {directory.users.length > 0 ? (
              <AdminPagination
                pathname="/admin/users"
                params={hiddenParams}
                summary={summary}
                noun="pengguna"
              />
            ) : null}
          </AdminCard>
        </>
      ) : null}

      {showRoles ? (
        <AdminCard className="p-5">
          <AdminSectionHeading
            title="Peran & permission"
            description="Komposisi peran yang tersedia. Perubahan peran di atas mengikuti daftar ini."
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <div key={role.code} className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {roleLabel(role.code)}
                    </h3>
                    <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {role.code}
                    </div>
                  </div>
                  <AdminBadge variant={role.holder_count > 0 ? 'blue' : 'neutral'}>
                    {role.holder_count} pemegang
                  </AdminBadge>
                </div>
                {role.description ? (
                  <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">
                    {role.description}
                  </p>
                ) : null}
                <RolePermissions permissions={role.permissions} />
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      {!canManageRoles ? (
        <details className="rounded-lg border border-border bg-card px-4 py-3 text-xs font-semibold text-muted-foreground">
          <summary className="cursor-pointer select-none">Catatan akses</summary>
          <p className="mt-2 leading-6">
            Memberi atau mencabut peran memerlukan permission{' '}
            <code className="font-mono">role.manage</code>, yang hanya dimiliki SUPER_ADMIN.
            {canManageStatus ? ' Anda tetap dapat mengubah status akun.' : ''}
          </p>
        </details>
      ) : null}
    </AdminPage>
  )
}
