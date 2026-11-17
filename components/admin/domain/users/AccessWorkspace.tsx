import { adjustWalletAction, upsertVoucherAction } from '@/app/actions/admin-platform'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import AdminSubmitButton from '@/components/admin/AdminSubmitButton'
import AdminWorkspaceTabs from '@/components/admin/AdminWorkspaceTabs'
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
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { formatDate, formatDateTime, formatNumber } from '@/lib/admin-format'
import { adminPageSummary, parseAdminPage } from '@/lib/admin-pagination'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import {
  getAdminUserAccess,
  getAdminUserDetail,
} from '@/src/services/admin-context-details.service'
import {
  adminPlatformService,
  entitlementStatusLabel,
  transactionSourceLabel,
  walletTypeLabel,
} from '@/src/services/admin-platform.service'
import { authorizationService } from '@/src/services/authorization.service'
import { Coins, Plus, Ticket, UserCheck, Wallet } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

/**
 * Entitlements — token, voucher, dan hak akses fitur.
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
  wallet_q?: string
  entitlement_q?: string
  wallet_type?: string
  user?: string
  status?: string
  voucher?: string
  wallet_page?: string
  entitlement_page?: string
  ok?: string
  error?: string
}

const WALLET_TYPES = ['exam_token_cpns', 'exam_token_tka', 'exam_token'] as const

const LIST_PAGE_SIZE = 50

function parseListPage(value: string | undefined) {
  const page = parseAdminPage(value)
  return { page, offset: (page - 1) * LIST_PAGE_SIZE }
}

const ENTITLEMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'revoked', label: 'Dicabut' },
  { value: 'pending', label: 'Menunggu' },
] as const

export default async function AdminEntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const authorization = await authorizationService.requireAuthenticated()
  const permissions = new Set(authorization.permissions)

  if (!permissions.has(PERMISSIONS.ENTITLEMENT_MANAGE)) {
    return (
      <AdminPage>
        <AdminPageHeader
          title="Akses dan token"
          description="Kelola token ujian, voucher, dan hak akses fitur yang dimiliki pengguna."
        />
        <AdminCard>
          <AdminEmptyState
            title="Akses tidak tersedia"
            description="Akun ini tidak memiliki permission entitlement.manage."
          />
        </AdminCard>
      </AdminPage>
    )
  }

  const actorId = authorization.userId
  const selectedUserId = params.user || null
  const walletSearch = params.wallet_q ?? params.q ?? ''
  const entitlementSearch = params.entitlement_q ?? params.q ?? ''

  const selectedData = selectedUserId
    ? Promise.all([getAdminUserDetail(selectedUserId), getAdminUserAccess(selectedUserId)])
    : null

  const [overview, wallets, vouchers, entitlements, transactions] = await Promise.all([
    adminPlatformService.getEntitlementOverview(),
    selectedData
      ? selectedData.then(([user, access]) => ({
          wallets: access.wallets
            .filter((wallet) => !params.wallet_type || wallet.wallet_type === params.wallet_type)
            .map((wallet) => ({
              id: String(wallet.id),
              user_id: selectedUserId!,
              wallet_type: String(wallet.wallet_type),
              balance: Number(wallet.balance),
              updated_at: wallet.updated_at ? String(wallet.updated_at) : null,
              full_name: user?.full_name || user?.display_name || 'Pengguna',
              email: null,
            })),
          total: access.wallets.filter(
            (wallet) => !params.wallet_type || wallet.wallet_type === params.wallet_type,
          ).length,
        }))
      : adminPlatformService.listWallets({
          search: walletSearch || null,
          walletType: params.wallet_type || null,
          limit: 50,
          offset: parseListPage(params.wallet_page).offset,
        }),
    adminPlatformService.listVouchers(),
    selectedData
      ? selectedData.then(([user, access]) => {
          const rows = access.entitlements
            .filter((item) => !params.status || item.status === params.status)
            .filter(
              (item) =>
                !entitlementSearch ||
                `${user?.full_name || user?.display_name || ''} ${item.feature_name || ''} ${item.feature_code || ''}`
                  .toLowerCase()
                  .includes(entitlementSearch.toLowerCase()),
            )
            .map((item) => ({
              ...item,
              user_id: selectedUserId!,
              full_name: user?.full_name || user?.display_name || 'Pengguna',
              email: null,
            }))
          const offset = parseListPage(params.entitlement_page).offset
          return { entitlements: rows.slice(offset, offset + LIST_PAGE_SIZE), total: rows.length }
        })
      : adminPlatformService.listEntitlements({
          search: entitlementSearch || null,
          status: params.status || null,
          limit: 50,
          offset: parseListPage(params.entitlement_page).offset,
        }),
    selectedUserId
      ? adminPlatformService.listWalletTransactions({
          userId: selectedUserId,
          walletType: params.wallet_type || null,
          limit: 25,
        })
      : Promise.resolve({ transactions: [], total: 0 }),
  ])

  const totalBalance = overview.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
  const selectedWallet = selectedUserId ? (wallets.wallets[0] ?? null) : null
  const editingVoucher = params.voucher
    ? (vouchers.find((voucher) => voucher.id === params.voucher) ?? null)
    : null
  const isSelf = selectedUserId === actorId

  const backQuery = new URLSearchParams()
  if (walletSearch) backQuery.set('wallet_q', walletSearch)
  if (entitlementSearch) backQuery.set('entitlement_q', entitlementSearch)
  if (params.wallet_type) backQuery.set('wallet_type', params.wallet_type)
  if (params.status) backQuery.set('status', params.status)
  if (selectedUserId) backQuery.set('user', selectedUserId)
  if (params.wallet_page) backQuery.set('wallet_page', params.wallet_page)
  if (params.entitlement_page) backQuery.set('entitlement_page', params.entitlement_page)
  const hidden = (
    <>
      <input type="hidden" name="return_wallet_q" value={walletSearch} />
      <input type="hidden" name="return_entitlement_q" value={entitlementSearch} />
      <input type="hidden" name="return_wallet_type" value={params.wallet_type || ''} />
      <input type="hidden" name="return_status" value={params.status || ''} />
      <input type="hidden" name="return_user" value={selectedUserId || ''} />
      <input type="hidden" name="return_wallet_page" value={params.wallet_page || ''} />
      <input type="hidden" name="return_entitlement_page" value={params.entitlement_page || ''} />
    </>
  )

  return (
    <AdminPage>
      <AdminPageHeader
        title="Akses dan token"
        description="Kelola token ujian, voucher, dan hak akses fitur yang dimiliki pengguna. Semua penyalur token lewat voucher dan penyesuaian saldo tercatat permanen di buku besar dompet."
      />
      <AdminWorkspaceTabs workspace="users" permissions={authorization.permissions} />

      <AdminFeedbackBanner ok={params.ok} error={params.error} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <AdminMetric
          label="Total token"
          value={formatNumber(totalBalance)}
          helper="Seluruh tipe dompet"
          icon={<Coins size={18} />}
          tone="green"
        />
        <AdminMetric
          label="Dompet"
          value={formatNumber(overview.wallets.reduce((sum, wallet) => sum + wallet.wallets, 0))}
          helper={`${overview.wallets.length} tipe`}
          icon={<Wallet size={18} />}
          tone="blue"
        />
        <AdminMetric
          label="Voucher aktif"
          value={formatNumber(overview.vouchers_active)}
          helper={`${formatNumber(overview.vouchers_total)} voucher total`}
          icon={<Ticket size={18} />}
          tone="violet"
        />
        <AdminMetric
          label="Klaim voucher"
          value={formatNumber(overview.voucher_claims)}
          helper="Sepanjang waktu"
          icon={<UserCheck size={18} />}
          tone="neutral"
        />
      </section>

      {overview.wallets.length > 0 ? (
        <AdminCard className="p-5">
          <AdminSectionHeading
            title="Saldo per tipe dompet"
            description="Token yang beredar dan belum terpakai."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overview.wallets.map((wallet) => (
              <div
                key={wallet.wallet_type}
                className="rounded-lg border border-border bg-muted p-4"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {walletTypeLabel(wallet.wallet_type)}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">
                    {formatNumber(wallet.balance)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">token</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground">
                  {formatNumber(wallet.wallets)} dompet
                </div>
                <div className="mt-1 font-mono text-[10px] font-semibold text-muted-foreground">
                  {wallet.wallet_type}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      {/* ---------------------------------------------------------- voucher */}
      <AdminCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <AdminSectionHeading
            title="Voucher"
            description="Kuota token yang bisa diklaim pengguna dengan kode."
          />
          <Link
            className={adminPrimaryButtonClass}
            href={`/admin/users/access?${(() => {
              const query = new URLSearchParams(backQuery)
              query.set('voucher', 'new')
              return query.toString()
            })()}`}
          >
            <Plus size={16} />
            Voucher baru
          </Link>
        </div>

        {editingVoucher || params.voucher === 'new' ? (
          <form
            action={upsertVoucherAction}
            className="grid gap-4 border-b border-border bg-info-muted/40 p-5 lg:grid-cols-3"
          >
            {hidden}
            <input type="hidden" name="voucher_id" value={editingVoucher?.id ?? ''} />
            <label className="space-y-1.5 lg:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Kode
              </span>
              <input
                className={adminInputClass}
                name="code"
                required
                minLength={3}
                maxLength={32}
                pattern="[A-Z0-9][A-Z0-9_-]{2,31}"
                autoCapitalize="characters"
                readOnly={Boolean(editingVoucher && editingVoucher.claims > 0)}
                defaultValue={editingVoucher?.code ?? ''}
                placeholder="PROMO-2026"
              />
              <span className="block text-[11px] font-medium text-muted-foreground">
                3–32 karakter: A–Z, 0–9, _ atau -
              </span>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Kuota token
              </span>
              <input
                className={adminInputClass}
                name="quota_amount"
                type="number"
                min="1"
                step="1"
                required
                defaultValue={editingVoucher?.quota_amount ?? 10}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Batas pemakaian
              </span>
              <input
                className={adminInputClass}
                name="max_uses"
                type="number"
                min={Math.max(1, editingVoucher?.claims ?? 1)}
                step="1"
                required
                defaultValue={Math.max(
                  editingVoucher?.max_uses ?? 100,
                  editingVoucher?.claims ?? 0,
                )}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Berlaku untuk
              </span>
              <select
                className={adminInputClass}
                name="wallet_type"
                defaultValue={editingVoucher?.wallet_type ?? ''}
              >
                <option value="">Semua program</option>
                <option value="exam_token_cpns">Token CPNS</option>
                <option value="exam_token_tka">Token TKA</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Kedaluwarsa
              </span>
              <input
                className={adminInputClass}
                name="expires_at"
                type="date"
                defaultValue={
                  editingVoucher?.expires_at ? editingVoucher.expires_at.slice(0, 10) : ''
                }
              />
            </label>
            <label className="flex items-center gap-2 lg:pt-6">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editingVoucher ? editingVoucher.is_active : true}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium text-foreground">Aktif</span>
            </label>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-3">
              <AdminSubmitButton pendingLabel="Menyimpan voucher...">
                {editingVoucher ? 'Simpan voucher' : 'Buat voucher'}
              </AdminSubmitButton>
              <Link
                className={adminSecondaryButtonClass}
                href={`/admin/users/access?${backQuery.toString()}`}
              >
                Batal
              </Link>
              {editingVoucher && editingVoucher.claims > 0 ? (
                <span className="text-xs font-semibold text-warning">
                  Sudah {editingVoucher.claims} klaim — kode tidak bisa diubah lagi.
                </span>
              ) : null}
            </div>
          </form>
        ) : null}

        {vouchers.length === 0 ? (
          <AdminEmptyState
            title="Belum ada voucher"
            description="Buat voucher pertama untuk membagikan token lewat kode."
          />
        ) : (
          <AdminDataTable className="w-full min-w-[900px] text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <AdminTh>Kode</AdminTh>
                <AdminTh align="right">Kuota</AdminTh>
                <AdminTh align="right">Pemakaian</AdminTh>
                <AdminTh align="right">Token diberikan</AdminTh>
                <AdminTh>Berlaku</AdminTh>
                <AdminTh>Kedaluwarsa</AdminTh>
                <AdminTh align="right">Aksi</AdminTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vouchers.map((voucher) => (
                <tr key={voucher.id} className="transition hover:bg-muted/70">
                  <td className="px-5 py-4">
                    <div className="font-mono text-sm font-semibold text-foreground">
                      {voucher.code}
                    </div>
                    <AdminBadge variant={voucher.is_active ? 'green' : 'neutral'} className="mt-1">
                      {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4 text-right font-bold tabular-nums text-foreground">
                    {formatNumber(voucher.quota_amount)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold tabular-nums text-muted-foreground">
                    {voucher.used_count} / {voucher.max_uses}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-right font-bold tabular-nums text-success">
                      {formatNumber(voucher.tokens_granted)}
                    </div>
                    {voucher.tokens_source === 'estimated' ? (
                      <div
                        className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-warning"
                        title="Klaim ini diwarisi dari migrasi legacy dan tidak punya baris di buku besar dompet, jadi angkanya diperkirakan dari klaim × kuota."
                      >
                        perkiraan
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-medium text-muted-foreground">
                    {voucher.wallet_type ? walletTypeLabel(voucher.wallet_type) : 'Semua program'}
                  </td>
                  <td className="px-4 py-4 font-medium text-muted-foreground">
                    {formatDate(voucher.expires_at)}
                  </td>
                  <td className="px-5 py-4">
                    <AdminRowActions>
                      <Link
                        className={adminTableActionClass}
                        href={`/admin/users/access?${(() => {
                          const query = new URLSearchParams(backQuery)
                          query.set('voucher', voucher.id)
                          return query.toString()
                        })()}`}
                      >
                        Ubah
                      </Link>
                    </AdminRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
        )}
      </AdminCard>

      {/* ----------------------------------------------------------- dompet */}
      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <AdminSectionHeading
            title="Dompet pengguna"
            description="Cari pengguna, periksa saldonya, lalu sesuaikan bila perlu."
          />
          <div className="mt-4">
            <AdminTableToolbar
              pathname="/admin/users/access"
              search={walletSearch}
              {...(!selectedUserId
                ? { placeholder: 'Cari nama atau email...', searchName: 'wallet_q' }
                : {})}
              resultCount={wallets.total}
              hiddenFields={{
                entitlement_q: entitlementSearch,
                status: params.status,
                voucher: params.voucher,
                user: selectedUserId || undefined,
              }}
              selects={[
                {
                  name: 'wallet_type',
                  ariaLabel: 'Filter tipe dompet',
                  placeholder: 'Semua tipe dompet',
                  defaultValue: params.wallet_type || '',
                  options: WALLET_TYPES.map((type) => ({
                    value: type,
                    label: walletTypeLabel(type),
                  })),
                },
              ]}
            />
          </div>
        </div>

        {wallets.wallets.length === 0 ? (
          <AdminEmptyState
            title="Tidak ada dompet"
            description="Tidak ada dompet yang cocok dengan filter ini."
          />
        ) : (
          <AdminDataTable className="w-full min-w-[820px] text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <AdminTh>Pengguna</AdminTh>
                <AdminTh>Tipe</AdminTh>
                <AdminTh align="right">Saldo</AdminTh>
                <AdminTh>Diperbarui</AdminTh>
                <AdminTh align="right">Aksi</AdminTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wallets.wallets.map((wallet) => (
                <tr
                  key={wallet.id}
                  className={cn(
                    'transition hover:bg-muted/70',
                    wallet.user_id === selectedUserId && 'bg-info-muted/60',
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-foreground">{wallet.full_name}</div>
                    <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {wallet.email || 'Email tidak tersedia'}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-muted-foreground">
                    {walletTypeLabel(wallet.wallet_type)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span
                      className={cn(
                        'text-base font-semibold tabular-nums',
                        wallet.balance > 0 ? 'text-success' : 'text-muted-foreground',
                      )}
                    >
                      {formatNumber(wallet.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-muted-foreground">
                    {formatDateTime(wallet.updated_at)}
                  </td>
                  <td className="px-5 py-4">
                    <AdminRowActions>
                      <Link
                        className={adminTableActionClass}
                        href={`/admin/users/access?${(() => {
                          const query = new URLSearchParams(backQuery)
                          query.set('user', wallet.user_id)
                          query.set('wallet_type', wallet.wallet_type)
                          query.delete('wallet_page')
                          query.delete('entitlement_page')
                          return query.toString()
                        })()}`}
                      >
                        Kelola
                      </Link>
                    </AdminRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
        )}

        {wallets.wallets.length > 0 && wallets.total > LIST_PAGE_SIZE ? (
          <AdminPagination
            pathname="/admin/users/access"
            params={{
              wallet_q: walletSearch,
              entitlement_q: entitlementSearch,
              wallet_type: params.wallet_type,
              status: params.status,
              user: params.user,
            }}
            summary={adminPageSummary(
              parseListPage(params.wallet_page).page,
              wallets.wallets.length,
              wallets.total,
            )}
            noun="dompet"
            pageKey="wallet_page"
          />
        ) : null}

        {selectedUserId ? (
          <div className="border-t border-border bg-muted/70 p-5">
            <AdminSectionHeading
              title="Riwayat & penyesuaian"
              description={
                selectedWallet
                  ? `${selectedWallet.full_name} · ${walletTypeLabel(selectedWallet.wallet_type)} · saldo ${formatNumber(selectedWallet.balance)}`
                  : 'Pengguna ini belum punya dompet; penyesuaian pertama akan membuatnya.'
              }
              action={
                <Link
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                  href={`/admin/users/access?${(() => {
                    const query = new URLSearchParams(backQuery)
                    query.delete('user')
                    return query.toString()
                  })()}`}
                >
                  Tutup
                </Link>
              }
            />

            {isSelf ? (
              <p className="mt-4 rounded-lg border border-warning-border bg-warning-muted px-4 py-3 text-sm font-medium text-warning">
                Ini dompet Anda sendiri. Penyesuaian saldo untuk diri sendiri ditolak oleh database
                — token bernilai uang, jadi mem bolehkannya sama dengan memberi akses cetak uang.
                Minta pemegang <code className="font-mono">entitlement.manage</code> lain bila
                memang perlu.
              </p>
            ) : (
              <form
                action={adjustWalletAction}
                className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 xl:grid-cols-[1fr_1fr_1.6fr_auto]"
              >
                {hidden}
                <input type="hidden" name="user_id" value={selectedUserId} />
                <label className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Jumlah
                  </span>
                  <input
                    className={adminInputClass}
                    name="amount"
                    type="number"
                    step="1"
                    min="-1000000"
                    max="1000000"
                    required
                    placeholder="mis. 10 atau -5"
                  />
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    Positif menambah, negatif mengurangi. Maks 1.000.000.
                  </span>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tipe dompet
                  </span>
                  <select
                    className={adminInputClass}
                    name="wallet_type"
                    defaultValue={
                      selectedWallet?.wallet_type ?? (params.wallet_type || 'exam_token_cpns')
                    }
                  >
                    {WALLET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {walletTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Alasan (wajib)
                  </span>
                  <input
                    className={adminInputClass}
                    name="reason"
                    required
                    minLength={3}
                    placeholder="mis. kompensasi gangguan tryout"
                  />
                </label>
                <div className="flex items-end">
                  <AdminSubmitButton pendingLabel="Menyesuaikan...">
                    <Coins size={16} />
                    Sesuaikan
                  </AdminSubmitButton>
                </div>
              </form>
            )}

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Riwayat transaksi ({transactions.transactions.length} terbaru dari{' '}
                {transactions.total})
              </div>
              {transactions.transactions.length === 0 ? (
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  Belum ada transaksi untuk pengguna ini.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {transactions.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {transactionSourceLabel(tx.source_type)}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {formatDateTime(tx.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={cn(
                            'font-mono text-sm font-semibold',
                            tx.amount > 0 ? 'text-success' : 'text-danger',
                          )}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          {tx.amount}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          saldo {formatNumber(tx.balance_after)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </AdminCard>

      {/* ------------------------------------------------------------- feature access */}
      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <AdminSectionHeading
            title="Hak akses fitur"
            description="Akses fitur yang dimiliki pengguna, biasanya berasal dari pembelian atau event."
          />
          <div className="mt-4">
            <AdminTableToolbar
              pathname="/admin/users/access"
              search={entitlementSearch}
              placeholder="Cari pengguna atau fitur..."
              searchName="entitlement_q"
              status={params.status || ''}
              statusOptions={ENTITLEMENT_STATUS_OPTIONS}
              resultCount={entitlements.total}
              hiddenFields={{
                wallet_q: walletSearch,
                wallet_type: params.wallet_type,
                user: selectedUserId || undefined,
              }}
            />
          </div>
        </div>

        {entitlements.entitlements.length === 0 ? (
          <AdminEmptyState
            title="Tidak ada entitlement"
            description="Belum ada hak akses fitur yang tercatat untuk filter ini."
          />
        ) : (
          <AdminDataTable className="w-full min-w-[900px] text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <AdminTh>Pengguna</AdminTh>
                <AdminTh>Fitur</AdminTh>
                <AdminTh>Sumber</AdminTh>
                <AdminTh align="right">Pemakaian</AdminTh>
                <AdminTh>Berlaku sampai</AdminTh>
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entitlements.entitlements.map((item) => (
                <tr key={item.id} className="transition hover:bg-muted/70">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-foreground">{item.full_name}</div>
                    <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {item.email || 'Email tidak tersedia'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-foreground">
                      {item.feature_name || item.feature_code || '—'}
                    </div>
                    {item.feature_code ? (
                      <div className="font-mono text-[10px] font-semibold text-muted-foreground">
                        {item.feature_code}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-medium text-muted-foreground">
                    {item.source_type ? transactionSourceLabel(item.source_type) : '—'}
                  </td>
                  <td className="px-4 py-4 font-bold text-muted-foreground">
                    {item.usage_count}
                    {item.usage_limit == null ? '' : ` / ${item.usage_limit}`}
                  </td>
                  <td className="px-4 py-4 font-medium text-muted-foreground">
                    {formatDate(item.expires_at)}
                  </td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge
                      status={item.status}
                      label={entitlementStatusLabel(item.status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminDataTable>
        )}

        {entitlements.entitlements.length > 0 && entitlements.total > LIST_PAGE_SIZE ? (
          <AdminPagination
            pathname="/admin/users/access"
            params={{
              wallet_q: walletSearch,
              entitlement_q: entitlementSearch,
              wallet_type: params.wallet_type,
              status: params.status,
              user: params.user,
            }}
            summary={adminPageSummary(
              parseListPage(params.entitlement_page).page,
              entitlements.entitlements.length,
              entitlements.total,
            )}
            noun="entitlement"
            pageKey="entitlement_page"
          />
        ) : null}
      </AdminCard>

      <details className="rounded-lg border border-border bg-card px-4 py-3 text-xs font-semibold text-muted-foreground">
        <summary className="cursor-pointer select-none">Catatan teknis</summary>
        <p className="mt-2 leading-6">
          Halaman ini memerlukan permission <code className="font-mono">entitlement.manage</code>.
          Setiap penyesuaian saldo menulis baris{' '}
          <code className="font-mono">wallet_transactions</code> dengan sumber{' '}
          <code className="font-mono">admin_adjustment</code>, sehingga riwayatnya tidak bisa
          hilang. Penyesuaian dompet sendiri ditolak oleh database.
        </p>
      </details>
    </AdminPage>
  )
}
