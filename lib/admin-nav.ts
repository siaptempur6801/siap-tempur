/**
 * Model navigasi Admin Workspace.
 *
 * ## Kenapa modul terpisah
 *
 * Sebelumnya visibilitas menu ditentukan oleh SATU boolean di
 * `UnifiedAdminShell.tsx`:
 *
 *     const isFullAdmin = permissionSet.has('admin.access')
 *     if (item.adminOnly) return isFullAdmin
 *
 * Akibatnya setiap peran yang punya `admin.access` melihat SELURUH menu.
 * Di database, `FINANCE` dan `SUPPORT` memang punya `admin.access` — jadi
 * keduanya melihat Content, Assessment, dan Commerce lengkap, padahal keduanya
 * tidak punya satu pun permission di sana. Sebaliknya peran tanpa `admin.access`
 * (`CONTENT_EDITOR`, `CONTENT_REVIEWER`, `SCHOOL_ADMIN`) hanya kebagian menu
 * yang ditebak dari daftar permission content yang di-hardcode.
 *
 * `docs/ADMIN_UI_UX_STANDARD.md` §4 sudah menetapkan aturannya:
 * "Menu harus permission-aware; jangan tampilkan aksi/menu yang user tidak dapat
 * gunakan" dan "Tidak boleh ada dead-end navigation".
 *
 * Modul ini yang menegakkan keduanya, dan dipisah dari komponen supaya dapat
 * diuji tanpa React: `tests/unit/admin-nav.test.ts` mengunci perilaku tiap
 * peran yang benar-benar ada di database.
 *
 * ## Yang TIDAK ada di sini
 *
 * Ikon. Model ini sengaja bebas JSX supaya bisa diimpor unit test tanpa
 * merender React; `UnifiedAdminShell` memetakan `icon` (nama) ke komponen lucide.
 */

import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'

export type AdminNavItem = {
    href: string
    label: string
    mobileLabel?: string
    /** Nama ikon lucide; dipetakan ke komponen di shell. */
    icon: string
    /**
     * Item tampil bila user punya SALAH SATU permission ini.
     *
     * Sengaja "salah satu", bukan "semua": satu halaman sering melayani beberapa
     * pekerjaan (mis. Review Queue dipakai author maupun reviewer), dan halaman
     * itu sendiri yang menyembunyikan aksi yang tidak diizinkan.
     */
    requiresAny: PermissionCode[]
    /** Datanya terikat program/track, jadi link harus membawa konteks. */
    contextual: boolean
}

export type AdminNavGroup = {
    label: string
    items: AdminNavItem[]
}

/**
 * Pohon navigasi — mengikuti `docs/ADMIN_UI_UX_STANDARD.md` §2 (Information
 * Architecture). Urutan grup menentukan urutan di sidebar.
 *
 * Label item SENGAJA tidak diubah: E2E mengklik menu berdasarkan label
 * ("Question Bank", "Review Queue", "Exams", "Products"), jadi mengganti label
 * akan memutus test yang sudah ada sekaligus membingungkan pengguna lama.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
    {
        label: 'Overview',
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
        label: 'Content',
        items: [
            {
                href: '/admin/content/questions',
                label: 'Question Bank',
                icon: 'FileQuestion',
                requiresAny: [PERMISSIONS.QUESTION_MANAGE],
                contextual: true,
            },
            {
                href: '/admin/content/review',
                label: 'Review Queue',
                mobileLabel: 'Review',
                icon: 'ClipboardCheck',
                requiresAny: [
                    PERMISSIONS.CONTENT_READ,
                    PERMISSIONS.CONTENT_CREATE,
                    PERMISSIONS.CONTENT_UPDATE,
                    PERMISSIONS.CONTENT_REVIEW,
                    PERMISSIONS.CONTENT_PUBLISH,
                ],
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
                // Artikel bersifat global: halamannya tidak membaca program/track
                // sama sekali, jadi menempelkan konteks hanya akan menyesatkan.
                contextual: false,
            },
        ],
    },
    {
        label: 'Assessment',
        items: [
            {
                href: '/admin/assessment/exams',
                label: 'Exams',
                icon: 'FileQuestion',
                requiresAny: [PERMISSIONS.EXAM_MANAGE],
                contextual: true,
            },
            {
                href: '/admin/assessment/events',
                label: 'Events',
                icon: 'CalendarDays',
                requiresAny: [PERMISSIONS.EVENT_MANAGE],
                contextual: true,
            },
        ],
    },
    {
        label: 'Commerce',
        items: [
            {
                href: '/admin/commerce/products',
                label: 'Products',
                icon: 'Package',
                requiresAny: [PERMISSIONS.PRODUCT_MANAGE],
                contextual: true,
            },
            {
                href: '/admin/commerce',
                label: 'Orders & Payments',
                mobileLabel: 'Commerce',
                icon: 'CreditCard',
                requiresAny: [PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_MANAGE],
                contextual: true,
            },
        ],
    },
    {
        label: 'People',
        items: [
            {
                href: '/admin/users',
                label: 'Users & Roles',
                mobileLabel: 'Users',
                icon: 'Users',
                requiresAny: [PERMISSIONS.USER_READ, PERMISSIONS.USER_MANAGE],
                contextual: false,
            },
        ],
    },
    {
        label: 'Insights',
        items: [
            {
                href: '/admin/reports',
                label: 'Reports',
                icon: 'BarChart3',
                requiresAny: [PERMISSIONS.REPORT_READ],
                contextual: true,
            },
            {
                href: '/admin/audit',
                label: 'Audit Log',
                mobileLabel: 'Audit',
                icon: 'ScrollText',
                requiresAny: [PERMISSIONS.AUDIT_READ],
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
    // Author dan reviewer berbagi satu workspace. Review Queue adalah satu-satunya
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
    { href: '/admin/users', requiresAny: [PERMISSIONS.USER_MANAGE, PERMISSIONS.USER_READ] },
    { href: '/admin/reports', requiresAny: [PERMISSIONS.REPORT_READ] },
    { href: '/admin/audit', requiresAny: [PERMISSIONS.AUDIT_READ] },
    { href: '/admin/commerce', requiresAny: [PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_MANAGE] },
    { href: '/admin/commerce/products', requiresAny: [PERMISSIONS.PRODUCT_MANAGE] },
    { href: '/admin/assessment/exams', requiresAny: [PERMISSIONS.EXAM_MANAGE] },
    { href: '/admin/assessment/events', requiresAny: [PERMISSIONS.EVENT_MANAGE] },
]

/** Semua permission yang memberi akses ke suatu permukaan admin. */
export const ADMIN_SURFACE_PERMISSIONS: PermissionCode[] = [
    ...new Set(
        ADMIN_NAV_GROUPS.flatMap((group) => group.items).flatMap((item) => item.requiresAny),
    ),
]

/** Semua link yang benar-benar ada di pohon navigasi. */
export const ADMIN_NAV_HREFS = ADMIN_NAV_GROUPS.flatMap((group) => group.items).map((item) => item.href)

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
    return ADMIN_NAV_GROUPS
        .map((group) => ({
            label: group.label,
            items: group.items.filter((item) => hasAny(permissionSet, item.requiresAny)),
        }))
        .filter((group) => group.items.length > 0)
}

/** Semua href yang boleh dibuka pemegang `permissions`. */
export function visibleAdminHrefs(permissions: Iterable<string>): string[] {
    return visibleAdminNavGroups(permissions).flatMap((group) => group.items).map((item) => item.href)
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
export const ADMIN_CONTEXTS: readonly AdminContext[] = [
    { program: 'CPNS', track: 'SKD' },
    { program: 'TKA', track: 'SD' },
    { program: 'TKA', track: 'SMP' },
    { program: 'TKA', track: 'SMA' },
] as const

/** Konteks default bila URL tidak menyebutkan apa pun. */
export const ADMIN_DEFAULT_CONTEXT: AdminContext = { program: 'CPNS', track: 'SKD' }

/**
 * Menormalkan `program`/`track` dari URL.
 *
 * Mengembalikan `null` bila kombinasinya tidak sah. Sebelumnya shell memakai
 * `CONTEXTS.find(...) || CONTEXTS[0]`, sehingga `?program=TKA&track=SKD`
 * ditampilkan di header sebagai **CPNS/SKD** sementara halamannya memakai
 * TKA/SKD dari URL — header dan isi halaman bisa mengatakan hal yang berbeda.
 * `null` membuat pemanggil memilih: pakai default, atau perbaiki URL.
 */
export function resolveAdminContext(program?: string | null, track?: string | null): AdminContext | null {
    if (!program || !track) return null
    const wantedProgram = program.trim().toUpperCase()
    const wantedTrack = track.trim().toUpperCase()
    return ADMIN_CONTEXTS.find(
        (context) => context.program === wantedProgram && context.track === wantedTrack,
    ) ?? null
}

/**
 * Konteks efektif untuk sebuah URL: konteks yang diminta bila sah, selain itu
 * default. Dipakai bersama oleh shell dan halaman supaya keduanya tidak pernah
 * menampilkan konteks yang berbeda.
 */
export function effectiveAdminContext(program?: string | null, track?: string | null): AdminContext {
    return resolveAdminContext(program, track) ?? ADMIN_DEFAULT_CONTEXT
}

/** Track yang sah untuk sebuah program. */
export function tracksForProgram(program: string): string[] {
    const wanted = program.trim().toUpperCase()
    return ADMIN_CONTEXTS.filter((context) => context.program === wanted).map((context) => context.track)
}

/**
 * Konteks yang dipakai sebuah path bila URL tidak menyebutkannya.
 *
 * Review Queue historisnya berjalan di konteks TKA/SMP (ia tumbuh dari modul TKA
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

/**
 * Apakah `href` adalah halaman yang sedang dibuka.
 *
 * `/admin` dan `/admin/commerce` diperlakukan sebagai exact match supaya
 * keduanya tidak ikut aktif pada anak-anaknya (`/admin/content/*`,
 * `/admin/commerce/products`).
 */
export function adminNavIsActive(pathname: string, href: string): boolean {
    if (href === '/admin' || href === '/admin/commerce') return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
}

/** Link navigasi dengan konteks yang hanya ditambahkan pada modul contextual. */
export function adminNavHref(item: AdminNavItem, context: AdminContext): string {
    if (!item.contextual) return item.href
    return `${item.href}?${new URLSearchParams({ program: context.program, track: context.track }).toString()}`
}
