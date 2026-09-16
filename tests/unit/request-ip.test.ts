import { describe, expect, it } from 'vitest'
import { resolveClientIp, getClientIp } from '../../lib/request-ip'

function headersOf(record: Record<string, string>) {
    return new Headers(record)
}

describe('resolveClientIp — sumber header', () => {
    it('melaporkan header platform sebagai sumber saat tersedia', () => {
        expect(resolveClientIp(headersOf({
            'x-vercel-forwarded-for': '203.0.113.10',
            'x-real-ip': '198.51.100.7',
        }))).toEqual({ ip: '203.0.113.10', source: 'x-vercel-forwarded-for' })
    })

    it('header palsu kiriman client TIDAK boleh menang atas header platform', () => {
        const resolved = resolveClientIp(headersOf({
            'x-real-ip': '10.0.0.1',
            'x-forwarded-for': '10.0.0.2',
            'x-vercel-forwarded-for': '203.0.113.10',
        }))
        expect(resolved.ip).toBe('203.0.113.10')
        expect(resolved.source).toBe('x-vercel-forwarded-for')
    })

    it('jatuh ke x-real-ip lalu x-forwarded-for lalu fallback', () => {
        expect(resolveClientIp(headersOf({ 'x-real-ip': '198.51.100.7' })))
            .toEqual({ ip: '198.51.100.7', source: 'x-real-ip' })
        expect(resolveClientIp(headersOf({ 'x-forwarded-for': '192.0.2.1, 10.0.0.1' })))
            .toEqual({ ip: '192.0.2.1', source: 'x-forwarded-for' })
        expect(resolveClientIp(headersOf({})))
            .toEqual({ ip: '0.0.0.0', source: 'fallback' })
    })
})

describe('getClientIp', () => {
    it('mendahulukan header yang di-set platform (x-vercel-forwarded-for)', () => {
        expect(getClientIp(headersOf({
            'x-vercel-forwarded-for': '203.0.113.10',
            'x-real-ip': '198.51.100.7',
            'x-forwarded-for': '192.0.2.1',
        }))).toBe('203.0.113.10')
    })

    it('memakai x-real-ip bila header platform tidak ada', () => {
        expect(getClientIp(headersOf({
            'x-real-ip': '198.51.100.7',
            'x-forwarded-for': '192.0.2.1',
        }))).toBe('198.51.100.7')
    })

    it('memakai entri pertama x-forwarded-for sebagai fallback terakhir', () => {
        expect(getClientIp(headersOf({
            'x-forwarded-for': '192.0.2.1, 10.0.0.1, 10.0.0.2',
        }))).toBe('192.0.2.1')
        expect(getClientIp(headersOf({ 'x-forwarded-for': '  192.0.2.9  ' }))).toBe('192.0.2.9')
    })

    it('melewati header kosong', () => {
        expect(getClientIp(headersOf({
            'x-vercel-forwarded-for': '   ',
            'x-real-ip': '198.51.100.7',
        }))).toBe('198.51.100.7')
    })

    it('memberi nilai cadangan saat tidak ada header IP sama sekali', () => {
        expect(getClientIp(headersOf({}))).toBe('0.0.0.0')
    })
})
