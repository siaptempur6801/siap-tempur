'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  Gift,
  RotateCcw,
  ShoppingCart,
  Ticket,
} from 'lucide-react'
import { syncPaymentStatus } from '@/app/actions/payment'
import { toast } from 'sonner'
import { useProfileNavigation } from './useProfileNavigation'

type SnapController = {
  pay: (
    token: string,
    callbacks: {
      onSuccess?: () => void | Promise<void>
      onPending?: () => void | Promise<void>
      onError?: () => void
      onClose?: () => void | Promise<void>
    },
  ) => void
}

type TransactionHistoryItem = {
  id: string
  package_name: string
  amount: number
  status: string
  created_at: string
  snap_token?: string | null
  order_id: string
}

type UsageSessionItem = {
  id: string
  mode: string
  label: string
  amount: number
  balance_after: number
  start_time: string
}

type TokenCreditItem = {
  id: string
  created_at: string
  amount: number
  balance_after: number
  source_label: string
  source_detail: string
}

type HistoryPageInfo = {
  page: number
  pageSize: number
  total: number
  from: string
  to: string
}

interface HistoryTabProps {
  transactions: TransactionHistoryItem[]
  usageSessions: UsageSessionItem[]
  tokenCredits: TokenCreditItem[]
  transactionPage: HistoryPageInfo
  usagePage: HistoryPageInfo
  creditPage: HistoryPageInfo
}

function formatDate(value: string, withTime = false) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Jakarta',
  })
}

function statusMeta(status: string, createdAt: string) {
  const locallyExpired =
    status === 'pending' && Date.now() - new Date(createdAt).getTime() > 15 * 60 * 1000
  const value = locallyExpired ? 'expire' : status
  const map: Record<string, { label: string; className: string }> = {
    settlement: { label: 'Berhasil', className: 'bg-green-100 text-green-800' },
    capture: { label: 'Berhasil', className: 'bg-green-100 text-green-800' },
    authorize: { label: 'Menunggu verifikasi', className: 'bg-yellow-100 text-yellow-900' },
    pending: { label: 'Menunggu pembayaran', className: 'bg-yellow-100 text-yellow-900' },
    expire: { label: 'Kedaluwarsa', className: 'bg-gray-100 text-gray-700' },
    cancel: { label: 'Dibatalkan', className: 'bg-red-100 text-red-800' },
    deny: { label: 'Belum berhasil', className: 'bg-red-100 text-red-800' },
    failure: { label: 'Gagal', className: 'bg-red-100 text-red-800' },
    refund: { label: 'Dana dikembalikan', className: 'bg-violet-100 text-violet-800' },
    partial_refund: {
      label: 'Dana dikembalikan sebagian',
      className: 'bg-violet-100 text-violet-800',
    },
    chargeback: { label: 'Pembayaran disengketakan', className: 'bg-red-100 text-red-800' },
    partial_chargeback: {
      label: 'Pembayaran disengketakan sebagian',
      className: 'bg-red-100 text-red-800',
    },
  }
  return { value, ...(map[value] || { label: value, className: 'bg-blue-50 text-blue-800' }) }
}

export function HistoryTab({
  transactions,
  usageSessions,
  tokenCredits,
  transactionPage,
  usagePage,
  creditPage,
}: HistoryTabProps) {
  const { purchasePath, accessPath, level: tkaLevel, isTka } = useProfileNavigation()
  const handlePayPending = (token: string, orderId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const loadingId = toast.loading('Membuka pembayaran...')
    const snap =
      typeof window !== 'undefined'
        ? (window as Window & { snap?: SnapController }).snap
        : undefined

    if (!snap) {
      toast.dismiss(loadingId)
      toast.error('Pembayaran belum siap dimuat', {
        description: 'Muat ulang halaman lalu coba lagi.',
      })
      return
    }

    try {
      snap.pay(token, {
        onSuccess: async () => {
          toast.loading('Memverifikasi pembayaran...', { id: loadingId })
          const synced = await syncPaymentStatus(orderId)
          if (synced) {
            toast.success('Pembayaran berhasil', {
              id: loadingId,
              description: isTka
                ? 'Pembelian akan aktif setelah pembayaran terverifikasi.'
                : 'Token akan tersedia setelah pembayaran terverifikasi.',
            })
          } else {
            toast.info('Pembayaran sedang diverifikasi', {
              id: loadingId,
              description:
                'Status dan akses akan diperbarui setelah verifikasi pembayaran selesai.',
            })
          }
          window.location.reload()
        },
        onPending: async () => {
          toast.loading('Memperbarui status pembayaran...', { id: loadingId })
          const synced = await syncPaymentStatus(orderId)
          toast.info(synced ? 'Menunggu pembayaran' : 'Status pembayaran sedang diperbarui', {
            id: loadingId,
            description: synced
              ? 'Selesaikan pembayaran sesuai petunjuk metode yang kamu pilih.'
              : 'Muat ulang riwayat beberapa saat lagi untuk melihat status terbaru.',
          })
          window.location.reload()
        },
        onError: () => {
          toast.dismiss(loadingId)
          toast.error('Pembayaran belum berhasil')
        },
        onClose: async () => {
          toast.loading('Memeriksa status pembayaran...', { id: loadingId })
          const synced = await syncPaymentStatus(orderId)
          toast.info(
            synced ? 'Pembayaran belum selesai' : 'Status pembayaran belum terverifikasi',
            {
              id: loadingId,
              description: synced
                ? undefined
                : 'Riwayat akan menampilkan status terbaru setelah verifikasi selesai.',
            },
          )
          window.location.reload()
        },
      })
    } catch (error) {
      toast.dismiss(loadingId)
      toast.error('Pembayaran belum bisa dibuka', {
        description: error instanceof Error ? error.message : 'Coba lagi beberapa saat.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <HistorySection
        eyebrow={isTka ? 'Pembelian Tempur Pass' : 'Pembelian token'}
        title="Riwayat pembayaran"
        description={
          isTka
            ? 'Lihat pembelian Tempur Pass TKA dan lanjutkan pembayaran yang masih tersedia.'
            : 'Lihat paket yang pernah kamu pilih dan lanjutkan pembayaran yang masih tersedia.'
        }
        icon={<CreditCard size={21} />}
        iconTone="bg-blue-50"
        filterPrefix="tx"
        pageInfo={transactionPage}
        isTka={isTka}
      >
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const status = statusMeta(transaction.status, transaction.created_at)
              return (
                <article
                  key={transaction.id}
                  className={
                    isTka
                      ? 'rounded-xl border border-border-strong bg-white p-4 shadow-2xs transition hover:border-primary'
                      : 'border-2 border-[var(--st-ink)] bg-white p-4'
                  }
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={
                          isTka
                            ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs'
                            : 'flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-blue-50'
                        }
                      >
                        <Coins size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={
                            isTka
                              ? 'break-words text-sm font-bold text-slate-900'
                              : 'break-words font-black'
                          }
                        >
                          {transaction.package_name}
                        </h3>
                        <p
                          className={
                            isTka
                              ? 'mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium'
                              : 'mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500'
                          }
                        >
                          <Calendar size={13} /> {formatDate(transaction.created_at, true)}
                        </p>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <p
                        className={
                          isTka ? 'text-lg font-extrabold text-slate-950' : 'text-xl font-black'
                        }
                      >
                        Rp {transaction.amount.toLocaleString('id-ID')}
                      </p>
                      <span
                        className={
                          isTka
                            ? `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`
                            : `st-pill mt-2 ${status.className}`
                        }
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {status.value === 'pending' && transaction.snap_token && (
                    <div
                      className={
                        isTka
                          ? 'mt-4 border-t border-slate-100 pt-4'
                          : 'mt-4 border-t-2 border-dashed border-gray-300 pt-4'
                      }
                    >
                      <button
                        type="button"
                        onClick={(event) =>
                          handlePayPending(transaction.snap_token!, transaction.order_id, event)
                        }
                        className={
                          isTka
                            ? 'inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-[0.98]'
                            : 'st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2.5 text-sm font-black text-white'
                        }
                      >
                        Lanjutkan pembayaran
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingCart size={25} />}
            title={
              transactionPage.from || transactionPage.to
                ? 'Tidak ada pembayaran pada tanggal ini.'
                : isTka
                  ? 'Belum ada pembelian.'
                  : 'Belum ada pembelian token.'
            }
            description={
              isTka
                ? 'Pembelian Tempur Pass untuk jenjang TKA ini akan muncul di sini.'
                : 'Paket token yang kamu pilih akan muncul di sini.'
            }
            action={
              !transactionPage.from && !transactionPage.to ? (
                <Link
                  href={isTka ? accessPath : purchasePath}
                  className={
                    isTka
                      ? 'inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-[0.98]'
                      : 'st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2.5 text-sm font-black text-white'
                  }
                >
                  {isTka ? 'Lihat Tempur Pass' : 'Lihat paket token'}
                </Link>
              ) : undefined
            }
            isTka={isTka}
          />
        )}
      </HistorySection>

      {isTka ? (
        <section
          className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6"
          aria-labelledby="tka-pass-history-title"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            Akses TKA
          </p>
          <h2 id="tka-pass-history-title" className="mt-1 text-lg font-bold text-slate-950">
            Tempur Pass TKA {tkaLevel}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Status, masa aktif, dan pengelolaan akses belajar tersedia di halaman Tempur Pass
            jenjang ini.
          </p>
          <Link
            href={accessPath}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Kelola Tempur Pass
          </Link>
        </section>
      ) : (
        <>
          <HistorySection
            eyebrow="Penggunaan token"
            title="Sesi yang menggunakan token"
            description="Setiap pengurangan token dicatat dari ledger agar jumlah dan saldo akhirnya tetap akurat."
            icon={<Ticket size={21} />}
            iconTone="bg-[var(--st-yellow)]"
            filterPrefix="usage"
            pageInfo={usagePage}
            isTka={isTka}
          >
            {usageSessions.length > 0 ? (
              <div className="space-y-3">
                {usageSessions.map((session) => (
                  <article
                    key={session.id}
                    className={
                      isTka
                        ? 'flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between'
                        : 'flex flex-col gap-3 border-2 border-[var(--st-ink)] bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between'
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={
                          isTka
                            ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
                            : 'flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-orange-50'
                        }
                      >
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={
                            isTka
                              ? 'break-words text-sm font-bold text-slate-900'
                              : 'break-words font-black'
                          }
                        >
                          {session.label}
                        </h3>
                        <p
                          className={
                            isTka
                              ? 'mt-1 text-xs text-slate-500 font-medium'
                              : 'mt-1 text-xs font-semibold text-gray-500'
                          }
                        >
                          {formatDate(session.start_time, true)}
                        </p>
                        <p
                          className={
                            isTka
                              ? 'mt-1 text-xs font-semibold text-slate-600'
                              : 'mt-1 text-xs font-bold text-gray-600'
                          }
                        >
                          Saldo setelah digunakan: {session.balance_after} token
                        </p>
                      </div>
                    </div>
                    <span
                      className={
                        isTka
                          ? 'inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200/70'
                          : 'st-pill shrink-0 bg-red-50 text-red-800'
                      }
                    >
                      -{session.amount} token
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ClipboardList size={25} />}
                title={
                  usagePage.from || usagePage.to
                    ? 'Tidak ada penggunaan pada tanggal ini.'
                    : 'Belum ada penggunaan token.'
                }
                description="Sesi berbayar yang kamu mulai akan tercatat di sini."
                isTka={isTka}
              />
            )}
          </HistorySection>

          <HistorySection
            eyebrow="Token masuk"
            title="Dari mana token diperoleh"
            description="Lihat token yang berasal dari pembelian, voucher, hadiah, atau penyesuaian admin."
            icon={<Gift size={21} />}
            iconTone="bg-green-50"
            filterPrefix="credit"
            pageInfo={creditPage}
            isTka={isTka}
          >
            {tokenCredits.length > 0 ? (
              <div className="space-y-3">
                {tokenCredits.map((credit) => (
                  <article
                    key={credit.id}
                    className={
                      isTka
                        ? 'flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 sm:flex-row sm:items-center sm:justify-between'
                        : 'flex flex-col gap-3 border-2 border-[var(--st-ink)] bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between'
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={
                          isTka
                            ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-200 shadow-2xs'
                            : 'flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-white'
                        }
                      >
                        <Gift size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={isTka ? 'text-sm font-bold text-slate-900' : 'font-black'}>
                          {credit.source_label}
                        </h3>
                        <p
                          className={
                            isTka
                              ? 'break-words text-xs text-slate-600 font-medium'
                              : 'break-words text-sm font-semibold text-gray-700'
                          }
                        >
                          {credit.source_detail}
                        </p>
                        <p
                          className={
                            isTka
                              ? 'mt-1 text-xs text-slate-500 font-medium'
                              : 'mt-1 text-xs font-semibold text-gray-500'
                          }
                        >
                          {formatDate(credit.created_at, true)}
                        </p>
                        <p
                          className={
                            isTka
                              ? 'mt-1 text-xs font-semibold text-slate-600'
                              : 'mt-1 text-xs font-bold text-gray-600'
                          }
                        >
                          Saldo setelah diterima: {credit.balance_after} token
                        </p>
                      </div>
                    </div>
                    <span
                      className={
                        isTka
                          ? 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200'
                          : 'st-pill shrink-0 bg-green-100 text-green-800'
                      }
                    >
                      +{credit.amount} token
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Gift size={25} />}
                title={
                  creditPage.from || creditPage.to
                    ? 'Tidak ada token masuk pada tanggal ini.'
                    : 'Belum ada token masuk.'
                }
                description="Pembelian, voucher, hadiah, dan penyesuaian token akan tercatat di sini."
                isTka={isTka}
              />
            )}
          </HistorySection>
        </>
      )}
    </div>
  )
}

function HistorySection({
  eyebrow,
  title,
  description,
  icon,
  iconTone,
  filterPrefix,
  pageInfo,
  isTka = false,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  icon: React.ReactNode
  iconTone: string
  filterPrefix: 'tx' | 'usage' | 'credit'
  pageInfo: HistoryPageInfo
  isTka?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={
        isTka
          ? 'rounded-2xl border border-border-strong bg-white p-6 shadow-xs'
          : 'st-card-md bg-white p-5 md:p-6'
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            isTka
              ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-2xs'
              : `flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] ${iconTone}`
          }
        >
          {icon}
        </div>
        <div>
          <p
            className={
              isTka
                ? 'text-xs font-bold uppercase tracking-wider text-indigo-700'
                : 'text-xs font-black uppercase tracking-[0.14em] text-blue-700'
            }
          >
            {eyebrow}
          </p>
          <h2 className={isTka ? 'text-xl font-bold text-slate-950' : 'st-heading mt-1 text-2xl'}>
            {title}
          </h2>
          <p
            className={
              isTka
                ? 'mt-1 text-sm font-medium text-slate-600'
                : 'st-muted mt-1 text-sm font-semibold'
            }
          >
            {description}
          </p>
        </div>
      </div>

      <HistoryControls
        key={`${filterPrefix}-${pageInfo.from}-${pageInfo.to}`}
        prefix={filterPrefix}
        pageInfo={pageInfo}
        isTka={isTka}
      />
      <div className="mt-5">{children}</div>
      <HistoryPagination prefix={filterPrefix} pageInfo={pageInfo} isTka={isTka} />
    </section>
  )
}

function HistoryControls({
  prefix,
  pageInfo,
  isTka = false,
}: {
  prefix: 'tx' | 'usage' | 'credit'
  pageInfo: HistoryPageInfo
  isTka?: boolean
}) {
  const { profilePath } = useProfileNavigation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [from, setFrom] = useState(pageInfo.from)
  const [to, setTo] = useState(pageInfo.to)
  const [isPending, startTransition] = useTransition()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const navigate = (nextFrom: string, nextTo: string) => {
    if (nextFrom && nextTo && nextFrom > nextTo) {
      toast.error('Tanggal mulai tidak boleh setelah tanggal akhir.')
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'history')
    params.delete(`${prefix}_page`)
    if (nextFrom) params.set(`${prefix}_from`, nextFrom)
    else params.delete(`${prefix}_from`)
    if (nextTo) params.set(`${prefix}_to`, nextTo)
    else params.delete(`${prefix}_to`)
    startTransition(() => router.push(`${profilePath}?${params.toString()}`, { scroll: false }))
  }

  return (
    <div
      className={
        isTka
          ? 'mt-5 border-y border-slate-100 py-4'
          : 'mt-5 border-y-2 border-dashed border-gray-200 py-4'
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <DateField label="Dari tanggal" value={from} max={today} onChange={setFrom} isTka={isTka} />
        <DateField label="Sampai tanggal" value={to} max={today} onChange={setTo} isTka={isTka} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(from, to)}
            disabled={isPending}
            className={
              isTka
                ? 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 sm:flex-none'
                : 'st-button inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50 sm:flex-none'
            }
          >
            <CalendarRange size={16} /> Terapkan
          </button>
          {(pageInfo.from || pageInfo.to) && (
            <button
              type="button"
              onClick={() => {
                setFrom('')
                setTo('')
                navigate('', '')
              }}
              disabled={isPending}
              aria-label="Reset filter tanggal"
              title="Reset filter tanggal"
              className={
                isTka
                  ? 'flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition disabled:opacity-50'
                  : 'st-button st-focus flex h-11 w-11 items-center justify-center bg-white disabled:opacity-50'
              }
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
      <p
        className={
          isTka ? 'mt-3 text-xs font-medium text-slate-500' : 'mt-3 text-xs font-bold text-gray-500'
        }
      >
        {pageInfo.total} catatan ditemukan
      </p>
    </div>
  )
}

function DateField({
  label,
  value,
  max,
  onChange,
  isTka = false,
}: {
  label: string
  value: string
  max: string
  onChange: (value: string) => void
  isTka?: boolean
}) {
  return (
    <label>
      <span
        className={
          isTka
            ? 'mb-1.5 block text-xs font-bold text-slate-600'
            : 'mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-gray-500'
        }
      >
        {label}
      </span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={
          isTka
            ? 'w-full rounded-xl border border-border-strong bg-white px-3.5 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
            : 'st-input text-sm font-bold'
        }
      />
    </label>
  )
}

function HistoryPagination({
  prefix,
  pageInfo,
  isTka = false,
}: {
  prefix: 'tx' | 'usage' | 'credit'
  pageInfo: HistoryPageInfo
  isTka?: boolean
}) {
  const { profilePath } = useProfileNavigation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))
  const currentPage = Math.min(pageInfo.page, totalPages)
  if (pageInfo.total <= pageInfo.pageSize) return null

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'history')
    params.set(`${prefix}_page`, String(page))
    startTransition(() => router.push(`${profilePath}?${params.toString()}`, { scroll: false }))
  }

  const firstItem = (currentPage - 1) * pageInfo.pageSize + 1
  const lastItem = Math.min(currentPage * pageInfo.pageSize, pageInfo.total)

  return (
    <div
      className={
        isTka
          ? 'mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between'
          : 'mt-5 flex flex-col gap-3 border-t-2 border-dashed border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <p
        className={
          isTka ? 'text-xs font-medium text-slate-500' : 'text-sm font-semibold text-gray-600'
        }
      >
        {firstItem}-{lastItem} dari {pageInfo.total} catatan
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={isPending || currentPage === 1}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
          className={
            isTka
              ? 'flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition disabled:opacity-40'
              : 'st-button st-focus flex h-11 w-11 items-center justify-center bg-white disabled:opacity-40'
          }
        >
          <ChevronLeft size={18} />
        </button>
        <span
          className={
            isTka
              ? 'min-w-16 text-center text-xs font-bold text-slate-700'
              : 'min-w-16 text-center text-sm font-black'
          }
        >
          {currentPage}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={isPending || currentPage === totalPages}
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
          className={
            isTka
              ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition disabled:opacity-40'
              : 'st-button st-focus flex h-11 w-11 items-center justify-center bg-[var(--st-yellow)] disabled:opacity-40'
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
  isTka = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  isTka?: boolean
}) {
  if (isTka) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs">
          {icon}
        </div>
        <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 font-medium">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    )
  }
  return (
    <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-white">
        {icon}
      </div>
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="st-muted mt-1 text-sm font-semibold">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
