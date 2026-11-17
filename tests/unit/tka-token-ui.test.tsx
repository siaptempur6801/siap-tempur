import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import TkaStartDrillButton from '@/components/tka/TkaStartDrillButton'
import TkaTokenAccessSummary from '@/components/tka/TkaTokenAccessSummary'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/app/actions/tka-practice', () => ({
  startTkaExam: vi.fn(),
  startTkaDrill: vi.fn(),
}))

const exam = { level: 'SMP' as const, examSlug: 'tka-smp-full', examTitle: 'Tryout SMP' }

describe('TKA token controls', () => {
  it('keeps resume available with zero tokens, even when new starts are unavailable', () => {
    const html = renderToStaticMarkup(
      <TkaStartExamButton
        {...exam}
        tokenBalance={0}
        activeAttemptId="running-attempt"
        disabledReason="Sudah berakhir"
      />,
    )
    expect(html).toContain('Lanjutkan Tryout')
    expect(html).toContain('Lanjutkan tanpa token tambahan.')
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('href="/tka/smp/beli-token"')
  })

  it('compares the actual session cost to the balance before offering a new start', () => {
    const insufficient = renderToStaticMarkup(
      <TkaStartExamButton {...exam} tokenBalance={1} tokenCost={2} />,
    )
    const sufficient = renderToStaticMarkup(
      <TkaStartExamButton {...exam} tokenBalance={2} tokenCost={2} />,
    )
    expect(insufficient).toContain('href="/tka/smp/beli-token"')
    expect(insufficient).toContain('Butuh 2 token untuk sesi ini. Saldo kamu 1 token.')
    expect(sufficient).toContain('Mulai Tryout · 2 token')
    expect(sufficient).not.toContain('href="/tka/smp/beli-token"')
  })

  it('does not offer a purchase as the solution to an unavailable assessment', () => {
    const html = renderToStaticMarkup(
      <TkaStartExamButton {...exam} tokenBalance={0} disabledReason="Belum dimulai" />,
    )
    expect(html).toContain('disabled=""')
    expect(html).toContain('Belum dimulai')
    expect(html).not.toContain('href="/tka/smp/beli-token"')
  })

  it('offers token purchase for a new drill when the balance is empty', () => {
    const html = renderToStaticMarkup(
      <TkaStartDrillButton
        level="SMP"
        subjectCode="MAT"
        knowledgeNodeName="Aljabar"
        tokenBalance={0}
      />,
    )
    expect(html).toContain('href="/tka/smp/beli-token"')
    expect(html).toContain('Butuh 1 token untuk sesi baru.')
  })

  it('does not promise a fixed cost for a catalog with different session prices', () => {
    const html = renderToStaticMarkup(
      <TkaTokenAccessSummary tokenBalance={5} href="/tka/smp/beli-token" />,
    )
    expect(html).toContain('Kebutuhan token tertera di setiap pilihan.')
    expect(html).not.toContain('1 token untuk satu sesi baru')
  })
})

describe('saldo token negatif setelah refund (A-10)', () => {
  it('menjelaskan saldo minus kepada peserta', () => {
    const html = renderToStaticMarkup(
      <TkaTokenAccessSummary tokenBalance={-3} href="/tka/smp/beli-token" />,
    )
    expect(html).toContain('-3')
    expect(html).toContain('Saldo minus karena dana pembelian dikembalikan')
  })

  it('tidak menampilkan catatan untuk saldo nol atau positif', () => {
    for (const balance of [0, 4]) {
      const html = renderToStaticMarkup(
        <TkaTokenAccessSummary tokenBalance={balance} href="/tka/smp/beli-token" />,
      )
      expect(html).not.toContain('Saldo minus')
    }
  })
})
