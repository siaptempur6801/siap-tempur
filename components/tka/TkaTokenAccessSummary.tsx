import Link from 'next/link'
import { ArrowRight, Ticket } from 'lucide-react'

export default function TkaTokenAccessSummary({
  tokenBalance,
  tokenCost = 1,
  href,
}: {
  tokenBalance: number
  tokenCost?: number
  href: string
}) {
  const canStart = tokenBalance >= tokenCost

  return (
    <section
      aria-label="Informasi token TKA"
      className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Ticket size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-slate-950">
            {tokenCost} token TKA untuk sesi baru
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-700">
            Saldo kamu {tokenBalance} token. Melanjutkan sesi aktif tidak memakai token lagi.
          </p>
        </div>
      </div>
      <Link
        href={href}
        className="st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-800 transition hover:bg-indigo-100"
      >
        {canStart ? 'Kelola token' : 'Beli token'}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  )
}
