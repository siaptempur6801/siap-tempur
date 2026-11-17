import Link from 'next/link'
import { ArrowRight, Ticket } from 'lucide-react'
import { negativeTokenBalanceNote } from '@/lib/token-balance'

export default function TkaTokenAccessSummary({
  tokenBalance,
  tokenCost,
  href,
}: {
  tokenBalance: number
  tokenCost?: number
  href: string
}) {
  const negativeNote = negativeTokenBalanceNote(tokenBalance)
  return (
    <section
      aria-label="Informasi token TKA"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-xl border border-border-strong bg-card p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-6"
    >
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary min-[390px]:flex">
          <Ticket size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Saldo Token TKA</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {tokenBalance} <span className="text-sm font-medium text-muted-foreground">token</span>
          </p>
          {negativeNote && <p className="mt-1 max-w-xs text-xs text-danger">{negativeNote}</p>}
        </div>
      </div>
      <div className="col-span-2 row-start-2 min-w-0 border-t border-border pt-3 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
        <p className="text-sm font-semibold text-foreground">
          {tokenCost
            ? `${tokenCost} token untuk satu sesi baru`
            : 'Gunakan token saat mulai sesi baru'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {!tokenCost && 'Kebutuhan token tertera di setiap pilihan. '}
          Sesi yang masih berjalan bisa dilanjutkan tanpa token tambahan.
        </p>
      </div>
      <Link
        href={href}
        className="st-focus col-start-2 row-start-1 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover lg:col-start-3"
      >
        {tokenBalance > 0 ? 'Tambah Token' : 'Beli Token'}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  )
}
