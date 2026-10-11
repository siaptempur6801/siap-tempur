'use client'
import { adminHref, adminRouteState } from '@/lib/admin-routes'

import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import TempurPassIndicator from '@/components/dashboard/TempurPassIndicator'
import {
  adminNavHref,
  adminNavIsActive,
  adminRoleLabel,
  adminWorkspaceIsActive,
  defaultContextForPath,
  effectiveAdminContext,
  adminPathUsesProgramContext,
  tracksForProgram,
  visibleAdminNavGroups,
  type AdminContext,
  type AdminNavItem,
} from '@/lib/admin-nav'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from '@/components/admin/navigation/AdminLink'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * Shell Admin Workspace.
 *
 * ## Yang berubah dan kenapa
 *
 * Visibilitas menu DULU ditentukan satu boolean (`admin.access`), sehingga
 * `FINANCE` dan `SUPPORT` — yang memang punya `admin.access` di database —
 * melihat seluruh menu Content/Assessment/Commerce padahal tidak punya satu pun
 * permission di sana. Logikanya kini ada di `lib/admin-nav.ts` yang
 * permission-aware dan diuji per peran.
 *
 * Pendaratan (`homeHref`) juga tidak lagi di-hardcode ke Review: ia
 * memakai `landingPath` yang dihitung `adminLandingPath()` di layout, sehingga
 * tiap peran mendarat di pekerjaannya sendiri.
 *
 * Ikon dipetakan di sini (bukan di model) supaya `lib/admin-nav.ts` tetap bebas
 * JSX dan bisa diuji tanpa React.
 */

const ICONS: Record<string, typeof ShieldCheck> = {
  ArrowLeft,
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  CalendarDays,
  Building2,
  Users,
  BarChart3,
  Settings2,
  ShoppingBag,
}

interface UnifiedAdminShellProps {
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
    avatar_url?: string | null
    full_name?: string | null
  } | null
  roles: string[]
  permissions: string[]
  hasActiveTempurPass: boolean
  landingPath: string | null
  signoutAction: () => Promise<{ success: boolean }>
}

const userDashboardItem: AdminNavItem = {
  href: '/',
  label: 'Kembali ke aplikasi',
  icon: 'ArrowLeft',
  requiresAny: [],
  contextual: false,
}

function NavIcon({ name, size, className }: { name: string; size: number; className?: string }) {
  const Icon = ICONS[name] || ShieldCheck
  return <Icon size={size} className={className} />
}

const navRowClass =
  'group relative flex min-h-10 w-full items-center rounded-lg px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-blue-300 focus-visible:outline-offset-2'
const navActiveClass = 'bg-card/7 text-white'
const navInactiveClass = 'text-slate-300 hover:bg-card/5 hover:text-white'

function NavLabel({
  item,
  collapsed,
  active,
}: {
  item: AdminNavItem
  collapsed: boolean
  active: boolean
}) {
  return (
    <>
      {active ? (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-blue-400" />
      ) : null}
      <NavIcon
        name={item.icon}
        size={20}
        className={cn(
          'shrink-0',
          active ? 'text-blue-300' : 'text-muted-foreground group-hover:text-slate-200',
        )}
      />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </>
  )
}

function AdminNavLink({
  item,
  collapsed,
  contextHref,
  onNavigate,
  child = false,
}: {
  item: AdminNavItem
  collapsed: boolean
  contextHref: string
  onNavigate?: () => void
  child?: boolean
}) {
  const active = adminNavIsActive(usePathname(), item.href)
  return (
    <Link
      href={contextHref}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        navRowClass,
        collapsed ? 'justify-center' : 'gap-3',
        active ? navActiveClass : navInactiveClass,
        child && 'min-h-9 text-[13px]',
      )}
    >
      {child ? (
        <span className="truncate">{item.label}</span>
      ) : (
        <NavLabel item={item} collapsed={collapsed} active={active} />
      )}
    </Link>
  )
}

function AdminNavEntry({
  item,
  collapsed,
  context,
  onNavigate,
  onExpandSidebar,
}: {
  item: AdminNavItem
  collapsed: boolean
  context: AdminContext
  onNavigate: () => void
  onExpandSidebar: () => void
}) {
  const pathname = usePathname()
  const active = adminWorkspaceIsActive(pathname, item)
  // Route changes reset disclosure to the active workspace; other workspaces start closed.
  const [disclosure, setDisclosure] = useState({ pathname, open: active })
  const open = disclosure.pathname === pathname ? disclosure.open : active
  const contentId = useId()
  if (!item.children)
    return (
      <AdminNavLink
        item={item}
        collapsed={collapsed}
        contextHref={adminNavHref(item, context)}
        onNavigate={onNavigate}
      />
    )
  return (
    <div>
      <button
        type="button"
        aria-label={item.label}
        aria-expanded={!collapsed && open}
        aria-controls={!collapsed ? contentId : undefined}
        title={collapsed ? item.label : undefined}
        onClick={() => {
          if (collapsed) onExpandSidebar()
          setDisclosure({ pathname, open: collapsed || !open })
        }}
        className={cn(
          navRowClass,
          collapsed ? 'justify-center' : 'gap-3',
          active ? navActiveClass : navInactiveClass,
        )}
      >
        <NavLabel item={item} collapsed={collapsed} active={active} />
        {collapsed ? null : (
          <ChevronDown
            size={14}
            className={cn(
              'ml-auto shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
        )}
      </button>
      {!collapsed && open ? (
        <div id={contentId} className="ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3">
          {item.children.map((child) => (
            <AdminNavLink
              key={child.href}
              item={child}
              collapsed={false}
              child
              contextHref={adminNavHref(child, context)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function UnifiedAdminShell({
  children,
  user,
  profile,
  roles,
  permissions,
  hasActiveTempurPass,
  landingPath,
  signoutAction,
}: UnifiedAdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { confirm: confirmSignout, dialog: signoutDialog } = useAdminConfirm()
  const [signoutPending, setSignoutPending] = useState(false)
  const [signoutError, setSignoutError] = useState('')
  const menuTrigger = useRef<HTMLButtonElement>(null)
  async function handleSignout() {
    if (mobileOpen) {
      setMobileOpen(false)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      menuTrigger.current?.focus()
    }
    if (
      !(await confirmSignout({
        title: 'Keluar dari admin?',
        message: 'Sesi admin akan diakhiri.',
        confirmLabel: 'Ya, Keluar',
      }))
    )
      return
    setSignoutPending(true)
    try {
      const result = await signoutAction()
      if (!result?.success) setSignoutError('Gagal mengakhiri sesi. Coba lagi.')
    } catch {
      setSignoutError('Gagal mengakhiri sesi. Coba lagi.')
    } finally {
      setSignoutPending(false)
    }
  }
  const mobileDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = mobileDialog.current
    if (!dialog) return
    if (mobileOpen && !dialog.open) dialog.showModal()
    if (!mobileOpen && dialog.open) dialog.close()
    const overflow = document.body.style.overflow
    if (mobileOpen) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [mobileOpen])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeDrawer = () => {
      if (desktop.matches) setMobileOpen(false)
    }
    desktop.addEventListener('change', closeDrawer)
    return () => desktop.removeEventListener('change', closeDrawer)
  }, [])

  const visibleGroups = visibleAdminNavGroups(permissions)

  // Konteks efektif dihitung dari SATU fungsi bersama halaman, sehingga header
  // dan isi halaman tidak pernah lagi mengatakan konteks yang berbeda.
  const fallbackContext = defaultContextForPath(pathname)
  const routeContext = effectiveAdminContext(
    searchParams.get('domain') || searchParams.get('program') || fallbackContext.program,
    searchParams.get('level') || searchParams.get('track') || fallbackContext.track,
  )
  const routeProgram = routeContext.program
  const routeTrack = routeContext.track
  const showProgramContext = adminPathUsesProgramContext(pathname)
  const [retainedContext, setRetainedContext] = useState<AdminContext>(routeContext)
  useEffect(() => {
    if (showProgramContext) setRetainedContext({ program: routeProgram, track: routeTrack })
  }, [showProgramContext, routeProgram, routeTrack])
  const currentContext = showProgramContext ? routeContext : retainedContext
  const { program: currentProgram, track: currentTrack } = currentContext
  const tracks = tracksForProgram(currentProgram)

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Admin'
  const roleLabel = adminRoleLabel(roles)
  const roleTitle = roles.join(', ') || undefined

  const homeHref = landingPath || '/'

  function navigateContext(program: string, track: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('program', program)
    next.set('track', track)
    for (const key of [
      'domain',
      'level',
      'search',
      'type',
      'assessment',
      'event',
      'exam',
      'tab',
      'selector_search',
      'selector_domain',
      'selector_type',
      'selector_level',
      'selector_page',
      'material',
      'submaterial',
      'review',
      'subject',
      'status',
      'stage',
      'reviewer',
      'q',
      'question',
      'new',
      'edit',
      'bulk',
      'page',
      'ok',
      'error',
    ])
      next.delete(key)
    for (const key of ['org', 'batch', 'assignment', 'returnTo']) next.delete(key)
    const workspace = adminRouteState(pathname)?.workspace
    const contextRoots: Record<string, string> = {
      assessments: '/admin/assessments',
      events: '/admin/events',
      questions: '/admin/content/questions',
      review: '/admin/content/review',
      products: '/admin/commerce/products',
      monitoring: '/admin/monitoring',
      reports: '/admin/monitoring/reports',
      result: '/admin/monitoring',
    }
    router.push(
      adminHref(`${workspace ? contextRoots[workspace] || pathname : pathname}?${next.toString()}`),
    )
    setMobileOpen(false)
  }

  function changeProgram(program: string) {
    const nextTrack = tracksForProgram(program)[0] || 'SKD'
    navigateContext(program, nextTrack)
  }

  const renderSidebar = (minimized: boolean) => (
    <div
      data-admin-navigation
      className="flex h-full flex-col bg-[var(--brand-ink-950)] text-white"
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/10',
          minimized ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link
          href={homeHref}
          onClick={() => setMobileOpen(false)}
          className={cn('min-w-0', minimized && 'sr-only')}
        >
          <div className="font-script text-lg font-semibold text-white">
            Siap
            <span className="text-blue-300 underline decoration-wavy decoration-2 underline-offset-2">
              Tempur
            </span>
            .
          </div>
          <div className="text-xs font-medium text-muted-foreground">Admin</div>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-card/10 hover:text-white md:inline-flex"
          aria-label={minimized ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {minimized ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-card/10 md:hidden"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav aria-label="Menu admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <section key={group.label} className="mb-4">
            {minimized || !group.label ? null : (
              <div className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <AdminNavEntry
                  key={item.href}
                  item={item}
                  collapsed={minimized}
                  context={currentContext}
                  onNavigate={() => setMobileOpen(false)}
                  onExpandSidebar={() => setCollapsed(false)}
                />
              ))}
            </div>
          </section>
        ))}
        <div className="mt-4 border-t border-white/10 pt-4">
          <AdminNavLink
            item={userDashboardItem}
            collapsed={minimized}
            contextHref={userDashboardItem.href}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div
          className={cn(
            'flex items-center rounded-lg bg-card/6 p-2.5 ring-1 ring-white/10',
            minimized ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card/10 text-sm font-semibold text-white">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Avatar admin"
                fill
                className="object-cover"
                sizes="36px"
              />
            ) : (
              <span>{user.email?.[0]?.toUpperCase() || 'A'}</span>
            )}
          </div>
          {minimized ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{displayName}</p>
              <p
                className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                title={roleTitle}
              >
                {roleLabel}
              </p>
            </div>
          )}
        </div>
        {minimized ? null : (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSignout}
              disabled={signoutPending}
              aria-busy={signoutPending}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-card/10 hover:text-white disabled:cursor-wait"
            >
              <LogOut size={16} aria-hidden="true" />
              {signoutPending ? 'Keluar…' : 'Keluar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="admin-workspace min-h-screen bg-background font-body text-foreground">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden transition-[width] duration-200 md:block',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        {renderSidebar(collapsed)}
      </aside>

      <dialog
        ref={mobileDialog}
        aria-label="Menu admin"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const targets = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input,select,[tabindex="0"]',
            ),
          ).filter((el) => el.offsetParent !== null)
          const first = targets[0],
            last = targets[targets.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onCancel={() => setMobileOpen(false)}
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileOpen(false)
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[280px] max-w-[90vw] border-0 p-0 backdrop:bg-slate-950/45 md:hidden"
      >
        <aside className="h-full">{mobileOpen ? renderSidebar(false) : null}</aside>
      </dialog>

      <div
        className={cn(
          'min-h-screen transition-[padding] duration-200',
          collapsed ? 'md:pl-[68px]' : 'md:pl-[248px]',
        )}
      >
        <header
          className={cn(
            'sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm',
            !showProgramContext && !hasActiveTempurPass && 'md:hidden',
          )}
        >
          <div className="flex min-h-16 items-center gap-3 px-4 md:px-6 xl:px-8">
            <button
              ref={menuTrigger}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
              aria-label="Buka menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={19} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              {showProgramContext ? (
                <>
                  <label className="flex min-w-0 items-center gap-2">
                    <span className="hidden text-xs font-medium text-muted-foreground lg:inline">
                      Program
                    </span>
                    <select
                      value={currentProgram}
                      onChange={(event) => changeProgram(event.target.value)}
                      aria-label="Program"
                      className="h-9 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/10"
                    >
                      <option value="CPNS">CPNS</option>
                      <option value="TKA">TKA</option>
                    </select>
                  </label>
                  <label className="flex min-w-0 items-center gap-2">
                    <span className="hidden text-xs font-medium text-muted-foreground lg:inline">
                      Track
                    </span>
                    <select
                      value={currentTrack}
                      onChange={(event) => navigateContext(currentProgram, event.target.value)}
                      aria-label="Track"
                      className="h-9 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/10"
                    >
                      {tracks.map((track) => (
                        <option key={track} value={track}>
                          {track}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              {hasActiveTempurPass && <TempurPassIndicator href="/tka/smp/pass" compact />}
            </div>
          </div>
        </header>

        {signoutError && (
          <p role="alert" className="mx-4 mt-4 rounded-lg bg-danger-muted p-3 text-sm text-danger">
            {signoutError}
          </p>
        )}
        <main className="w-full min-w-0 px-4 py-6 md:px-6 xl:px-8">{children}</main>
      </div>
      {signoutDialog}
    </div>
  )
}
