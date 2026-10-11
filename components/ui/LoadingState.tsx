import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LoadingLayout = 'dashboard' | 'list' | 'detail' | 'profile' | 'packages' | 'exam'

export function LoadingSpinner({
  label = 'Memuat',
  size = 'md',
  className,
}: {
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      role="status"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
    >
      <LoaderCircle
        className={cn(
          'animate-spin',
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('st-skeleton', className)} aria-hidden="true" />
}

function HeaderSkeleton() {
  return (
    <header className="max-w-4xl space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-11 w-full max-w-2xl md:h-14" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </header>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <section className="grid gap-5 lg:grid-cols-[1.7fr_0.8fr]">
        <Skeleton className="h-56 rounded-xl border border-border" />
        <Skeleton className="h-56 rounded-xl border border-border" />
      </section>
      <section className="st-card-md grid min-h-52 bg-card lg:grid-cols-[0.72fr_1.28fr]">
        <Skeleton className="min-h-44 rounded-l-xl bg-muted" />
        <div className="space-y-5 p-6">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-44 rounded-xl border border-border" />
        ))}
      </section>
    </>
  )
}

function ListSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-44" />
      </div>
      <section className="space-y-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="grid min-h-28 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[4rem_1fr_auto] sm:items-center"
          >
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        ))}
      </section>
    </>
  )
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-11 w-40" />
      <section className="st-card-md grid min-h-64 gap-6 bg-card p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="min-h-36 rounded-xl" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28 border-2 border-slate-200" />
        ))}
      </section>
      <Skeleton className="h-72 rounded-xl border border-border" />
    </>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-11 w-32 shrink-0" />
        ))}
      </div>
      <section className="st-card-md grid gap-6 bg-card p-5 sm:p-6 md:grid-cols-[8rem_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-16" />
          ))}
        </div>
      </section>
    </>
  )
}

function PackagesSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <section className="grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="st-card-md space-y-5 bg-card p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </section>
    </>
  )
}

function ExamSkeleton() {
  return (
    <div data-experience-mode="exam" className="space-y-4">
      <header className="grid min-h-16 gap-3 border-b border-border bg-background p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <section className="min-h-[34rem] space-y-6 rounded-xl border border-border bg-card p-5 md:p-7">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-4/5" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-14 w-full rounded-lg border border-border" />
            ))}
          </div>
        </section>
        <aside className="hidden min-h-[34rem] rounded-xl border border-border bg-card p-4 lg:block">
          <Skeleton className="h-6 w-36" />
          <div className="mt-5 grid grid-cols-5 gap-2">
            {Array.from({ length: 20 }, (_, item) => (
              <Skeleton key={item} className="aspect-square" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export function PageLoadingSkeleton({
  layout = 'list',
  label = 'Memuat halaman',
}: {
  layout?: LoadingLayout
  label?: string
}) {
  return (
    <div
      data-experience-mode={layout === 'exam' ? 'exam' : 'learning'}
      className="st-product w-full space-y-6 font-body"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {layout === 'dashboard' ? <DashboardSkeleton /> : null}
      {layout === 'list' ? <ListSkeleton /> : null}
      {layout === 'detail' ? <DetailSkeleton /> : null}
      {layout === 'profile' ? <ProfileSkeleton /> : null}
      {layout === 'packages' ? <PackagesSkeleton /> : null}
      {layout === 'exam' ? <ExamSkeleton /> : null}
    </div>
  )
}
