import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TempurPassIndicator from '@/components/dashboard/TempurPassIndicator'

describe('Tempur Pass indicator', () => {
    it('mengarah ke halaman pass yang diberikan (TKA per jenjang)', () => {
        const markup = renderToStaticMarkup(<TempurPassIndicator href="/tka/sd/pass" />)

        expect(markup).toContain('href="/tka/sd/pass"')
        expect(markup).toContain('Tempur Pass aktif')
        expect(markup).toContain('aria-label="Tempur Pass aktif"')
    })

    it('memakai label cakupan sendiri untuk area CPNS', () => {
        const markup = renderToStaticMarkup(
            <TempurPassIndicator href="/cpns/dashboard/pass" label="Tempur Pass CPNS aktif" />,
        )

        expect(markup).toContain('href="/cpns/dashboard/pass"')
        expect(markup).toContain('aria-label="Tempur Pass CPNS aktif"')
        expect(markup).not.toContain('/tka/')
    })

    it('supports compact rendering for headers and admin layouts', () => {
        const markup = renderToStaticMarkup(<TempurPassIndicator href="/cpns/dashboard/pass" compact theme="paper" />)

        expect(markup).toContain('Pass aktif')
        expect(markup).toContain('bg-green-100')
        expect(markup).not.toContain('Tempur Pass aktif</span>')
    })
})
