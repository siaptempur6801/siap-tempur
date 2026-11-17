import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useProfileNavigation } from '@/components/profile/useProfileNavigation'

const navigation = vi.hoisted(() => ({ pathname: '/cpns/dashboard/profile' }))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))

function Probe() {
    const paths = useProfileNavigation()
    return <div data-profile={paths.profilePath} data-purchase={paths.purchasePath} data-landing={paths.landingPath} />
}

describe('shared account navigation', () => {
    it.each(['sd', 'smp', 'sma'])('keeps %s account actions in the selected TKA level', (level) => {
        navigation.pathname = `/tka/${level}/profile`
        const markup = renderToStaticMarkup(<Probe />)
        expect(markup).toContain(`data-profile="/tka/${level}/profile"`)
        expect(markup).toContain(`data-purchase="/tka/${level}/beli-token"`)
        expect(markup).toContain('data-landing="/tka"')
        expect(markup).not.toContain('/cpns')
    })

    it('preserves CPNS account destinations', () => {
        navigation.pathname = '/cpns/dashboard/profile'
        const markup = renderToStaticMarkup(<Probe />)
        expect(markup).toContain('data-profile="/cpns/dashboard/profile"')
        expect(markup).toContain('data-purchase="/cpns/dashboard/beli-paket"')
        expect(markup).toContain('data-landing="/cpns"')
    })
})
