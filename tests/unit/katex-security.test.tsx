import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { InlineMath, BlockMath } from 'react-katex'
import katex from 'katex'

afterEach(() => {
  Reflect.deleteProperty(Object.prototype, 'trust')
})

describe('patched KaTeX through react-katex', () => {
  it('renders inline and display math using the installed renderer', () => {
    expect(
      renderToStaticMarkup(<InlineMath math={String.raw`\frac{1}{2} + \sqrt{x}`} />),
    ).toContain('katex-mathml')
    expect(renderToStaticMarkup(<BlockMath math={String.raw`\sum_{i=1}^{n} i`} />)).toContain(
      'katex-display',
    )
  })

  it('preserves error rendering for incomplete editor input', () => {
    const html = renderToStaticMarkup(<InlineMath math={String.raw`\frac{`} errorColor="#dc2626" />)
    expect(html).toContain('katex-error')
    expect(html).toContain('#dc2626')
  })

  it('does not inherit trust from a polluted prototype', () => {
    Object.defineProperty(Object.prototype, 'trust', {
      value: true,
      writable: true,
      configurable: true,
    })
    const formula = String.raw`\href{javascript:alert(1)}{click}`
    const options = { throwOnError: false }
    expect(katex.renderToString(formula, options)).not.toContain('href="javascript:')
    expect(renderToStaticMarkup(<InlineMath math={formula} />)).not.toContain('href="javascript:')
  })

  it('keeps untrusted external image commands disabled', () => {
    const html = renderToStaticMarkup(
      <BlockMath math={String.raw`\includegraphics{https://example.invalid/image.png}`} />,
    )
    expect(html).not.toContain('<img')
  })
})
