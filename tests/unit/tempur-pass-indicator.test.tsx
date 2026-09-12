import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TempurPassIndicator from '@/components/dashboard/TempurPassIndicator'

describe('Tempur Pass indicator', () => {
    it('shows an active Pass label and links to the TKA Pass page', () => {
        const markup = renderToStaticMarkup(<TempurPassIndicator />)

        expect(markup).toContain('href="/tka/smp/pass"')
        expect(markup).toContain('Tempur Pass aktif')
        expect(markup).toContain('aria-label="Tempur Pass aktif"')
    })

    it('supports compact rendering for headers and admin layouts', () => {
        const markup = renderToStaticMarkup(<TempurPassIndicator compact theme="paper" />)

        expect(markup).toContain('Pass aktif')
        expect(markup).toContain('bg-green-100')
        expect(markup).not.toContain('Tempur Pass aktif</span>')
    })
})
