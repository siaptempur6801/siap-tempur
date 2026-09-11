import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { NavItem, MobileNavItem } from '@/components/dashboard/NavItem'
import TkaDashboardShell from '@/components/tka/TkaDashboardShell'
import TkaLevelSwitcher from '@/components/tka/TkaLevelSwitcher'
import { isTkaLevelAvailable } from '@/src/tka/context'

const navigation = vi.hoisted(() => ({ pathname: '/tka/smp' }))

vi.mock('next/navigation', () => ({
    usePathname: () => navigation.pathname,
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('TKA navigation selection', () => {
    it('uses the shared level availability configuration', () => {
        expect(isTkaLevelAvailable('SMP')).toBe(true)
        expect(isTkaLevelAvailable('SD')).toBe(false)
        expect(isTkaLevelAvailable('SMA')).toBe(false)
    })

    for (const Component of [NavItem, MobileNavItem]) {
        it(`${Component.name} gives Tryout its own route`, () => {
            navigation.pathname = '/tka/smp'
            const dashboard = renderToStaticMarkup(<Component href="/tka/smp" label="Ringkasan" icon={null} exact />)
            const tryout = renderToStaticMarkup(<Component href="/tka/smp/tryout" label="Tryout" icon={null} />)
            const pass = renderToStaticMarkup(<Component href="/tka/smp/pass" label="Tempur Pass" icon={null} />)
            expect(dashboard).toContain('aria-current="page"')
            expect(tryout).not.toContain('aria-current')
            expect(pass).not.toContain('aria-current')

            navigation.pathname = '/tka/smp/tryout'
            const activeTryout = renderToStaticMarkup(<Component href="/tka/smp/tryout" label="Tryout" icon={null} />)
            expect(activeTryout).toContain('aria-current="page"')
        })
    }

    it('routes Tryout and Latihan Fokus to their dedicated pages', () => {
        navigation.pathname = '/tka/smp'
        const markup = renderToStaticMarkup(
            <TkaDashboardShell
                level="SMP"
                user={{ id: 'user-1', email: 'user@example.com' }}
                profile={null}
                tokenBalance={10}
                signoutAction={async () => ({ success: true })}
            >
                <div>Dashboard</div>
            </TkaDashboardShell>,
        )

        expect(markup).toContain('href="/tka/smp/tryout"')
        expect(markup).toContain('href="/tka/smp/mini-tryout"')
        expect(markup).toContain('href="/tka/smp/focus"')
        expect(markup).toContain('href="/tka/smp/riwayat"')
        expect(markup).not.toContain('#tka-tryout')
        expect(markup).not.toContain('>Beranda</span>')
        expect(markup.match(/>Ringkasan<\/span>/g)).toHaveLength(2)
        expect(markup).not.toContain('Dashboard TKA')
        expect(markup).toContain('TKA SMP')
    })

    it('keeps the learner sidebar in study-flow order', () => {
        navigation.pathname = '/tka/smp'
        const markup = renderToStaticMarkup(
            <TkaDashboardShell
                level="SMP"
                user={{ id: 'user-1', email: 'user@example.com' }}
                profile={null}
                tokenBalance={10}
                signoutAction={async () => ({ success: true })}
            >
                <div>Dashboard</div>
            </TkaDashboardShell>,
        )

        const order = [
            'Ringkasan',
            'Tes Diagnostik',
            'Latihan Fokus',
            'Mini Tryout',
            'Tryout',
            'Riwayat',
            'Bank Soal Salah',
            'Perkembangan',
        ].map((label) => markup.indexOf(`>${label}</span>`))

        expect(order.every((index) => index >= 0)).toBe(true)
        expect(order).toEqual([...order].sort((left, right) => left - right))
    })

    it('marks Latihan Fokus active on its dedicated route', () => {
        navigation.pathname = '/tka/smp/focus'
        const focus = renderToStaticMarkup(<NavItem href="/tka/smp/focus" label="Latihan Fokus" icon={null} />)

        expect(focus).toContain('aria-current="page"')
    })

    it('keeps the mobile Tryout shortcut active for Mini Tryout', () => {
        navigation.pathname = '/tka/smp/mini-tryout'
        const markup = renderToStaticMarkup(
            <TkaDashboardShell
                level="SMP"
                user={{ id: 'user-1', email: 'user@example.com' }}
                profile={null}
                tokenBalance={10}
                signoutAction={async () => ({ success: true })}
            >
                <div>Mini Tryout</div>
            </TkaDashboardShell>,
        )

        const mobileNav = markup.slice(markup.lastIndexOf('aria-label="Navigasi utama TKA"'))
        const mobileTryoutHref = mobileNav.indexOf('href="/tka/smp/tryout"')
        const mobileTryoutLink = mobileNav.slice(mobileNav.lastIndexOf('<a', mobileTryoutHref), mobileTryoutHref + 320)
        expect(mobileTryoutLink).toContain('aria-current="page"')
        expect(mobileNav).toContain('href="/tka/smp/riwayat"')
    })

    it('allows switching between all TKA levels with proper links and active state', () => {
        const markup = renderToStaticMarkup(<TkaLevelSwitcher activeLevel="SMP" />)

        expect(markup).toContain('href="/tka/smp"')
        expect(markup).toContain('href="/tka/sd"')
        expect(markup).toContain('href="/tka/sma"')
        expect(markup).toContain('aria-current="page"')
    })
})
