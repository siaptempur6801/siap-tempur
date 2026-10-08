import { describe, expect, it } from 'vitest'
import {
    ADMIN_NAV_HREFS,
    adminBreadcrumbs,
    adminPathUsesProgramContext,
    adminLandingPath,
    adminNavHref,
    adminNavIsActive,
    adminWorkspaceIsActive,
    adminRoleLabel,
    defaultContextForPath,
    effectiveAdminContext,
    hasAdminSurface,
    resolveAdminContext,
    tracksForProgram,
    visibleAdminHrefs,
    visibleAdminNavGroups,
} from '@/lib/admin-nav'

/**
 * Alur peran di Admin Workspace.
 *
 * ## Kenapa test ini ada
 *
 * Sebelumnya visibilitas menu ditentukan SATU boolean:
 * `isFullAdmin = permissionSet.has('admin.access')`. Karena `FINANCE` dan
 * `SUPPORT` juga punya `admin.access` di database, keduanya melihat seluruh menu
 * Content/Assessment/Commerce padahal tidak punya satu pun permission di sana —
 * dan setiap halaman yang dibuka menjalankan query beratnya lebih dulu sebelum
 * menampilkan "Akses tidak tersedia".
 *
 * Sebaliknya peran tanpa `admin.access` hanya kebagian menu yang ditebak dari
 * daftar permission content yang di-hardcode, dan `SCHOOL_ADMIN` tidak mendapat
 * permukaan apa pun sehingga dilempar diam-diam ke dashboard peserta.
 *
 * Himpunan permission di bawah ini disalin APA ADANYA dari `role_permissions` di
 * database (staging & produksi), bukan karangan. Kalau suatu saat peran di
 * database berubah, test ini yang memberi tahu bahwa alur admin perlu ditinjau.
 */

const ROLE_PERMISSIONS: Record<string, string[]> = {
    SUPER_ADMIN: [
        'admin.access', 'audit.read', 'content.create', 'content.publish', 'content.read',
        'content.review', 'content.update', 'entitlement.manage', 'event.manage', 'exam.manage',
        'notification.manage', 'order.read', 'organization.manage', 'payment.manage',
        'product.manage', 'question.manage', 'report.read', 'role.manage', 'settings.manage',
        'user.manage', 'user.read',
    ],
    ADMIN: [
        'admin.access', 'audit.read', 'content.create', 'content.publish', 'content.read',
        'content.review', 'content.update', 'entitlement.manage', 'event.manage', 'exam.manage',
        'notification.manage', 'order.read', 'organization.manage', 'payment.manage',
        'product.manage', 'question.manage', 'report.read', 'settings.manage', 'user.manage',
        'user.read',
    ],
    CONTENT_EDITOR: ['content.create', 'content.read', 'content.update'],
    CONTENT_REVIEWER: ['content.publish', 'content.read', 'content.review'],
    FINANCE: ['admin.access', 'entitlement.manage', 'order.read', 'payment.manage', 'report.read'],
    SUPPORT: ['admin.access', 'order.read', 'user.manage', 'user.read'],
    SCHOOL_ADMIN: ['organization.manage', 'report.read'],
}

const labels = (permissions: string[]) => visibleAdminNavGroups(permissions).flatMap((group) => group.items).map((item) => item.label)

describe('visibleAdminNavGroups — primary workspaces remain permission-aware', () => {
    it('ADMIN and SUPER_ADMIN see nine primary entries in four sections', () => {
        for (const role of ['ADMIN', 'SUPER_ADMIN']) {
            expect(labels(ROLE_PERMISSIONS[role])).toEqual(['Dashboard', 'Assessment', 'Content', 'Event', 'Instansi', 'Monitoring', 'Commerce', 'Users', 'Settings'])
            expect(visibleAdminHrefs(ROLE_PERMISSIONS[role]).sort()).toEqual([...ADMIN_NAV_HREFS].sort())
            expect(visibleAdminNavGroups(ROLE_PERMISSIONS[role]).map(group => group.label)).toEqual(['', 'Learning', 'Operations', 'Business', 'System'])
        }
    })

    it('Content and Commerce contain only permitted children', () => {
        const items = visibleAdminNavGroups(ROLE_PERMISSIONS.ADMIN).flatMap(group => group.items)
        expect(items.find(item => item.label === 'Content')?.children?.map(item => item.label)).toEqual(['Question Bank', 'Review', 'Articles'])
        expect(items.find(item => item.label === 'Commerce')?.children?.map(item => item.label)).toEqual(['Products', 'Orders'])
        const finance = visibleAdminNavGroups(ROLE_PERMISSIONS.FINANCE).flatMap(group => group.items)
        expect(finance.find(item => item.label === 'Commerce')?.children?.map(item => item.label)).toEqual(['Orders'])
    })

    it('supporting resources never appear as global entries', () => {
        for (const role of Object.keys(ROLE_PERMISSIONS)) {
            for (const forbidden of ['Question Bank', 'Review', 'Articles', 'Products', 'Orders', 'Reports', 'Audit Log', 'Entitlements', 'Batch']) {
                expect(labels(ROLE_PERMISSIONS[role])).not.toContain(forbidden)
            }
        }
    })

    it('FINANCE can reach orders, reports, and user access through their workspaces', () => {
        expect(labels(ROLE_PERMISSIONS.FINANCE)).toEqual(['Dashboard', 'Monitoring', 'Commerce', 'Users'])
        expect(visibleAdminHrefs(ROLE_PERMISSIONS.FINANCE)).not.toContain('/admin/commerce/products')
    })

    it('SUPPORT sees Dashboard, Commerce, and Users', () => {
        expect(labels(ROLE_PERMISSIONS.SUPPORT)).toEqual(['Dashboard', 'Commerce', 'Users'])
    })

    it('editor and reviewer see Content with Review and Articles only', () => {
        for (const role of ['CONTENT_EDITOR', 'CONTENT_REVIEWER']) {
            expect(labels(ROLE_PERMISSIONS[role])).toEqual(['Content'])
            expect(visibleAdminHrefs(ROLE_PERMISSIONS[role])).toEqual(['/admin/content/review', '/admin/content/articles'])
        }
    })

    it('SCHOOL_ADMIN sees Instansi and Monitoring', () => {
        expect(labels(ROLE_PERMISSIONS.SCHOOL_ADMIN)).toEqual(['Instansi', 'Monitoring'])
        expect(visibleAdminNavGroups(ROLE_PERMISSIONS.SCHOOL_ADMIN).map(group => group.label)).toEqual(['Operations'])
    })

    it('secondary permissions retain an accessible parent workspace', () => {
        expect(labels(['report.read'])).toEqual(['Monitoring'])
        expect(labels(['audit.read'])).toEqual(['Settings'])
        expect(labels(['entitlement.manage'])).toEqual(['Users'])
        expect(adminLandingPath(['report.read'])).toBe('/admin/monitoring')
        expect(adminLandingPath(['audit.read'])).toBe('/admin/settings')
        expect(adminLandingPath(['entitlement.manage'])).toBe('/admin/users')
    })

    it('no permissions means no navigation', () => {
        expect(visibleAdminNavGroups([])).toEqual([])
        expect(visibleAdminHrefs([])).toEqual([])
    })
})

describe('adminLandingPath — setiap peran mendarat di pekerjaannya', () => {
    it('pemegang admin.access mendarat di Dashboard', () => {
        expect(adminLandingPath(ROLE_PERMISSIONS.SUPER_ADMIN)).toBe('/admin')
        expect(adminLandingPath(ROLE_PERMISSIONS.ADMIN)).toBe('/admin')
        expect(adminLandingPath(ROLE_PERMISSIONS.FINANCE)).toBe('/admin')
        expect(adminLandingPath(ROLE_PERMISSIONS.SUPPORT)).toBe('/admin')
    })

    it('editor dan reviewer mendarat di Review, bukan tempat lain', () => {
        expect(adminLandingPath(ROLE_PERMISSIONS.CONTENT_EDITOR)).toBe('/admin/content/review')
        expect(adminLandingPath(ROLE_PERMISSIONS.CONTENT_REVIEWER)).toBe('/admin/content/review')
    })

    it('SCHOOL_ADMIN mendarat di Instansi, bukan dead-end', () => {
        // Ini inti perbaikannya: dulu peran ini tidak punya tujuan sama sekali.
        // Setelah halaman instansi ada, pekerjaan utamanya yang didahulukan
        // atas laporan.
        expect(adminLandingPath(ROLE_PERMISSIONS.SCHOOL_ADMIN)).toBe('/admin/organizations')
    })

    it('peran tanpa permukaan admin mengembalikan null secara eksplisit', () => {
        // `null` memaksa pemanggil memutuskan; bukan diam-diam dilempar ke halaman
        // orang lain seperti perilaku sebelumnya.
        expect(adminLandingPath([])).toBeNull()
        expect(hasAdminSurface([])).toBe(false)

        // `notification.manage` dan `role.manage` belum punya halaman, jadi
        // pemegangnya memang tidak punya permukaan. `role.manage` tetap berguna
        // lewat /admin/users, tetapi halaman itu digerbangi user.read/user.manage.
        expect(adminLandingPath(['notification.manage'])).toBeNull()
        expect(adminLandingPath(['role.manage'])).toBeNull()
        expect(hasAdminSurface(['notification.manage'])).toBe(false)
    })

    it('organization.manage kini punya permukaan sendiri', () => {
        // Sebelum halaman instansi ada, pemegang tunggal permission ini tidak
        // punya tujuan sama sekali. Sekarang ia mendarat di Instansi.
        expect(adminLandingPath(['organization.manage'])).toBe('/admin/organizations')
        expect(hasAdminSurface(['organization.manage'])).toBe(true)
    })

    it('setiap peran yang punya permukaan mendarat di halaman yang benar-benar ada di menunya', () => {
        // Tidak boleh ada dead-end: tujuan pendaratan harus salah satu href yang
        // memang dirender untuk peran itu.
        for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
            const landing = adminLandingPath(permissions)
            expect(landing, `${role} tidak punya tujuan pendaratan`).not.toBeNull()
            expect(visibleAdminHrefs(permissions), `${role} mendarat di luar menunya`).toContain(landing)
        }
    })

    it('setiap peran yang punya permukaan melihat minimal satu menu', () => {
        for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
            expect(hasAdminSurface(permissions), `${role} tidak punya permukaan`).toBe(true)
        }
    })
})

describe('adminRoleLabel — label yang bisa dibaca manusia', () => {
    it('menerjemahkan kode peran', () => {
        expect(adminRoleLabel(['ADMIN'])).toBe('Admin')
        expect(adminRoleLabel(['SUPER_ADMIN'])).toBe('Super Admin')
        expect(adminRoleLabel(['CONTENT_REVIEWER'])).toBe('Reviewer Konten')
        expect(adminRoleLabel(['FINANCE'])).toBe('Keuangan')
        expect(adminRoleLabel(['SCHOOL_ADMIN'])).toBe('Admin Sekolah')
    })

    it('meringkas peran ganda alih-alih memotongnya tanpa penjelasan', () => {
        expect(adminRoleLabel(['ADMIN', 'FINANCE'])).toBe('Admin +1')
        expect(adminRoleLabel(['ADMIN', 'FINANCE', 'SUPPORT'])).toBe('Admin +2')
    })

    it('peran tak dikenal ditampilkan apa adanya, bukan disembunyikan', () => {
        expect(adminRoleLabel(['ROLE_BARU'])).toBe('ROLE_BARU')
    })

    it('tanpa peran tetap punya label', () => {
        expect(adminRoleLabel([])).toBe('Tanpa peran')
    })
})

describe('resolveAdminContext / effectiveAdminContext — header dan halaman tidak boleh beda', () => {
    it('menerima kombinasi yang sah', () => {
        expect(resolveAdminContext('CPNS', 'SKD')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(resolveAdminContext('TKA', 'SMP')).toEqual({ program: 'TKA', track: 'SMP' })
        expect(resolveAdminContext('cpns', 'skd')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(resolveAdminContext(' tka ', ' sd ')).toEqual({ program: 'TKA', track: 'SD' })
    })

    it('menolak kombinasi silang yang tidak sah', () => {
        // Dulu `CONTEXTS.find(...) || CONTEXTS[0]` menampilkan TKA/SKD sebagai
        // CPNS/SKD di header, sementara halamannya memakai TKA/SKD dari URL.
        expect(resolveAdminContext('TKA', 'SKD')).toBeNull()
        expect(resolveAdminContext('CPNS', 'SMP')).toBeNull()
        expect(resolveAdminContext('CPNS', 'SD')).toBeNull()
        expect(resolveAdminContext('', '')).toBeNull()
        expect(resolveAdminContext(null, null)).toBeNull()
        expect(resolveAdminContext('CPNS', null)).toBeNull()
    })

    it('jatuh ke default hanya lewat effectiveAdminContext', () => {
        expect(effectiveAdminContext('TKA', 'SKD')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(effectiveAdminContext(undefined, undefined)).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(effectiveAdminContext('TKA', 'SMA')).toEqual({ program: 'TKA', track: 'SMA' })
    })

    it('mengubah program memilih track valid milik program itu', () => {
        expect(tracksForProgram('TKA')).toEqual(['SD', 'SMP', 'SMA'])
        expect(tracksForProgram('CPNS')).toEqual(['SKD'])
        expect(tracksForProgram('tka')).toEqual(['SD', 'SMP', 'SMA'])
        expect(tracksForProgram('TIDAK_ADA')).toEqual([])
    })
})

describe('defaultContextForPath — default per modul di satu tempat', () => {
    it('Review tetap berjalan di konteks TKA/SMP seperti sebelumnya', () => {
        expect(defaultContextForPath('/admin/content/review')).toEqual({ program: 'TKA', track: 'SMP' })
    })

    it('modul lain default CPNS/SKD', () => {
        expect(defaultContextForPath('/admin')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(defaultContextForPath('/admin/content/questions')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(defaultContextForPath('/admin/commerce/orders')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(defaultContextForPath('/admin/users')).toEqual({ program: 'CPNS', track: 'SKD' })
    })
})

describe('adminPathUsesProgramContext — selector hanya di workspace terkait', () => {
    it('menampilkan konteks pada Dashboard dan workspace berprogram', () => {
        for (const path of [
            '/admin',
            '/admin/assessments',
            '/admin/assessments/assessment-1/questions',
            '/admin/content/questions',
            '/admin/content/review/question-1',
            '/admin/events/event-1',
            '/admin/commerce/products',
        ]) expect(adminPathUsesProgramContext(path), path).toBe(true)
    })

    it('menyembunyikan konteks pada workspace global dan monitoring kontekstual', () => {
        for (const path of [
            '/admin/content/articles',
            '/admin/events/event-1/monitoring',
            '/admin/organizations',
            '/admin/organizations/org-1/batches/batch-1/monitoring',
            '/admin/monitoring',
            '/admin/commerce/orders',
            '/admin/users',
            '/admin/settings',
        ]) expect(adminPathUsesProgramContext(path), path).toBe(false)
    })
})

describe('adminBreadcrumbs — konteks lokasi tidak menampilkan ID route', () => {
    it('menunjukkan jalur assessment dan event', () => {
        expect(adminBreadcrumbs('/admin/assessments')).toEqual([
            { label: 'Learning' }, { label: 'Assessment' },
        ])
        expect(adminBreadcrumbs('/admin/events')).toEqual([
            { label: 'Operations' }, { label: 'Event' },
        ])
    })

    it('monitoring, hasil dan readiness memakai lokasi bisnis yang tepat', () => {
        expect(adminBreadcrumbs('/admin/monitoring').at(-1)?.label).toBe('Monitoring')
        expect(adminBreadcrumbs('/admin/monitoring/results/opaque-id').map(c=>c.label)).toEqual(['Operations','Monitoring','Hasil'])
        expect(adminBreadcrumbs('/admin/content/readiness').at(-1)?.label).toBe('Content Readiness')
    })

    it('menjaga route organisasi dan detail internal tetap memakai label bisnis', () => {
        expect(adminBreadcrumbs('/admin/organizations/opaque-id')).toEqual([
            { label: 'Operations' }, { label: 'Instansi' },
        ])
    })
})

describe('adminNavHref — konteks hanya ditempel pada modul contextual', () => {
    it('modul global tidak dibawa program/track', () => {
        // Articles, Users, dan Audit bersifat lintas program; menempelkan konteks
        // hanya akan menyesatkan karena halamannya tidak membacanya.
        const href = adminNavHref(
            { href: '/admin/users', label: 'Users', icon: 'Users', requiresAny: [], contextual: false },
            { program: 'TKA', track: 'SMP' },
        )
        expect(href).toBe('/admin/users')
    })

    it('modul contextual membawa konteks aktif', () => {
        const href = adminNavHref(
            { href: '/admin/content/questions', label: 'Question Bank', icon: 'FileQuestion', requiresAny: [], contextual: true },
            { program: 'TKA', track: 'SMA' },
        )
        expect(href).toBe('/admin/content/questions?program=TKA&track=SMA')
    })
})

describe('adminNavIsActive — tidak ada dua menu yang aktif bersamaan', () => {
    it('/admin hanya aktif tepat di /admin', () => {
        expect(adminNavIsActive('/admin', '/admin')).toBe(true)
        expect(adminNavIsActive('/admin/content/questions', '/admin')).toBe(false)
    })

    it('/admin/commerce tidak ikut aktif di halaman products', () => {
        expect(adminNavIsActive('/admin/commerce/orders', '/admin/commerce/orders')).toBe(true)
        expect(adminNavIsActive('/admin/commerce/products', '/admin/commerce/orders')).toBe(false)
        expect(adminNavIsActive('/admin/commerce/products', '/admin/commerce/products')).toBe(true)
    })

    it('sub-halaman tetap menyalakan menu induknya', () => {
        expect(adminNavIsActive('/admin/content/articles/new', '/admin/content/articles')).toBe(true)
        expect(adminNavIsActive('/admin/content/articles/abc/edit', '/admin/content/articles')).toBe(true)
        expect(adminNavIsActive('/admin/users', '/admin/content/articles')).toBe(false)
    })
})


describe('workspace active state includes contextual legacy routes', () => {
    it('reports and results activate Monitoring', () => {
        expect(adminNavIsActive('/admin/monitoring/reports', '/admin/monitoring')).toBe(true)
        expect(adminNavIsActive('/admin/monitoring/results/attempt-id', '/admin/monitoring')).toBe(true)
    })
    it('audit activates Settings and entitlements activate Users', () => {
        expect(adminNavIsActive('/admin/settings/audit', '/admin/settings')).toBe(true)
        expect(adminNavIsActive('/admin/users/access', '/admin/users')).toBe(true)
    })
    it('product routes activate Commerce without activating Orders', () => {
        const commerce = visibleAdminNavGroups(ROLE_PERMISSIONS.ADMIN).flatMap(group => group.items).find(item => item.label === 'Commerce')!
        expect(adminWorkspaceIsActive('/admin/commerce/products', commerce)).toBe(true)
        expect(adminNavIsActive('/admin/commerce/products', '/admin/commerce/orders')).toBe(false)
        expect(adminNavIsActive('/admin/commerce/orders/order-id', '/admin/commerce/orders')).toBe(true)
    })
    it('legacy detail breadcrumbs return to their workspace', () => {
        expect(adminBreadcrumbs('/admin/monitoring/reports').map(crumb => crumb.label)).toEqual(['Operations', 'Monitoring', 'Reports'])
        expect(adminBreadcrumbs('/admin/settings/audit').map(crumb => crumb.label)).toEqual(['System', 'Settings', 'Audit Log'])
        expect(adminBreadcrumbs('/admin/users/access').map(crumb => crumb.label)).toEqual(['Business', 'Users', 'Entitlements'])
    })
})
