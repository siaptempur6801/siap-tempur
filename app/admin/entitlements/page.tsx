import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Coins, Plus, Search, Ticket, TriangleAlert, UserCheck, Wallet } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminButtonClass,

    adminInputClass,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import {
    adminPlatformService,
    entitlementStatusLabel,
    transactionSourceLabel,
    walletTypeLabel,
} from '@/src/services/admin-platform.service'
import { adjustWalletAction, upsertVoucherAction } from '@/app/actions/admin-platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Entitlements — token, voucher, dan pass.
 *
 * Halaman ini mengisi permission `entitlement.manage` yang dipegang FINANCE dan
 * ADMIN. Sebelumnya tidak ada UI sama sekali, padahal produksi memegang 426
 * dompet `exam_token_cpns` berisi 5.087 token, 87 transaksi, 6 voucher, dan 307
 * klaim voucher — semuanya hanya bisa dikelola lewat SQL langsung.
 *
 * Otorisasi rincinya ada di database. Yang paling penting:
 * `admin_adjust_wallet` MENOLAK penyesuaian dompet sendiri, karena token
 * bernilai uang dan mem bolehkannya sama dengan memberi akses cetak uang.
 * Halaman ini menyembunyikan tombolnya untuk dompet sendiri supaya tidak
 * menawarkan aksi yang pasti ditolak.
 */

type SearchParams = {
    q?: string
    wallet_type?: string
    user?: string
    status?: string
    voucher?: string
    ok?: string
    error?: string
}

const WALLET_TYPES = ['exam_token_cpns', 'exam_token_tka', 'exam_token'] as const

function fmt(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date)
}

function fmtDate(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(date)
}

function number(value: number) {
    return new Intl.NumberFormat('id-ID').format(value)
}

const STATUS_VARIANT: Record<string, 'green' | 'neutral' | 'red' | 'orange'> = {
    active: 'green',
    expired: 'neutral',
    revoked: 'red',
    pending: 'orange',
}

export default async function AdminEntitlementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    if (!permissions.has(PERMISSIONS.ENTITLEMENT_MANAGE)) {
        redirect('/cpns/dashboard?admin=no-access')
    }

    const actorId = authorization.userId
    const selectedUserId = params.user || null

    const [overview, wallets, vouchers, entitlements, transactions] = await Promise.all([
        adminPlatformService.getEntitlementOverview(),
        adminPlatformService.listWallets({ search: params.q || null, walletType: params.wallet_type || null, limit: 50 }),
        adminPlatformService.listVouchers(),
        adminPlatformService.listEntitlements({ status: params.status || null, limit: 50 }),
        selectedUserId
            ? adminPlatformService.listWalletTransactions({ userId: selectedUserId, limit: 25 })
            : Promise.resolve({ transactions: [], total: 0 }),
    ])

    const totalBalance = overview.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
    const selectedWallet = selectedUserId ? wallets.wallets.find((wallet) => wallet.user_id === selectedUserId) ?? null : null
    const editingVoucher = params.voucher ? vouchers.find((voucher) => voucher.id === params.voucher) ?? null : null
    const isSelf = selectedUserId === actorId

    const backQuery = new URLSearchParams()
    if (params.q) backQuery.set('q', params.q)
    if (params.wallet_type) backQuery.set('wallet_type', params.wallet_type)
    if (params.status) backQuery.set('status', params.status)
    const hidden = (
        <>
            <input type="hidden" name="q" value={params.q || ''}/>
            <input type="hidden" name="wallet_type" value={params.wallet_type || ''}/>
            <input type="hidden" name="status" value={params.status || ''}/>
        </>
    )

    return (
        <div className="space-y-5 pb-10">
            <AdminPageHeader
                title="Entitlements"
                description="Kelola token ujian, voucher, dan pass yang dimiliki pengguna. Setiap penyesuaian saldo tercatat permanen di riwayat dompet."
            />

            {(params.ok || params.error) ? (
                <div role="status" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm', params.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                    {params.error ? <TriangleAlert className="mt-0.5 shrink-0" size={17}/> : null}
                    <span>{params.error || params.ok}</span>
                </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <AdminMetric label="Total token" value={number(totalBalance)} helper="Seluruh tipe dompet" icon={<Coins size={18}/>} tone="green"/>
                <AdminMetric label="Dompet" value={number(overview.wallets.reduce((sum, wallet) => sum + wallet.wallets, 0))} helper={`${overview.wallets.length} tipe`} icon={<Wallet size={18}/>} tone="blue"/>
                <AdminMetric label="Voucher aktif" value={overview.vouchers_active} helper={`${overview.vouchers_total} voucher total`} icon={<Ticket size={18}/>} tone="violet"/>
                <AdminMetric label="Klaim voucher" value={number(overview.voucher_claims)} helper="Sepanjang waktu" icon={<UserCheck size={18}/>} tone="neutral"/>
                <AdminMetric label="Pass aktif" value={overview.entitlements_active} helper={`${overview.entitlements_total} entitlement`} icon={<Coins size={18}/>} tone={overview.entitlements_active > 0 ? 'green' : 'neutral'}/>
            </section>

            {overview.wallets.length > 0 ? (
                <AdminCard className="p-5">
                    <AdminSectionHeading title="Saldo per tipe dompet" description="Token yang beredar dan belum terpakai."/>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {overview.wallets.map((wallet) => (
                            <div key={wallet.wallet_type} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{walletTypeLabel(wallet.wallet_type)}</div>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{number(wallet.balance)}</span>
                                    <span className="text-xs font-bold text-slate-400">token</span>
                                </div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">{number(wallet.wallets)} dompet</div>
                                <div className="mt-1 font-mono text-[10px] font-semibold text-slate-400">{wallet.wallet_type}</div>
                            </div>
                        ))}
                    </div>
                </AdminCard>
            ) : null}

            {/* ---------------------------------------------------------- voucher */}
            <AdminCard className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                    <AdminSectionHeading title="Voucher" description="Kuota token yang bisa diklaim pengguna dengan kode."/>
                    <Link className={adminPrimaryButtonClass} href="/admin/entitlements?voucher=new"><Plus size={16}/>Voucher baru</Link>
                </div>

                {editingVoucher || params.voucher === 'new' ? (
                    <form action={upsertVoucherAction} className="grid gap-4 border-b border-slate-200 bg-blue-50/40 p-5 lg:grid-cols-3">
                        {hidden}
                        <input type="hidden" name="voucher_id" value={editingVoucher?.id ?? ''}/>
                        <label className="space-y-1.5 lg:col-span-1">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Kode</span>
                            <input className={adminInputClass} name="code" required defaultValue={editingVoucher?.code ?? ''} placeholder="PROMO-2026"/>
                            <span className="block text-[11px] font-medium text-slate-400">3–32 karakter: A–Z, 0–9, _ atau -</span>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Kuota token</span>
                            <input className={adminInputClass} name="quota_amount" type="number" min="1" required defaultValue={editingVoucher?.quota_amount ?? 10}/>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Batas pemakaian</span>
                            <input className={adminInputClass} name="max_uses" type="number" min="1" required defaultValue={editingVoucher?.max_uses ?? 100}/>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Berlaku untuk</span>
                            <select className={adminInputClass} name="wallet_type" defaultValue={editingVoucher?.wallet_type ?? ''}>
                                <option value="">Semua program</option>
                                <option value="exam_token_cpns">Token CPNS</option>
                                <option value="exam_token_tka">Token TKA</option>
                            </select>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Kedaluwarsa</span>
                            <input className={adminInputClass} name="expires_at" type="date" defaultValue={editingVoucher?.expires_at ? editingVoucher.expires_at.slice(0, 10) : ''}/>
                        </label>
                        <label className="flex items-center gap-2 pt-6">
                            <input type="checkbox" name="is_active" defaultChecked={editingVoucher ? editingVoucher.is_active : true} className="h-4 w-4 rounded border-slate-300"/>
                            <span className="text-sm font-bold text-slate-700">Aktif</span>
                        </label>
                        <div className="flex flex-wrap items-end gap-2 lg:col-span-3">
                            <button className={adminPrimaryButtonClass}>{editingVoucher ? 'Simpan voucher' : 'Buat voucher'}</button>
                            <Link className={adminSecondaryButtonClass} href={`/admin/entitlements?${backQuery.toString()}`}>Batal</Link>
                            {editingVoucher && editingVoucher.claims > 0 ? (
                                <span className="text-xs font-semibold text-amber-700">Sudah {editingVoucher.claims} klaim — kode tidak bisa diubah lagi.</span>
                            ) : null}
                        </div>
                    </form>
                ) : null}

                {vouchers.length === 0 ? (
                    <AdminEmptyState title="Belum ada voucher" description="Buat voucher pertama untuk membagikan token lewat kode."/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Kode</th>
                                    <th className="px-4 py-3">Kuota</th>
                                    <th className="px-4 py-3">Pemakaian</th>
                                    <th className="px-4 py-3">Token diberikan</th>
                                    <th className="px-4 py-3">Berlaku</th>
                                    <th className="px-4 py-3">Kedaluwarsa</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {vouchers.map((voucher) => (
                                    <tr key={voucher.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="font-mono text-sm font-black text-slate-900">{voucher.code}</div>
                                            <AdminBadge variant={voucher.is_active ? 'green' : 'neutral'} className="mt-1">{voucher.is_active ? 'Aktif' : 'Nonaktif'}</AdminBadge>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-700">{number(voucher.quota_amount)}</td>
                                        <td className="px-4 py-4 font-bold text-slate-600">{voucher.used_count} / {voucher.max_uses}</td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-emerald-700">{number(voucher.tokens_granted)}</div>
                                            {voucher.tokens_source === 'estimated' ? (
                                                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600" title="Klaim ini diwarisi dari migrasi legacy dan tidak punya baris di buku besar dompet, jadi angkanya diperkirakan dari klaim × kuota.">perkiraan</div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{voucher.wallet_type ? walletTypeLabel(voucher.wallet_type) : 'Semua program'}</td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{fmtDate(voucher.expires_at)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Link className="text-xs font-extrabold text-blue-600 hover:text-blue-700" href={`/admin/entitlements?${(() => { const query = new URLSearchParams(backQuery); query.set('voucher', voucher.id); return query.toString() })()}`}>Ubah</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminCard>

            {/* ----------------------------------------------------------- dompet */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading title="Dompet pengguna" description="Cari pengguna, periksa saldonya, lalu sesuaikan bila perlu."/>
                    <form className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1.6fr)_1fr_auto]" method="get">
                        <label className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input className={`${adminInputClass} pl-9`} name="q" defaultValue={params.q || ''} placeholder="Cari nama atau email..." aria-label="Cari pengguna"/>
                        </label>
                        <select className={adminInputClass} name="wallet_type" defaultValue={params.wallet_type || ''} aria-label="Filter tipe dompet">
                            <option value="">Semua tipe dompet</option>
                            {WALLET_TYPES.map((type) => <option key={type} value={type}>{walletTypeLabel(type)}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button className={adminButtonClass}>Cari</button>
                            <Link className={adminSecondaryButtonClass} href="/admin/entitlements">Reset</Link>
                        </div>
                    </form>
                </div>

                {wallets.wallets.length === 0 ? (
                    <AdminEmptyState title="Tidak ada dompet" description="Tidak ada dompet yang cocok dengan filter ini."/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Pengguna</th>
                                    <th className="px-4 py-3">Tipe</th>
                                    <th className="px-4 py-3 text-right">Saldo</th>
                                    <th className="px-4 py-3">Diperbarui</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {wallets.wallets.map((wallet) => (
                                    <tr key={wallet.id} className={cn('transition hover:bg-slate-50/70', wallet.user_id === selectedUserId && 'bg-blue-50/60')}>
                                        <td className="px-5 py-4">
                                            <div className="font-extrabold text-slate-900">{wallet.full_name}</div>
                                            <div className="mt-0.5 text-xs font-medium text-slate-500">{wallet.email || 'Email tidak tersedia'}</div>
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-slate-600">{walletTypeLabel(wallet.wallet_type)}</td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={cn('text-base font-black', wallet.balance > 0 ? 'text-emerald-700' : 'text-slate-400')}>{number(wallet.balance)}</span>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{fmt(wallet.updated_at)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Link className="text-xs font-extrabold text-blue-600 hover:text-blue-700" href={`/admin/entitlements?${(() => { const query = new URLSearchParams(backQuery); query.set('user', wallet.user_id); return query.toString() })()}`}>Kelola</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedUserId ? (
                    <div className="border-t border-slate-200 bg-slate-50/70 p-5">
                        <AdminSectionHeading
                            title="Riwayat & penyesuaian"
                            description={selectedWallet ? `${selectedWallet.full_name} · ${walletTypeLabel(selectedWallet.wallet_type)} · saldo ${number(selectedWallet.balance)}` : 'Pengguna ini belum punya dompet; penyesuaian pertama akan membuatnya.'}
                            action={<Link className="text-sm font-extrabold text-slate-500 hover:text-slate-800" href={`/admin/entitlements?${backQuery.toString()}`}>Tutup</Link>}
                        />

                        {isSelf ? (
                            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                                Ini dompet Anda sendiri. Penyesuaian saldo untuk diri sendiri ditolak oleh database — token bernilai uang,
                                jadi mem bolehkannya sama dengan memberi akses cetak uang. Minta pemegang <code className="font-mono">entitlement.manage</code> lain bila memang perlu.
                            </p>
                        ) : (
                            <form action={adjustWalletAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_1fr_1.6fr_auto]">
                                {hidden}
                                <input type="hidden" name="user_id" value={selectedUserId}/>
                                <label className="space-y-1.5">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Jumlah</span>
                                    <input className={adminInputClass} name="amount" type="number" required placeholder="mis. 10 atau -5"/>
                                    <span className="block text-[11px] font-medium text-slate-400">Positif menambah, negatif mengurangi. Maks 1.000.000.</span>
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Tipe dompet</span>
                                    <select className={adminInputClass} name="wallet_type" defaultValue={selectedWallet?.wallet_type ?? (params.wallet_type || 'exam_token_cpns')} aria-label="Tipe dompet">
                                        {WALLET_TYPES.map((type) => <option key={type} value={type}>{walletTypeLabel(type)}</option>)}
                                    </select>
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Alasan (wajib)</span>
                                    <input className={adminInputClass} name="reason" required minLength={3} placeholder="mis. kompensasi gangguan tryout"/>
                                </label>
                                <div className="flex items-end">
                                    <button className={adminPrimaryButtonClass}><Coins size={16}/>Sesuaikan</button>
                                </div>
                            </form>
                        )}

                        <div className="mt-4">
                            <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Riwayat transaksi ({transactions.total})</div>
                            {transactions.transactions.length === 0 ? (
                                <p className="mt-2 text-sm font-semibold text-slate-500">Belum ada transaksi untuk pengguna ini.</p>
                            ) : (
                                <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    {transactions.transactions.map((tx) => (
                                        <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-extrabold text-slate-800">{transactionSourceLabel(tx.source_type)}</div>
                                                <div className="mt-0.5 text-xs font-medium text-slate-400">{fmt(tx.created_at)}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={cn('font-mono text-sm font-black', tx.amount > 0 ? 'text-emerald-700' : 'text-red-600')}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                                                <span className="text-xs font-bold text-slate-400">saldo {number(tx.balance_after)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </AdminCard>

            {/* ------------------------------------------------------------- pass */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading title="Pass & entitlement" description="Akses fitur yang dimiliki pengguna, biasanya berasal dari pembelian atau event."/>
                    <form className="mt-4 flex flex-wrap gap-3" method="get">
                        {params.q ? <input type="hidden" name="q" value={params.q}/> : null}
                        <select className={`${adminInputClass} max-w-56`} name="status" defaultValue={params.status || ''} aria-label="Filter status">
                            <option value="">Semua status</option>
                            <option value="active">Aktif</option>
                            <option value="expired">Kedaluwarsa</option>
                            <option value="revoked">Dicabut</option>
                            <option value="pending">Menunggu</option>
                        </select>
                        <button className={adminButtonClass}>Terapkan</button>
                    </form>
                </div>

                {entitlements.entitlements.length === 0 ? (
                    <AdminEmptyState title="Tidak ada entitlement" description="Belum ada pass atau hak akses fitur yang tercatat untuk filter ini."/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Pengguna</th>
                                    <th className="px-4 py-3">Fitur</th>
                                    <th className="px-4 py-3">Sumber</th>
                                    <th className="px-4 py-3">Pemakaian</th>
                                    <th className="px-4 py-3">Berlaku sampai</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entitlements.entitlements.map((item) => (
                                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="font-extrabold text-slate-900">{item.full_name}</div>
                                            <div className="mt-0.5 text-xs font-medium text-slate-500">{item.email || 'Email tidak tersedia'}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-slate-700">{item.feature_name || item.feature_code || '—'}</div>
                                            {item.feature_code ? <div className="font-mono text-[10px] font-semibold text-slate-400">{item.feature_code}</div> : null}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{item.source_type || '—'}</td>
                                        <td className="px-4 py-4 font-bold text-slate-600">
                                            {item.usage_count}{item.usage_limit == null ? '' : ` / ${item.usage_limit}`}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-500">{fmtDate(item.expires_at)}</td>
                                        <td className="px-5 py-4"><AdminBadge variant={STATUS_VARIANT[item.status] || 'neutral'}>{entitlementStatusLabel(item.status)}</AdminBadge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminCard>

            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-6 text-slate-500">
                Halaman ini memerlukan permission <code className="font-mono">entitlement.manage</code>.
                Setiap penyesuaian saldo menulis baris <code className="font-mono">wallet_transactions</code> dengan sumber
                {' '}<code className="font-mono">admin_adjustment</code>, sehingga riwayatnya tidak bisa hilang.
                Penyesuaian dompet sendiri ditolak oleh database.
            </p>
        </div>
    )
}
