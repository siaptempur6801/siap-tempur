import { describe, expect, it } from 'vitest'

import { serializeJsonLd } from '@/components/StructuredData'

describe('serializeJsonLd', () => {
  it('meng-escape < agar string tidak bisa menutup elemen script', () => {
    const output = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(output).not.toContain('<')
    expect(output).toContain('\\u003c/script>')
  })

  it('menghasilkan JSON yang setara setelah di-parse', () => {
    const data = { '@type': 'FAQPage', text: 'a < b & c > d', list: [1, '<x>'] }
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })
})
