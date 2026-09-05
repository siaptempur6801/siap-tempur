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
        expect(markup).not.toContain('#tka-tryout')
        expect(markup).not.toContain('>Beranda</span>')
        expect(markup.match(/>Ringkasan<\/span>/g)).toHaveLength(2)
        expect(markup).not.toContain('Dashboard TKA')
        expect(markup).toContain('TKA SMP')
    })

    it('marks Latihan Fokus active on its dedicated route', () => {
        navigation.pathname = '/tka/smp/focus'
        const focus = renderToStaticMarkup(<NavItem href="/tka/smp/focus" label="Latihan Fokus" icon={null} />)

        expect(focus).toContain('aria-current="page"')
    })

    it('does not link levels that are not available yet', () => {
        const markup = renderToStaticMarkup(<TkaLevelSwitcher activeLevel="SMP" />)

        expect(markup).toContain('href="/tka/smp"')
        expect(markup).not.toContain('href="/tka/sd"')
        expect(markup).not.toContain('href="/tka/sma"')
        expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2)
    })
})
