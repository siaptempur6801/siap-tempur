import { describe, expect, it } from 'vitest'
import { getClientIp } from '../../lib/request-ip'

function headersOf(record: Record<string, string>) {
    return new Headers(record)
}

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
