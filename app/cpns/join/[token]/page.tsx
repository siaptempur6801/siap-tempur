import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  TicketCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAuthUserIdVerified } from '@/lib/utils/supabase/server'
import {
  organizationInviteService,
  inviteReasonLabel,
  batchStatusLabel,
} from '@/src/services/organization.service'
import { joinBatchAction } from '@/app/actions/organization-join'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Halaman join peserta — PRD §10A.2, flow §10.3.
 *
 * Peserta instansi TIDAK masuk lewat area admin. Mereka membuka tautan
 * undangan, login atau membuat akun, melengkapi data minimum, lalu terhubung
 * ke batch.
 *
 * Halaman ini sengaja berdiri di luar `/admin` sehingga tidak memakai shell
 * admin: pesertanya bukan admin, dan `app/admin/layout.tsx` akan menolaknya
 * (tanpa `admin.access` maupun permission content, ia dilempar keluar).
 *
 * Token undangan adalah kunci masuk, jadi halaman ini TIDAK menampilkan data
 * peserta lain — hanya identitas instansi dan batch yang bersangkutan.
 */

type Params = { token: string }
type SearchParams = { ok?: string; error?: string }

const REASON_ICON = {
  already_joined: CheckCircle2,
  batch_closed: Clock3,
  organization_inactive: AlertTriangle,
} as const

function fmtWindow(start: string | null, end: string | null) {
  const format = (value: string | null) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(date)
  }
  const from = format(start)
  const to = format(end)
  if (!from && !to) return 'Jadwal belum ditentukan'
  if (from && !to) return `Mulai ${from}`
  if (!from && to) return `Sampai ${to}`
  return `${from} — ${to}`
}

export default async function JoinBatchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  const { token } = await params
  const query = await searchParams

  // Peserta wajib punya sesi (PRD §10.3 langkah 4). `getAuthUserIdVerified`
  // memverifikasi JWT lewat JWKS, bukan sekadar mempercayai cookie.
  const userId = await getAuthUserIdVerified()
  if (!userId) {
    redirect(`/login?returnTo=${encodeURIComponent(`/cpns/join/${token}`)}`)
  }

  const invite = await organizationInviteService.getInvite(token)

  if (!invite.found || !invite.batch || !invite.organization) {
    return (
      <Shell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto text-red-500" size={28} />
          <h1 className="mt-3 text-lg font-black text-red-900">Tautan undangan tidak dikenali</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-red-800">
            Periksa kembali tautan dari instansi Anda. Tautan bisa saja sudah dirotasi sehingga yang
            lama tidak berlaku lagi.
          </p>
          <Link
            href="/cpns/dashboard"
            className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700"
          >
            Ke dashboard
          </Link>
        </div>
      </Shell>
    )
  }

  const { batch, organization } = invite
  const ReasonIcon = invite.reason
    ? (REASON_ICON[invite.reason as keyof typeof REASON_ICON] ?? AlertTriangle)
    : CheckCircle2

  return (
    <Shell>
      {query.ok || query.error ? (
        <div
          role="status"
          className={cn(
            'mb-4 rounded-xl border px-4 py-3 text-sm font-bold',
            query.error
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800',
          )}
        >
          {query.error || query.ok}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-blue-600">
          <Building2 size={14} />
          Undangan Instansi
        </div>
        <h1 className="mt-2 text-xl font-black text-slate-950">{organization.name}</h1>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
          <span className="font-mono">{organization.code}</span>
          {organization.city || organization.province ? (
            <span>{[organization.city, organization.province].filter(Boolean).join(', ')}</span>
          ) : null}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-900">{batch.name}</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
              {batch.code}
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-700">
              {batchStatusLabel(batch.status)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarDays size={13} />
            {fmtWindow(batch.starts_at, batch.ends_at)}
          </div>
        </div>

        {!invite.joinable ? (
          <div
            className={cn(
              'mt-5 flex items-start gap-3 rounded-xl border p-4',
              invite.alreadyJoined
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50',
            )}
          >
            <ReasonIcon
              className={cn(
                'mt-0.5 shrink-0',
                invite.alreadyJoined ? 'text-emerald-600' : 'text-amber-600',
              )}
              size={18}
            />
            <div>
              <div
                className={cn(
                  'text-sm font-black',
                  invite.alreadyJoined ? 'text-emerald-900' : 'text-amber-900',
                )}
              >
                {invite.alreadyJoined ? 'Anda sudah terdaftar' : 'Belum bisa bergabung'}
              </div>
              <p
                className={cn(
                  'mt-1 text-xs font-medium leading-5',
                  invite.alreadyJoined ? 'text-emerald-800' : 'text-amber-800',
                )}
              >
                {invite.alreadyJoined
                  ? 'Anda sudah tercatat sebagai peserta batch ini. Ujian akan muncul di dashboard Anda saat jadwalnya dibuka.'
                  : inviteReasonLabel(invite.reason)}
              </p>
              <Link
                href="/cpns/dashboard"
                className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
              >
                Ke dashboard
              </Link>
            </div>
          </div>
        ) : (
          <form action={joinBatchAction} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm font-medium leading-6 text-slate-600">
              Lengkapi data berikut supaya instansi dapat mengenali Anda pada hasil ujian. Nama dan
              email mengikuti profil Anda bila dikosongkan.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                  Nama lengkap
                </span>
                <input
                  name="full_name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Nama sesuai identitas"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                  Nomor HP
                </span>
                <input
                  name="phone"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="0812..."
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                  Unit / bagian
                </span>
                <input
                  name="unit"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="mis. Bidang Kepegawaian"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                  Jabatan
                </span>
                <input
                  name="jabatan"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="mis. Analis SDM"
                />
              </label>
            </div>
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 sm:w-auto">
              <TicketCheck size={16} />
              Gabung ke batch ini
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-xs font-medium leading-6 text-slate-400">
        Kode peserta akan dibuat otomatis setelah Anda bergabung. Bila instansi sudah mengirimkan
        daftar peserta, data Anda akan ditautkan — bukan diduplikasi.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-10 font-body text-slate-950">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>
  )
}
