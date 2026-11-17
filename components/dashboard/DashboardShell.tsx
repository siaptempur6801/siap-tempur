'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  CalendarDays,
  Clock3,
  Compass,
  Ticket,
  Target,
  Library,
  ListChecks,
  Dumbbell,
  User,
  Building2,
} from 'lucide-react'

import MobileProfileDropdown from '@/components/dashboard/MobileProfileDropdown'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import styles from '@/components/dashboard/CompactLearning.module.css'

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
      name?: string
    }
  }
  profile: {
    avatar_url?: string
    full_name?: string
  } | null
  tokenBalance: number
  signoutAction: () => Promise<{ success: boolean }>
}

export default function DashboardShell({
  children,
  user,
  profile,
  tokenBalance,
  signoutAction,
}: DashboardShellProps) {
  const pathname = usePathname()

  const isPracticeSession =
    /^\/cpns\/dashboard\/tryout\/[^/]+$/.test(pathname) ||
    /^\/cpns\/dashboard\/result\/[^/]+$/.test(pathname)

  if (isPracticeSession) {
    return (
      <main
        data-experience-mode="exam"
        data-program="cpns"
        className="st-product min-h-screen bg-background font-body"
      >
        {children}
      </main>
    )
  }

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    'Pejuang SiapTempur'

  return (
    <div
      data-experience-mode="learning"
      data-program="cpns"
      className={`${styles.compact} st-product flex h-dvh overflow-hidden bg-brand-paper font-body text-slate-950`}
    >
      <aside className="relative z-20 hidden w-[15.75rem] min-h-0 flex-col border-r border-border bg-brand-paper md:flex">
        <div className="shrink-0 border-b border-border px-5 pb-4 pt-5">
          <Link
            href="/cpns"
            className="st-focus inline-flex items-center focus-visible:outline-none"
          >
            <span className="font-script text-[1.65rem] font-black leading-tight text-slate-950">
              Siap
              <span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">
                Tempur
              </span>
              .
            </span>
          </Link>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Persiapan SKD CPNS
          </p>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3"
          aria-label="Navigasi CPNS"
        >
          <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">Menu utama</p>
          <div className="space-y-1">
            <NavItem
              variant="soft"
              href="/cpns/dashboard"
              icon={<LayoutDashboard size={17} />}
              label="Beranda"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/materi"
              icon={<Library size={17} />}
              label="Kisi-Kisi"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/belajar-materi"
              icon={<Dumbbell size={17} />}
              label="Ruang Belajar"
              active={
                pathname.startsWith('/cpns/dashboard/belajar-materi') ||
                pathname.startsWith('/cpns/dashboard/drilling-materi')
              }
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/mini-tryout"
              icon={<ListChecks size={17} />}
              label="Mini Tryout"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/tryout"
              icon={<Target size={17} />}
              label="Tryout"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/assignments"
              icon={<Building2 size={17} />}
              label="Assignment Instansi"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/event"
              icon={<CalendarDays size={17} />}
              label="Event"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/riwayat"
              icon={<Clock3 size={17} />}
              label="Hasil"
            />
          </div>

          <div className="my-3.5 border-t border-border" />
          <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">Akun & akses</p>
          <div className="space-y-1">
            <NavItem
              variant="soft"
              href="/cpns/dashboard/pilih-jalur"
              icon={<Compass size={17} />}
              label="Pilih Jalur"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/beli-paket"
              icon={<Ticket size={17} />}
              label="Beli Token"
            />
            <NavItem
              variant="soft"
              href="/cpns/dashboard/profile"
              icon={<User size={17} />}
              label="Profil"
            />
          </div>
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border-strong bg-white p-2.5 shadow-xs">
            <Link
              href="/cpns/dashboard/profile"
              prefetch={false}
              aria-label="Buka profil"
              className="st-focus relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-sm font-semibold text-foreground"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Foto profil"
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                <span>{user.email?.[0]?.toUpperCase() || '?'}</span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <Link
                href="/cpns/dashboard/beli-paket"
                prefetch={false}
                className="st-focus mt-0.5 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Ticket size={12} /> {tokenBalance} token tersisa
              </Link>
            </div>
          </div>
          <div className="mt-1.5 flex justify-end">
            <SidebarSignoutButton signoutAction={signoutAction} redirectTo="/cpns" variant="soft" />
          </div>
        </div>
      </aside>

      <main className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-brand-paper/95 px-4 backdrop-blur-xl md:hidden">
          <Link href="/cpns" className="st-focus font-display text-xl font-black text-slate-950">
            Siap
            <span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">
              Tempur
            </span>
            .
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/cpns/dashboard/beli-paket"
              prefetch={false}
              aria-label={`${tokenBalance} token tersisa`}
              className="st-focus inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-info-border bg-info-muted px-2.5 text-xs font-semibold text-info"
            >
              <Ticket size={14} aria-hidden="true" />
              <span className="tabular-nums">{tokenBalance}</span>
              <span className="hidden min-[360px]:inline">token</span>
            </Link>
            <MobileProfileDropdown
              user={user}
              profile={profile}
              tokenBalance={tokenBalance}
              signoutAction={signoutAction}
              signoutRedirectTo="/cpns"
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl p-4 sm:p-5 md:p-6 lg:p-7">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-brand-paper/98 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Navigasi utama"
      >
        <div className="grid grid-cols-6 gap-1 px-1.5 py-1.5">
          <MobileNavItem
            variant="soft"
            href="/cpns/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Beranda"
          />
          <MobileNavItem
            variant="soft"
            href="/cpns/dashboard/belajar-materi"
            icon={<Dumbbell size={20} />}
            label="Belajar"
            active={
              pathname.startsWith('/cpns/dashboard/belajar-materi') ||
              pathname.startsWith('/cpns/dashboard/drilling-materi')
            }
          />
          <MobileNavItem
            variant="soft"
            href="/cpns/dashboard/tryout"
            icon={<Target size={20} />}
            label="Tryout"
          />
          <MobileNavItem
            variant="soft"
            href="/cpns/dashboard/assignments"
            icon={<Building2 size={20} />}
            label="Instansi"
          />
          <MobileNavItem
            variant="soft"
            href="/cpns/dashboard/riwayat"
            icon={<Clock3 size={20} />}
            label="Hasil"
          />
          <MobileNavItem
            variant="soft"
            href="/cpns/dashboard/profile"
            icon={<User size={20} />}
            label="Profil"
          />
        </div>
      </nav>
    </div>
  )
}
