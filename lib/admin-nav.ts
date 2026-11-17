import { adminHref, adminRouteState, adminRoutes } from './admin-routes'
/** Primary admin workspaces. Detail resources are reached through their parent. */

import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'

export type AdminNavItem = {
  href: string
  label: string
  icon: string
  requiresAny: PermissionCode[]
  contextual: boolean
  children?: AdminNavItem[]
}

export type AdminNavGroup = { label: string; items: AdminNavItem[] }

const CONTENT_PERMISSIONS = [
  PERMISSIONS.CONTENT_READ,
  PERMISSIONS.CONTENT_CREATE,
  PERMISSIONS.CONTENT_UPDATE,
  PERMISSIONS.CONTENT_REVIEW,
  PERMISSIONS.CONTENT_PUBLISH,
]
const READINESS_PERMISSIONS = [
  PERMISSIONS.QUESTION_MANAGE,
  PERMISSIONS.CONTENT_REVIEW,
  PERMISSIONS.PRODUCT_MANAGE,
  PERMISSIONS.EXAM_MANAGE,
]

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: '',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        requiresAny: [PERMISSIONS.ADMIN_ACCESS],
        contextual: true,
      },
    ],
  },
  {
    label: 'Learning',
    items: [
      {
        href: adminRoutes.assessments,
        label: 'Assessment',
        icon: 'ClipboardCheck',
        requiresAny: [PERMISSIONS.EXAM_MANAGE],
        contextual: true,
      },
      {
        href: '/admin/content',
        label: 'Content',
        icon: 'BookOpen',
        requiresAny: [
          PERMISSIONS.QUESTION_MANAGE,
          ...CONTENT_PERMISSIONS,
          PERMISSIONS.PRODUCT_MANAGE,
          PERMISSIONS.EXAM_MANAGE,
        ],
        contextual: false,
        children: [
          {
            href: '/admin/content/questions',
            label: 'Question Bank',
            icon: 'FileQuestion',
            requiresAny: [PERMISSIONS.QUESTION_MANAGE],
            contextual: true,
          },
          {
            href: '/admin/content/review',
            label: 'Review',
            icon: 'ClipboardCheck',
            requiresAny: CONTENT_PERMISSIONS,
            contextual: true,
          },
          {
            href: '/admin/content/articles',
            label: 'Articles',
            icon: 'BookOpen',
            requiresAny: [
              PERMISSIONS.CONTENT_READ,
              PERMISSIONS.CONTENT_CREATE,
              PERMISSIONS.CONTENT_UPDATE,
              PERMISSIONS.CONTENT_PUBLISH,
            ],
            contextual: false,
          },
          {
            href: '/admin/content/readiness',
            label: 'Content Readiness',
            icon: 'ShieldCheck',
            requiresAny: READINESS_PERMISSIONS,
            contextual: false,
          },
        ],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        href: adminRoutes.events,
        label: 'Event',
        icon: 'CalendarDays',
        requiresAny: [PERMISSIONS.EVENT_MANAGE],
        contextual: true,
      },
      {
        href: adminRoutes.organizations,
        label: 'Instansi',
        icon: 'Building2',
        requiresAny: [PERMISSIONS.ORGANIZATION_MANAGE],
        contextual: false,
      },
      {
        href: '/admin/monitoring',
        label: 'Monitoring',
        icon: 'BarChart3',
        requiresAny: [
          PERMISSIONS.EVENT_MANAGE,
          PERMISSIONS.ORGANIZATION_MANAGE,
          PERMISSIONS.REPORT_READ,
        ],
        contextual: false,
      },
    ],
  },
  {
    label: 'Business',
    items: [
      {
        href: adminRoutes.orders,
        label: 'Commerce',
        icon: 'ShoppingBag',
        requiresAny: [
          PERMISSIONS.PRODUCT_MANAGE,
          PERMISSIONS.ORDER_READ,
          PERMISSIONS.PAYMENT_MANAGE,
        ],
        contextual: false,
        children: [
          {
            href: '/admin/commerce/products',
            label: 'Products',
            icon: 'Package',
            requiresAny: [PERMISSIONS.PRODUCT_MANAGE],
            contextual: true,
          },
          {
            href: adminRoutes.orders,
            label: 'Orders',
            icon: 'ShoppingBag',
            requiresAny: [PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_MANAGE],
            contextual: false,
          },
        ],
      },
      {
        href: '/admin/users',
        label: 'Users',
        icon: 'Users',
        requiresAny: [
          PERMISSIONS.USER_READ,
          PERMISSIONS.USER_MANAGE,
          PERMISSIONS.ENTITLEMENT_MANAGE,
        ],
        contextual: false,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        href: '/admin/settings',
        label: 'Settings',
        icon: 'Settings2',
        requiresAny: [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.AUDIT_READ],
        contextual: false,
      },
    ],
  },
]

/**
 * Urutan tujuan pendaratan per peran.
 *
 * Dievaluasi dari atas: kandidat pertama yang izinnya dimiliki dipakai. Urutan
 * ini sengaja menaruh pekerjaan yang paling sering dilakukan lebih dulu,
 * sehingga peran tunggal tidak mendarat di halaman yang bukan urusannya.
 */
const LANDING_CANDIDATES: Array<{ href: string; requiresAny: PermissionCode[] }> = [
  { href: '/admin', requiresAny: [PERMISSIONS.ADMIN_ACCESS] },
  { href: '/admin/content/questions', requiresAny: [PERMISSIONS.QUESTION_MANAGE] },
  // Author dan reviewer berbagi satu workspace. Review adalah satu-satunya
  // tempat menulis soal bagi peran tanpa `question.manage`, jadi ia yang
  // didahulukan atas Articles.
  {
    href: '/admin/content/review',
    requiresAny: [
      PERMISSIONS.CONTENT_CREATE,
      PERMISSIONS.CONTENT_UPDATE,
      PERMISSIONS.CONTENT_REVIEW,
      PERMISSIONS.CONTENT_PUBLISH,
    ],
  },
  { href: '/admin/content/articles', requiresAny: [PERMISSIONS.CONTENT_READ] },
  // Instansi didahulukan atas Reports: `SCHOOL_ADMIN` memegang
  // organization.manage + report.read, dan pekerjaan utamanya adalah
  // mengelola instansi serta batch-nya, bukan membaca laporan.
  { href: adminRoutes.organizations, requiresAny: [PERMISSIONS.ORGANIZATION_MANAGE] },
  { href: '/admin/users', requiresAny: [PERMISSIONS.USER_MANAGE, PERMISSIONS.USER_READ] },
  { href: '/admin/monitoring', requiresAny: [PERMISSIONS.REPORT_READ] },
  { href: '/admin/settings', requiresAny: [PERMISSIONS.AUDIT_READ] },
  { href: adminRoutes.orders, requiresAny: [PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_MANAGE] },
  { href: '/admin/commerce/products', requiresAny: [PERMISSIONS.PRODUCT_MANAGE] },
  { href: '/admin/users', requiresAny: [PERMISSIONS.ENTITLEMENT_MANAGE] },
  { href: adminRoutes.assessments, requiresAny: [PERMISSIONS.EXAM_MANAGE] },
  { href: adminRoutes.events, requiresAny: [PERMISSIONS.EVENT_MANAGE] },
  { href: '/admin/settings', requiresAny: [PERMISSIONS.SETTINGS_MANAGE] },
]

/** Semua link yang benar-benar ada di pohon navigasi. */
export const ADMIN_NAV_HREFS = ADMIN_NAV_GROUPS.flatMap((group) => group.items)
  .flatMap((item) => item.children ?? [item])
  .map((item) => item.href)

function asPermissionSet(permissions: Iterable<string>) {
  return permissions instanceof Set ? permissions : new Set(permissions)
}

function hasAny(permissionSet: Set<string>, required: readonly string[]) {
  return required.some((permission) => permissionSet.has(permission))
}

/**
 * Grup navigasi yang boleh dilihat pemegang `permissions`.
 *
 * Grup yang seluruh itemnya tersaring keluar ikut dibuang, sehingga tidak
 * pernah ada judul grup tanpa isi.
 */
export function visibleAdminNavGroups(permissions: Iterable<string>): AdminNavGroup[] {
  const permissionSet = asPermissionSet(permissions)
  return ADMIN_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => hasAny(permissionSet, item.requiresAny))
      .map((item) => ({
        ...item,
        ...(item.children
          ? { children: item.children.filter((child) => hasAny(permissionSet, child.requiresAny)) }
          : {}),
      })),
  })).filter((group) => group.items.length > 0)
}

/** Semua href yang boleh dibuka pemegang `permissions`. */
export function visibleAdminHrefs(permissions: Iterable<string>): string[] {
  return visibleAdminNavGroups(permissions)
    .flatMap((group) => group.items)
    .flatMap((item) => item.children ?? [item])
    .map((item) => item.href)
}

/**
 * Halaman pendaratan yang tepat untuk `permissions`.
 *
 * Mengembalikan `null` bila pemegang permission benar-benar tidak punya
 * permukaan admin. Pemanggil WAJIB menanganinya secara eksplisit — jangan
 * diam-diam melempar ke halaman lain, karena itulah yang membuat
 * `SCHOOL_ADMIN` (hanya `organization.manage` + `report.read`) dulu berakhir
 * tanpa penjelasan di dashboard peserta.
 */
export function adminLandingPath(permissions: Iterable<string>): string | null {
  const permissionSet = asPermissionSet(permissions)
  const candidate = LANDING_CANDIDATES.find((entry) => hasAny(permissionSet, entry.requiresAny))
  return candidate ? candidate.href : null
}

/** Apakah pemegang `permissions` punya permukaan admin sama sekali. */
export function hasAdminSurface(permissions: Iterable<string>): boolean {
  return adminLandingPath(permissions) !== null
}

/**
 * Label peran yang bisa dibaca manusia.
 *
 * Sebelumnya shell menampilkan `roles[0]` mentah (`CONTENT_REVIEWER`), dan hanya
 * peran pertama bila pengguna punya lebih dari satu.
 */
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CONTENT_EDITOR: 'Editor Konten',
  CONTENT_REVIEWER: 'Reviewer Konten',
  FINANCE: 'Keuangan',
  SUPPORT: 'Dukungan',
  SCHOOL_ADMIN: 'Admin Sekolah',
}

export function adminRoleLabel(roles: readonly string[]): string {
  if (roles.length === 0) return 'Tanpa peran'
  const labels = roles.map((role) => ROLE_LABELS[role] || role)
  if (labels.length === 1) return labels[0]
  // Lebih dari satu peran: tampilkan yang pertama dan jumlah sisanya, supaya
  // label tetap muat di header alih-alih dipotong tanpa penjelasan.
  return `${labels[0]} +${labels.length - 1}`
}

/** Konteks program/track yang valid, dalam bentuk kanonik (huruf besar). */
export type AdminContext = { program: string; track: string }

/**
 * Kombinasi program/track yang sah — harus sama dengan isi `CONTEXTS` di shell
 * dan dengan yang divalidasi `catalog-context.service`.
 */
const ADMIN_CONTEXTS: readonly AdminContext[] = [
  { program: 'CPNS', track: 'SKD' },
  { program: 'TKA', track: 'SD' },
  { program: 'TKA', track: 'SMP' },
  { program: 'TKA', track: 'SMA' },
] as const

/** Konteks default bila URL tidak menyebutkan apa pun. */
const ADMIN_DEFAULT_CONTEXT: AdminContext = { program: 'CPNS', track: 'SKD' }

/**
 * Menormalkan `program`/`track` dari URL.
 *
 * Mengembalikan `null` bila kombinasinya tidak sah. Sebelumnya shell memakai
 * `CONTEXTS.find(...) || CONTEXTS[0]`, sehingga `?program=TKA&track=SKD`
 * ditampilkan di header sebagai **CPNS/SKD** sementara halamannya memakai
 * TKA/SKD dari URL — header dan isi halaman bisa mengatakan hal yang berbeda.
 * `null` membuat pemanggil memilih: pakai default, atau perbaiki URL.
 */
export function resolveAdminContext(
  program?: string | null,
  track?: string | null,
): AdminContext | null {
  if (!program || !track) return null
  const wantedProgram = program.trim().toUpperCase()
  const wantedTrack = track.trim().toUpperCase()
  return (
    ADMIN_CONTEXTS.find(
      (context) => context.program === wantedProgram && context.track === wantedTrack,
    ) ?? null
  )
}

/**
 * Konteks efektif untuk sebuah URL: konteks yang diminta bila sah, selain itu
 * default. Dipakai bersama oleh shell dan halaman supaya keduanya tidak pernah
 * menampilkan konteks yang berbeda.
 */
export function effectiveAdminContext(
  program?: string | null,
  track?: string | null,
): AdminContext {
  return resolveAdminContext(program, track) ?? ADMIN_DEFAULT_CONTEXT
}

/** Track yang sah untuk sebuah program. */
export function tracksForProgram(program: string): string[] {
  const wanted = program.trim().toUpperCase()
  return ADMIN_CONTEXTS.filter((context) => context.program === wanted).map(
    (context) => context.track,
  )
}

/** Whether a workspace page needs a visible Program/Track context selector. */
export function adminPathUsesProgramContext(pathname: string): boolean {
  const canonicalPath = adminHref(pathname).split('?')[0].replace(/\/$/, '') || '/'
  if (canonicalPath === '/admin') return true
  const workspace = adminRouteState(canonicalPath)?.workspace
  return ['assessments', 'events', 'questions', 'review', 'products'].includes(workspace ?? '')
}

/**
 * Konteks yang dipakai sebuah path bila URL tidak menyebutkannya.
 *
 * Review historisnya berjalan di konteks TKA/SMP (ia tumbuh dari modul TKA
 * lebih dulu), sedangkan modul lain default CPNS/SKD. Perbedaan ini
 * dipertahankan apa adanya supaya perilaku tidak berubah — tetapi kini
 * didefinisikan di SATU tempat, bukan disalin ke shell dan ke tiap halaman.
 */
export function defaultContextForPath(pathname: string): AdminContext {
  if (pathname.startsWith('/admin/content/review')) {
    return { program: 'TKA', track: 'SMP' }
  }
  return ADMIN_DEFAULT_CONTEXT
}

/** Route labels for the persistent context bar; never expose raw route IDs. */
export function adminBreadcrumbs(pathname: string): Array<{ label: string; href?: string }> {
  const routes: Array<{ prefix: string; crumbs: Array<{ label: string; href?: string }> }> = [
    {
      prefix: '/admin/content/questions',
      crumbs: [{ label: 'Learning' }, { label: 'Content' }, { label: 'Question Bank' }],
    },
    {
      prefix: '/admin/content/review',
      crumbs: [{ label: 'Learning' }, { label: 'Content' }, { label: 'Review' }],
    },
    {
      prefix: '/admin/content/articles',
      crumbs: [{ label: 'Learning' }, { label: 'Content' }, { label: 'Articles' }],
    },
    { prefix: '/admin/assessments', crumbs: [{ label: 'Learning' }, { label: 'Assessment' }] },
    { prefix: '/admin/events', crumbs: [{ label: 'Operations' }, { label: 'Event' }] },
    { prefix: '/admin/organizations', crumbs: [{ label: 'Operations' }, { label: 'Instansi' }] },
    { prefix: '/admin/monitoring', crumbs: [{ label: 'Operations' }, { label: 'Monitoring' }] },
    {
      prefix: '/admin/monitoring/results',
      crumbs: [
        { label: 'Operations' },
        { label: 'Monitoring', href: '/admin/monitoring' },
        { label: 'Hasil' },
      ],
    },
    {
      prefix: '/admin/content/readiness',
      crumbs: [{ label: 'Learning' }, { label: 'Content Readiness' }],
    },
    {
      prefix: '/admin/monitoring/reports',
      crumbs: [
        { label: 'Operations' },
        { label: 'Monitoring', href: '/admin/monitoring' },
        { label: 'Reports' },
      ],
    },
    { prefix: '/admin/users', crumbs: [{ label: 'Business' }, { label: 'Users' }] },
    {
      prefix: '/admin/commerce/products',
      crumbs: [{ label: 'Business' }, { label: 'Commerce' }, { label: 'Products' }],
    },
    {
      prefix: '/admin/commerce/orders',
      crumbs: [{ label: 'Business' }, { label: 'Commerce' }, { label: 'Orders' }],
    },
    {
      prefix: '/admin/users/access',
      crumbs: [
        { label: 'Business' },
        { label: 'Users', href: '/admin/users' },
        { label: 'Entitlements' },
      ],
    },
    {
      prefix: '/admin/settings/audit',
      crumbs: [
        { label: 'System' },
        { label: 'Settings', href: '/admin/settings' },
        { label: 'Audit Log' },
      ],
    },
    { prefix: '/admin/settings', crumbs: [{ label: 'System' }, { label: 'Settings' }] },
  ]
  const route = routes
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return route?.crumbs ?? [{ label: 'Dashboard' }]
}

/**
 * Apakah `href` adalah halaman yang sedang dibuka.
 *
 * `/admin` dan `/admin/commerce/orders` diperlakukan sebagai exact match supaya
 * keduanya tidak ikut aktif pada anak-anaknya (`/admin/content/*`,
 * `/admin/commerce/products`).
 */
export function adminNavIsActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === href
  if (
    href === '/admin/monitoring' &&
    ['/admin/monitoring/reports', '/admin/monitoring/results'].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  )
    return true
  if (
    href === '/admin/settings' &&
    (pathname === '/admin/settings/audit' || pathname.startsWith('/admin/settings/audit/'))
  )
    return true
  if (href === '/admin/users' && pathname === '/admin/users/access') return true
  if (href === '/admin/commerce/orders')
    return pathname === href || pathname.startsWith('/admin/commerce/orders/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function adminWorkspaceIsActive(pathname: string, item: AdminNavItem): boolean {
  return (
    adminNavIsActive(pathname, item.href) ||
    Boolean(item.children?.some((child) => adminNavIsActive(pathname, child.href)))
  )
}

/** Link navigasi dengan konteks yang hanya ditambahkan pada modul contextual. */
export function adminNavHref(item: AdminNavItem, context: AdminContext): string {
  if (!item.contextual) return item.href
  return `${item.href}?${new URLSearchParams({ program: context.program, track: context.track }).toString()}`
}
