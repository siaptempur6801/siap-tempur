'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Compass,
  Dumbbell,
  History,
  LayoutDashboard,
  ListChecks,
  Menu,
  X,
  Ticket,
  Timer,
  User,
} from 'lucide-react'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import DialogSurface from '@/components/ui/DialogSurface'
import TkaSurfaceLink from '@/components/tka/TkaSurfaceLink'
import SidebarSignoutButton from '@/components/dashboard/SidebarSignoutButton'
import styles from '@/components/tka/TkaLearning.module.css'
import TkaLevelSwitcher from '@/components/tka/TkaLevelSwitcher'
import { parseTkaLevel } from '@/src/tka/context'

interface TkaDashboardShellProps {
  children: React.ReactNode
  level: 'SD' | 'SMP' | 'SMA'
  tokenBalance?: number
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
    display_name?: string
  } | null
  signoutAction: () => Promise<{ success: boolean }>
}

export default function TkaDashboardShell({
  children,
  level: initialLevel,
  tokenBalance = 0,
  user,
  profile,
  signoutAction,
}: TkaDashboardShellProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuTitleId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [pathname])
  const levelFromPath = pathname?.match(/^\/tka\/(sd|smp|sma)(?:\/|$)/i)?.[1]
  const level = parseTkaLevel(levelFromPath) ?? initialLevel
  const basePath = `/tka/${level.toLowerCase()}`
  const isReviewSession = pathname.includes('/review') || pathname.includes('/pembahasan')
  const isTryoutSession = /^\/tka\/(?:sd|smp|sma)\/tryout\/[^/]+$/i.test(pathname)
  const isDiagnosticSession = /\/diagnostic\/[0-9a-f-]+$/i.test(pathname)
  const isRemedialSession = /^\/tka\/(?:sd|smp|sma)\/remedial\/[^/]+$/i.test(pathname)
  const isFocusedSession =
    isTryoutSession || isDiagnosticSession || isRemedialSession || isReviewSession
  const hasSmpLearningTools = level === 'SMP'
  const featureHref = (path: string) => `${basePath}${path}`

  const navigation = [
    {
      label: 'Menu utama',
      items: [
        { href: basePath, label: 'Ringkasan', icon: LayoutDashboard, exact: true },
        ...(hasSmpLearningTools
          ? [
              { href: featureHref('/diagnostic'), label: 'Tes Diagnostik', icon: BrainCircuit },
              { href: featureHref('/focus'), label: 'Latihan Fokus', icon: Dumbbell },
            ]
          : []),
        { href: featureHref('/mini-tryout'), label: 'Mini Tryout', icon: Timer },
        { href: featureHref('/tryout'), label: 'Tryout', icon: ListChecks },
        { href: featureHref('/riwayat'), label: 'Riwayat & Hasil', icon: History },
        ...(hasSmpLearningTools
          ? [
              {
                href: featureHref('/wrong-questions'),
                label: 'Bank Soal Salah',
                icon: BookOpenCheck,
              },
              { href: featureHref('/progress'), label: 'Perkembangan', icon: BarChart3 },
            ]
          : []),
      ],
    },
    {
      label: 'Akun & akses',
      items: [
        { href: featureHref('/pilih-jalur'), label: 'Pilih Jalur', icon: Compass },
        ...(hasSmpLearningTools
          ? [{ href: featureHref('/beli-token'), label: 'Beli Token', icon: Ticket }]
          : []),
        { href: featureHref('/profile'), label: 'Profil', icon: User },
      ],
    },
  ]

  const navigationItems = navigation.map((group) => (
    <div
      key={group.label}
      className="space-y-1 border-border first:border-0 [&+&]:mt-3 [&+&]:border-t [&+&]:pt-3"
    >
      <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
      {group.items.map((item) => (
        <NavItem
          key={item.href}
          variant="soft"
          href={item.href}
          label={item.label}
          icon={<item.icon size={17} />}
          exact={'exact' in item && item.exact}
        />
      ))}
    </div>
  ))

  if (isFocusedSession) {
    return (
      <div
        data-experience-mode={isReviewSession ? 'learning' : 'exam'}
        data-program={`tka-${level.toLowerCase()}`}
        className="st-product min-h-screen bg-background"
      >
        {children}
      </div>
    )
  }

  const displayName =
    profile?.full_name ||
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    'Pejuang SiapTempur'

  const learnerSurface = {
    '--st-paper': 'var(--px-canvas)',
    '--st-paper-strong': 'var(--px-surface-subtle)',
    '--st-border': '1px solid var(--px-border-strong)',
    '--st-shadow-sm': 'var(--px-shadow-xs)',
    '--st-shadow-md': 'var(--px-shadow-sm)',
    '--st-shadow-lg': 'var(--px-shadow-md)',
    '--st-radius-sm': 'var(--px-radius-sm)',
    '--st-radius-md': 'var(--px-radius-md)',
    '--st-radius-lg': 'var(--px-radius-md)',
  } as React.CSSProperties

  return (
    <div
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className={`${styles.learning} flex h-dvh overflow-hidden bg-slate-50/60 font-body text-slate-950`}
      style={learnerSurface}
    >
      <aside className="relative z-20 hidden w-[15.75rem] shrink-0 min-h-0 flex-col border-r border-slate-200/80 bg-white md:flex">
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3.5 pt-4">
          <div className="flex items-center justify-between">
            <TkaSurfaceLink
              href="/tka?landing=1"
              aria-label="Buka halaman TKA"
              className="inline-flex items-center focus-visible:outline-none"
            >
              <span className="font-script text-2xl font-black leading-tight text-slate-950">
                Siap
                <span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">
                  Tempur
                </span>
                .
              </span>
            </TkaSurfaceLink>
            <span className="inline-flex items-center rounded-full bg-[var(--brand-blue-50)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              TKA
            </span>
          </div>
          <div className="mt-3">
            <TkaLevelSwitcher activeLevel={level} compact />
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
          aria-label={`Navigasi TKA ${level}`}
        >
          {navigationItems}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border-strong bg-white p-2.5 shadow-xs">
            <Link
              href={`${basePath}/profile`}
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
              {hasSmpLearningTools ? (
                <Link
                  href={`${basePath}/beli-token`}
                  aria-label={`Saldo TKA ${tokenBalance} token. Beli Token TKA`}
                  className="st-focus mt-0.5 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Ticket size={12} aria-hidden="true" /> {tokenBalance} token tersisa
                </Link>
              ) : (
                <Link
                  href={`${basePath}/profile`}
                  className="st-focus mt-0.5 inline-flex min-h-9 items-center text-xs font-semibold text-primary hover:underline"
                >
                  Profil siswa
                </Link>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex justify-end">
            <SidebarSignoutButton
              signoutAction={signoutAction}
              redirectTo="/tka"
              program="tka"
              variant="soft"
            />
          </div>
        </div>
      </aside>

      <div ref={contentRef} className="relative min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <TkaSurfaceLink
              href="/tka?landing=1"
              aria-label="Buka halaman TKA"
              className="font-script text-xl font-black text-slate-950"
            >
              Siap
              <span className="text-indigo-600 underline decoration-wavy decoration-2 underline-offset-2">
                Tempur
              </span>
              .
            </TkaSurfaceLink>
            <div className="flex items-center gap-2">
              {hasSmpLearningTools && (
                <Link
                  href={`${basePath}/beli-token`}
                  aria-label={`Saldo TKA ${tokenBalance} token. Beli Token TKA`}
                  aria-current={pathname === `${basePath}/beli-token` ? 'page' : undefined}
                  className="st-focus inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg bg-primary-muted px-2 text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Ticket size={16} aria-hidden="true" />
                  <span className="text-xs font-semibold tabular-nums">{tokenBalance} token</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Buka semua menu TKA"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                className="st-focus flex size-11 items-center justify-center rounded-lg border border-border bg-card text-foreground"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="px-3 pb-2.5">
            <TkaLevelSwitcher activeLevel={level} compact />
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Navigasi utama TKA"
      >
        <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
          <MobileNavItem
            variant="soft"
            href={basePath}
            icon={<LayoutDashboard size={20} />}
            label="Ringkasan"
            exact
          />
          {hasSmpLearningTools ? (
            <MobileNavItem
              variant="soft"
              href={featureHref('/focus')}
              icon={<Dumbbell size={20} />}
              label="Latihan"
            />
          ) : (
            <MobileNavItem
              variant="soft"
              href={featureHref('/pilih-jalur')}
              icon={<Compass size={20} />}
              label="Jalur"
            />
          )}
          <MobileNavItem
            variant="soft"
            href={featureHref('/mini-tryout')}
            icon={<Timer size={20} />}
            label="Mini Tryout"
          />
          <MobileNavItem
            variant="soft"
            href={featureHref('/tryout')}
            icon={<ListChecks size={20} />}
            label="Tryout"
          />
          <MobileNavItem
            variant="soft"
            href={featureHref('/riwayat')}
            icon={<History size={20} />}
            label="Hasil"
          />
        </div>
      </nav>

      <DialogSurface
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        labelledBy={menuTitleId}
        className="max-w-sm border border-border font-body"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <h2 id={menuTitleId} className="text-base font-bold text-foreground">
            Menu TKA {level}
          </h2>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
            className="st-focus flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav
          aria-label="Semua menu TKA"
          className="p-3"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false)
          }}
        >
          {navigationItems}
        </nav>
        <div className="border-t border-border px-4 py-3">
          <SidebarSignoutButton
            signoutAction={signoutAction}
            redirectTo="/tka"
            program="tka"
            variant="soft"
          />
        </div>
      </DialogSurface>
    </div>
  )
}
