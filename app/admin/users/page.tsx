import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check, Search, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminButtonClass,
    adminInputClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'
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
    ok?: string
    error?: string
}

const STATUS_VARIANT: Record<string, 'green' | 'neutral' | 'red'> = {
    active: 'green',
    inactive: 'neutral',
    suspended: 'red',
}

function fmt(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(date)
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    const canRead = permissions.has(PERMISSIONS.USER_READ) || permissions.has(PERMISSIONS.USER_MANAGE)
    const canManageStatus = permissions.has(PERMISSIONS.USER_MANAGE)
    const canManageRoles = permissions.has(PERMISSIONS.ROLE_MANAGE)

    if (!canRead) redirect('/cpns/dashboard?admin=no-access')

    const filters = {
        search: params.q || null,
        role: params.role || null,
        status: params.status || null,
        limit: 100,
    }

    const [directory, roles] = await Promise.all([
        adminDirectoryService.listUsers(filters),
        adminDirectoryService.listRoles(),
    ])

    const activeCount = directory.users.filter((user) => user.status === 'active').length
    const privilegedCount = directory.users.filter((user) => user.roles.length > 0).length
    const hiddenParams = { q: params.q || '', role: params.role || '', status: params.status || '' }

    return (
        <div className="space-y-5 pb-10">
            <AdminPageHeader
                title="Users & Roles"
                description="Cari pengguna, lihat perannya, dan kelola akses. Setiap perubahan ditegakkan di database, termasuk penjagaan agar admin tidak mengunci akunnya sendiri."
            />

            {(params.ok || params.error) ? (
                <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm font-bold shadow-sm', params.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                    {params.error || params.ok}
                </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-3">
                <AdminMetric label="Pengguna" value={directory.total} helper="Sesuai filter" icon={<Users size={18}/>} tone="blue"/>
                <AdminMetric label="Aktif" value={activeCount} helper="Dari yang termuat" icon={<UserCheck size={18}/>} tone="green"/>
                <AdminMetric label="Punya peran" value={privilegedCount} helper="Pemegang akses admin" icon={<ShieldCheck size={18}/>} tone="violet"/>
            </section>

            <AdminCard className="p-4">
                <form className="grid gap-3 md:grid-cols-[minmax(220px,1.6fr)_1fr_1fr_auto]" method="get">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input className={`${adminInputClass} pl-9`} name="q" defaultValue={params.q || ''} placeholder="Cari nama atau email..." aria-label="Cari pengguna"/>
                    </label>
                    <select className={adminInputClass} name="role" defaultValue={params.role || ''} aria-label="Filter peran">
                        <option value="">Semua peran</option>
                        {roles.map((role) => <option key={role.code} value={role.code}>{roleLabel(role.code)}</option>)}
                    </select>
                    <select className={adminInputClass} name="status" defaultValue={params.status || ''} aria-label="Filter status">
                        <option value="">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                        <option value="suspended">Ditangguhkan</option>
                    </select>
                    <div className="flex gap-2">
                        <button className={adminButtonClass}>Terapkan</button>
                        <Link className={adminSecondaryButtonClass} href="/admin/users">Reset</Link>
                    </div>
                </form>
            </AdminCard>

            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        title="Daftar pengguna"
                        description={`${directory.users.length} dari ${directory.total} pengguna ditampilkan.`}
                    />
                </div>
                {directory.users.length === 0 ? (
                    <AdminEmptyState title="Tidak ada pengguna" description="Tidak ada pengguna yang cocok dengan filter ini. Coba ubah kata kunci, peran, atau status."/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Pengguna</th>
                                    <th className="px-4 py-3">Peran</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Attempt</th>
                                    <th className="px-4 py-3">Masuk terakhir</th>
                                    <th className="px-5 py-3 text-right">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {directory.users.map((user) => (
                                    <tr key={user.id} className="align-top transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="font-extrabold text-slate-900">{user.full_name}</div>
                                            <div className="mt-0.5 text-xs font-medium text-slate-500">{user.email || 'Email tidak tersedia'}</div>
                                            <div className="mt-0.5 text-[11px] font-medium text-slate-400">Terdaftar {fmt(user.created_at)}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.roles.length === 0 ? <span className="text-xs font-bold text-slate-400">Tanpa peran</span> : user.roles.map((role) => (
                                                    <span key={role} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                                        {roleLabel(role)}
                                                        {canManageRoles ? (
                                                            <form action={revokeUserRoleAction} className="inline-flex">
                                                                <input type="hidden" name="user_id" value={user.id}/>
                                                                <input type="hidden" name="role_code" value={role}/>
                                                                <input type="hidden" name="q" value={hiddenParams.q}/>
                                                                <input type="hidden" name="role" value={hiddenParams.role}/>
                                                                <input type="hidden" name="status" value={hiddenParams.status}/>
                                                                <button className="text-violet-500 transition hover:text-red-600" title={`Cabut peran ${roleLabel(role)}`} aria-label={`Cabut peran ${roleLabel(role)}`}><UserX size={12}/></button>
                                                            </form>
                                                        ) : null}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <AdminBadge variant={STATUS_VARIANT[user.status] || 'neutral'}>{userStatusLabel(user.status)}</AdminBadge>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-600">{user.attempt_count}</td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{fmt(user.last_sign_in_at)}</td>
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
                                                        <button className={`${adminButtonClass} h-9 min-h-0 px-3 text-xs`}><Check size={14}/>Beri</button>
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
                                                        <button className={`${adminSecondaryButtonClass} h-9 min-h-0 px-3 text-xs`}>Ubah</button>
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
            </AdminCard>

            <AdminCard className="p-5">
                <AdminSectionHeading title="Peran & permission" description="Komposisi peran yang tersedia. Perubahan peran di atas mengikuti daftar ini."/>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {roles.map((role) => (
                        <div key={role.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-sm font-black text-slate-900">{roleLabel(role.code)}</div>
                                    <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{role.code}</div>
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
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
                    Memberi atau mencabut peran memerlukan permission <code className="font-mono">role.manage</code>, yang hanya dimiliki SUPER_ADMIN.
                    {canManageStatus ? ' Anda tetap dapat mengubah status akun.' : ''}
                </p>
            ) : null}
        </div>
    )
}
