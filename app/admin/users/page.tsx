import Link from 'next/link'
import { Check, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminFeedbackBanner,
    AdminMetric,
    AdminPage,
    AdminPageHeader,
    AdminSectionHeading,
    AdminStatusBadge,
    AdminTh,
    adminInputClass,
    adminSecondaryButtonClass,
    adminTableHeadClass,
} from '@/components/admin/AdminUi'
import AdminListToolbar from '@/components/admin/AdminListToolbar'
import AdminPagination from '@/components/admin/AdminPagination'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { ADMIN_PAGE_SIZE, adminOffset, adminPageHref, adminPageSummary, adminPageSummaryLabel, adminTotalPages, parseAdminPage } from '@/lib/admin-pagination'
import { formatDateTime } from '@/lib/admin-format'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import {
    adminDirectoryService,
    roleLabel,
    userStatusLabel,
} from '@/src/services/admin-directory.service'
import {
    assignUserRoleAction,
    revokeUserRoleAction,
    setUserStatusAction,
} from '@/app/actions/admin-directory'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Users & Roles.
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

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    const canRead = permissions.has(PERMISSIONS.USER_READ) || permissions.has(PERMISSIONS.USER_MANAGE)
    const canManageStatus = permissions.has(PERMISSIONS.USER_MANAGE)
    const canManageRoles = permissions.has(PERMISSIONS.ROLE_MANAGE)

    if (!canRead) {
        return (
            <AdminPage>
                <AdminPageHeader title="Users & Roles" description="Cari pengguna, lihat perannya, dan kelola akses akun."/>
                <AdminCard><AdminEmptyState title="Akses tidak tersedia" description="Akun ini tidak memiliki permission user.read atau user.manage."/></AdminCard>
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

    const summary = adminPageSummary(page, directory.users.length, directory.total)
    const activeCount = directory.users.filter((user) => user.status === 'active').length
    const privilegedCount = directory.users.filter((user) => user.roles.length > 0).length
    const hiddenParams = { q: params.q || '', role: params.role || '', status: params.status || '' }

    return (
        <AdminPage>
            <AdminPageHeader
                title="Users & Roles"
                description="Cari pengguna, lihat perannya, dan kelola akses. Setiap perubahan ditegakkan di database, termasuk penjagaan agar admin tidak mengunci akunnya sendiri."
                steps={['Cari pengguna', 'Beri peran atau ubah statusnya', 'Pantau pemegang peran di bawah']}
            />

            <AdminFeedbackBanner ok={params.ok} error={params.error}/>

            <section className="grid gap-3 sm:grid-cols-3">
                <AdminMetric label="Pengguna" value={directory.total} helper="Sesuai filter" icon={<Users size={18}/>} tone="blue"/>
                <AdminMetric label="Aktif" value={activeCount} helper="Dari baris halaman ini" icon={<UserCheck size={18}/>} tone="green"/>
                <AdminMetric label="Punya peran" value={privilegedCount} helper="Dari baris halaman ini" icon={<ShieldCheck size={18}/>} tone="violet"/>
            </section>

            <AdminListToolbar
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
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        step={1}
                        title="Daftar pengguna"
                        description={adminPageSummaryLabel(summary, 'pengguna')}
                    />
                </div>
                {directory.users.length === 0 ? (
                    page > 1 && summary.page > adminTotalPages(summary.total) ? (
                        <AdminEmptyState
                            title={`Tidak ada pengguna di halaman ${page}`}
                            description={`Daftar hanya punya ${adminTotalPages(summary.total)} halaman. Kembali ke halaman pertama atau ubah pencarian.`}
                            action={<Link className={adminSecondaryButtonClass} href={adminPageHref('/admin/users', hiddenParams, adminTotalPages(summary.total))}>Ke halaman terakhir</Link>}
                        />
                    ) : (
                        <AdminEmptyState title="Tidak ada pengguna" description="Tidak ada pengguna yang cocok dengan filter ini. Coba ubah kata kunci, peran, atau status."/>
                    )
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className={adminTableHeadClass}>
                                <tr>
                                    <AdminTh>Pengguna</AdminTh>
                                    <AdminTh>Peran</AdminTh>
                                    <AdminTh>Status</AdminTh>
                                    <AdminTh>Attempt</AdminTh>
                                    <AdminTh>Masuk terakhir</AdminTh>
                                    <AdminTh align="right">Tindakan</AdminTh>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {directory.users.map((user) => (
                                    <tr key={user.id} className="align-top transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="font-extrabold text-slate-900">{user.full_name}</div>
                                            <div className="mt-0.5 text-xs font-medium text-slate-500">{user.email || 'Email tidak tersedia'}</div>
                                            <div className="mt-0.5 text-[11px] font-medium text-slate-500">Terdaftar {formatDateTime(user.created_at)}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.roles.length === 0 ? <span className="text-xs font-bold text-slate-400">Tanpa peran</span> : user.roles.map((role) => (
                                                    <AdminBadge key={role} variant="violet" className="gap-1 py-0.5">
                                                        {roleLabel(role)}
                                                        {canManageRoles ? (
                                                            <form action={revokeUserRoleAction} className="inline-flex">
                                                                <input type="hidden" name="user_id" value={user.id}/>
                                                                <input type="hidden" name="role_code" value={role}/>
                                                                <input type="hidden" name="q" value={hiddenParams.q}/>
                                                                <input type="hidden" name="role" value={hiddenParams.role}/>
                                                                <input type="hidden" name="status" value={hiddenParams.status}/>
                                                                <ConfirmSubmit
                                                                            message={`Cabut peran ${roleLabel(role)} dari ${user.full_name}?`}
                                                                            detail="Akses yang diberikan peran ini langsung hilang pada permintaan berikutnya. Akun tidak bisa kehilangan peran terakhirnya bila itu akan mengunci sistem — penjagaan itu ditegakkan di database."
                                                                            confirmLabel="Cabut peran"
                                                                            trigger={<button type="button" className="text-violet-500 transition hover:text-red-600" title={`Cabut peran ${roleLabel(role)}`} aria-label={`Cabut peran ${roleLabel(role)}`}><UserX size={12}/></button>}
                                                                        />
                                                            </form>
                                                        ) : null}
                                                    </AdminBadge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <AdminStatusBadge status={user.status} label={userStatusLabel(user.status)}/>
                                        </td>
                                        <td className="px-4 py-4 font-bold tabular-nums text-slate-600">{user.attempt_count}</td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{formatDateTime(user.last_sign_in_at)}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col items-end gap-2">
                                                {canManageRoles ? (
                                                    <form action={assignUserRoleAction} className="flex items-center gap-1.5">
                                                        <input type="hidden" name="user_id" value={user.id}/>
                                                        <input type="hidden" name="q" value={hiddenParams.q}/>
                                                        <input type="hidden" name="role" value={hiddenParams.role}/>
                                                        <input type="hidden" name="status" value={hiddenParams.status}/>
                                                        <select className={`${adminInputClass} h-9 py-0 text-xs`} name="role_code" required defaultValue="" aria-label={`Peran baru untuk ${user.full_name}`}>
                                                            <option value="" disabled>Beri peran…</option>
                                                            {roles.filter((role) => !user.roles.includes(role.code)).map((role) => (
                                                                <option key={role.code} value={role.code}>{roleLabel(role.code)}</option>
                                                            ))}
                                                        </select>
                                                        <button className={`${adminSecondaryButtonClass} h-9 min-h-0 px-3 text-xs`}><Check size={14}/>Beri</button>
                                                    </form>
                                                ) : null}
                                                {canManageStatus ? (
                                                    <form action={setUserStatusAction} className="flex items-center gap-1.5">
                                                        <input type="hidden" name="user_id" value={user.id}/>
                                                        <input type="hidden" name="q" value={hiddenParams.q}/>
                                                        <input type="hidden" name="role" value={hiddenParams.role}/>
                                                        <input type="hidden" name="status" value={hiddenParams.status}/>
                                                        <select className={`${adminInputClass} h-9 py-0 text-xs`} name="status" defaultValue={user.status} aria-label={`Status untuk ${user.full_name}`}>
                                                            <option value="active">Aktif</option>
                                                            <option value="inactive">Nonaktif</option>
                                                            <option value="suspended">Ditangguhkan</option>
                                                        </select>
                                                        <ConfirmSubmit
                                                            message={`Ubah status akun ${user.full_name}?`}
                                                            detail={`Status saat ini: ${userStatusLabel(user.status)}. Akun nonaktif atau ditangguhkan tidak dapat masuk sampai statusnya dikembalikan. Penjagaan anti-lockout ditegakkan di database: admin tidak bisa menonaktifkan akunnya sendiri.`}
                                                            confirmLabel="Ubah status"
                                                            title="Konfirmasi perubahan status"
                                                            trigger={<button type="button" className={`${adminSecondaryButtonClass} h-9 min-h-0 px-3 text-xs`}>Ubah</button>}
                                                        />
                                                    </form>
                                                ) : null}
                                                {!canManageRoles && !canManageStatus ? <span className="text-xs font-bold text-slate-400">Hanya lihat</span> : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {directory.users.length > 0 ? (
                    <AdminPagination pathname="/admin/users" params={hiddenParams} summary={summary} noun="pengguna"/>
                ) : null}
            </AdminCard>

            <AdminCard className="p-5">
                <AdminSectionHeading step={2} title="Peran & permission" description="Komposisi peran yang tersedia. Perubahan peran di atas mengikuti daftar ini."/>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {roles.map((role) => (
                        <div key={role.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-sm font-black text-slate-900">{roleLabel(role.code)}</div>
                                    <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{role.code}</div>
                                </div>
                                <AdminBadge variant={role.holder_count > 0 ? 'blue' : 'neutral'}>{role.holder_count} pemegang</AdminBadge>
                            </div>
                            {role.description ? <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{role.description}</p> : null}
                            <div className="mt-3 flex flex-wrap gap-1">
                                {role.permissions.map((permission) => (
                                    <span key={permission} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">{permission}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </AdminCard>

            {!canManageRoles ? (
                <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
                    <summary className="cursor-pointer select-none">Catatan akses</summary>
                    <p className="mt-2 leading-6">
                        Memberi atau mencabut peran memerlukan permission <code className="font-mono">role.manage</code>, yang hanya dimiliki SUPER_ADMIN.
                        {canManageStatus ? ' Anda tetap dapat mengubah status akun.' : ''}
                    </p>
                </details>
            ) : null}
        </AdminPage>
    )
}
