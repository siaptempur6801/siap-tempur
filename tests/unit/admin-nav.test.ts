import { describe, expect, it } from 'vitest'
import {
    ADMIN_NAV_HREFS,
    adminLandingPath,
    adminNavHref,
    adminNavIsActive,
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

describe('visibleAdminNavGroups — menu mengikuti permission, bukan satu boolean', () => {
    it('SUPER_ADMIN melihat seluruh menu', () => {
        expect(visibleAdminHrefs(ROLE_PERMISSIONS.SUPER_ADMIN).sort()).toEqual([...ADMIN_NAV_HREFS].sort())
    })

    it('ADMIN melihat seluruh menu', () => {
        expect(visibleAdminHrefs(ROLE_PERMISSIONS.ADMIN).sort()).toEqual([...ADMIN_NAV_HREFS].sort())
    })

    it('FINANCE TIDAK melihat Content, Assessment, Products, Users, maupun Audit', () => {
        // Regresi utama: FINANCE punya `admin.access`, jadi dulu ia melihat
        // SELURUH menu. Yang benar hanya yang permission-nya ia miliki:
        // order.read + payment.manage (Orders), entitlement.manage
        // (Entitlements), dan report.read (Reports).
        expect(labels(ROLE_PERMISSIONS.FINANCE)).toEqual(['Dashboard', 'Orders & Payments', 'Entitlements', 'Reports'])
        for (const forbidden of ['Question Bank', 'Review Queue', 'Articles', 'Exams', 'Events', 'Products', 'Users & Roles', 'Audit Log', 'Settings']) {
            expect(labels(ROLE_PERMISSIONS.FINANCE)).not.toContain(forbidden)
        }
    })

    it('SUPPORT hanya melihat Dashboard, Orders & Payments, dan Users & Roles', () => {
        expect(labels(ROLE_PERMISSIONS.SUPPORT)).toEqual(['Dashboard', 'Orders & Payments', 'Users & Roles'])
    })

    it('Entitlements dan Settings hanya muncul untuk pemegang permission-nya', () => {
        // `entitlement.manage` → FINANCE + ADMIN; `settings.manage` → ADMIN saja.
        expect(labels(ROLE_PERMISSIONS.FINANCE)).toContain('Entitlements')
        expect(labels(ROLE_PERMISSIONS.FINANCE)).not.toContain('Settings')
        expect(labels(ROLE_PERMISSIONS.SUPPORT)).not.toContain('Entitlements')
        expect(labels(ROLE_PERMISSIONS.SUPPORT)).not.toContain('Settings')
        expect(labels(ROLE_PERMISSIONS.SCHOOL_ADMIN)).not.toContain('Entitlements')
        expect(labels(ROLE_PERMISSIONS.SCHOOL_ADMIN)).not.toContain('Settings')
        expect(labels(ROLE_PERMISSIONS.ADMIN)).toContain('Entitlements')
        expect(labels(ROLE_PERMISSIONS.ADMIN)).toContain('Settings')
    })

    it('CONTENT_EDITOR TIDAK melihat Question Bank (butuh question.manage)', () => {
        // Editor menulis soal lewat Review Queue; Question Bank memang bukan
        // miliknya. Yang penting: ia tidak melihat menu yang tak bisa dipakai.
        expect(labels(ROLE_PERMISSIONS.CONTENT_EDITOR)).toEqual(['Review Queue', 'Articles'])
    })

    it('CONTENT_REVIEWER hanya melihat Review Queue dan Articles', () => {
        expect(labels(ROLE_PERMISSIONS.CONTENT_REVIEWER)).toEqual(['Review Queue', 'Articles'])
    })

    it('SCHOOL_ADMIN melihat Instansi & Batch dan Reports', () => {
        // Dulu peran ini tidak mendapat apa pun dan dilempar tanpa penjelasan.
        // Kini ia punya dua permukaan: pekerjaan utamanya (instansi & batch)
        // dan laporan.
        expect(labels(ROLE_PERMISSIONS.SCHOOL_ADMIN)).toEqual(['Instansi & Batch', 'Reports'])
    })

    it('grup tanpa item yang lolos tidak dirender sama sekali', () => {
        const groups = visibleAdminNavGroups(ROLE_PERMISSIONS.SCHOOL_ADMIN)
        expect(groups.map((group) => group.label)).toEqual(['Instansi', 'Insights'])
        expect(groups.every((group) => group.items.length > 0)).toBe(true)
    })

    it('peran tanpa permission tidak melihat menu apa pun', () => {
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

    it('editor dan reviewer mendarat di Review Queue, bukan tempat lain', () => {
        expect(adminLandingPath(ROLE_PERMISSIONS.CONTENT_EDITOR)).toBe('/admin/content/review')
        expect(adminLandingPath(ROLE_PERMISSIONS.CONTENT_REVIEWER)).toBe('/admin/content/review')
    })

    it('SCHOOL_ADMIN mendarat di Instansi & Batch, bukan dead-end', () => {
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
        // punya tujuan sama sekali. Sekarang ia mendarat di Instansi & Batch.
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
    it('Review Queue tetap berjalan di konteks TKA/SMP seperti sebelumnya', () => {
        expect(defaultContextForPath('/admin/content/review')).toEqual({ program: 'TKA', track: 'SMP' })
    })

    it('modul lain default CPNS/SKD', () => {
        expect(defaultContextForPath('/admin')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(defaultContextForPath('/admin/content/questions')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(defaultContextForPath('/admin/commerce')).toEqual({ program: 'CPNS', track: 'SKD' })
        expect(defaultContextForPath('/admin/users')).toEqual({ program: 'CPNS', track: 'SKD' })
    })
})

describe('adminNavHref — konteks hanya ditempel pada modul contextual', () => {
    it('modul global tidak dibawa program/track', () => {
        // Articles, Users, dan Audit bersifat lintas program; menempelkan konteks
        // hanya akan menyesatkan karena halamannya tidak membacanya.
        const href = adminNavHref(
            { href: '/admin/users', label: 'Users & Roles', icon: 'Users', requiresAny: [], contextual: false },
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
        expect(adminNavIsActive('/admin/commerce', '/admin/commerce')).toBe(true)
        expect(adminNavIsActive('/admin/commerce/products', '/admin/commerce')).toBe(false)
        expect(adminNavIsActive('/admin/commerce/products', '/admin/commerce/products')).toBe(true)
    })

    it('sub-halaman tetap menyalakan menu induknya', () => {
        expect(adminNavIsActive('/admin/content/articles/create', '/admin/content/articles')).toBe(true)
        expect(adminNavIsActive('/admin/content/articles/abc/edit', '/admin/content/articles')).toBe(true)
        expect(adminNavIsActive('/admin/users', '/admin/content/articles')).toBe(false)
    })
})
