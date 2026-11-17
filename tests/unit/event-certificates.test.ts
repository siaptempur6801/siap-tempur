import { describe, expect, it } from 'vitest'
import {
  buildCertificateNumber,
  getCertificateAchievementLabel,
  getCertificateKindForRank,
  normalizeCertificateName,
  rankCertificateCandidates,
  shouldShowCertificateScore,
} from '@/lib/event-certificates'
import { createEventCertificatePdf } from '@/lib/event-certificate-pdf'

describe('event certificates', () => {
  it('normalizes a valid certificate name and collapses whitespace', () => {
    expect(normalizeCertificateName('  Budi   Santoso  Wijaya  ')).toEqual({
      success: true,
      name: 'Budi Santoso Wijaya',
    })
  })

  it('rejects certificate names that are too short or contain symbols', () => {
    expect(normalizeCertificateName('A')).toEqual({
      success: false,
      message: 'Nama lengkap minimal 3 karakter.',
    })
    expect(normalizeCertificateName('Budi <script>')).toEqual({
      success: false,
      message: 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung.',
    })
  })

  it('maps ranks 1-3 to winner certificates and everyone else to participant', () => {
    expect(getCertificateKindForRank(1)).toBe('winner_1')
    expect(getCertificateKindForRank(2)).toBe('winner_2')
    expect(getCertificateKindForRank(3)).toBe('winner_3')
    expect(getCertificateKindForRank(4)).toBe('participant')
    expect(getCertificateKindForRank(null)).toBe('participant')
  })

  it('ranks certificate candidates by score, completion time, and user id', () => {
    const ranked = rankCertificateCandidates([
      { user_id: 'user-c', total_score: 410, completed_at: '2026-07-13T03:00:00.000Z' },
      { user_id: 'user-b', total_score: 420, completed_at: '2026-07-13T03:05:00.000Z' },
      { user_id: 'user-a', total_score: 420, completed_at: '2026-07-13T03:00:00.000Z' },
    ])

    expect(ranked.map((entry) => [entry.user_id, entry.rank])).toEqual([
      ['user-a', 1],
      ['user-b', 2],
      ['user-c', 3],
    ])
  })

  it('builds certificate numbers from event, kind, ids and a random part', () => {
    expect(
      buildCertificateNumber({
        eventCode: 'tryout akbar batch 1',
        eventId: '12345678-aaaa-bbbb-cccc-1234567890ab',
        userId: 'abcdef12-3456-7890-abcd-ef1234567890',
        kind: 'winner_1',
        randomPart: '0A1B2C3D',
      }),
    ).toBe('ST-TRYOUT-AKBAR-BATCH-1-W1-12345678-ABCDEF12-0A1B2C3D')
  })

  it('makes certificate numbers unguessable from event and user ids (N-08)', () => {
    const input = {
      eventCode: 'tryout akbar batch 1',
      eventId: '12345678-aaaa-bbbb-cccc-1234567890ab',
      userId: 'abcdef12-3456-7890-abcd-ef1234567890',
      kind: 'participant' as const,
    }
    const numbers = new Set(Array.from({ length: 20 }, () => buildCertificateNumber(input)))
    expect(numbers.size).toBe(20)
    for (const value of numbers) expect(value).toMatch(/-[0-9A-F]{8}$/)
  })

  it('hides scores for non-passing participant certificates but keeps winner and passing scores', () => {
    expect(shouldShowCertificateScore({ kind: 'participant', isPassed: false })).toBe(false)
    expect(shouldShowCertificateScore({ kind: 'participant', isPassed: true })).toBe(true)
    expect(shouldShowCertificateScore({ kind: 'winner_1', isPassed: false })).toBe(true)

    expect(
      getCertificateAchievementLabel({
        kind: 'participant',
        rank: null,
        score: 250,
        isPassed: false,
      }),
    ).toBe('Peserta')
    expect(
      getCertificateAchievementLabel({
        kind: 'participant',
        rank: null,
        score: 330,
        isPassed: true,
      }),
    ).toBe('Peserta | Skor: 330')
  })

  it('renders the certificate PDF bytes', async () => {
    const pdf = await createEventCertificatePdf({
      certificateNumber: 'ST-TRYOUT-AKBAR-SKD-CPNS-BA-P-083FFB4C-D8C37906',
      certificateName: 'Dirga Halim Susilo',
      eventTitle: 'TRYOUT AKBAR SKD CPNS BATCH 2 (SESI 1)',
      certificateKind: 'participant',
      rank: null,
      score: null,
      isPassed: false,
      issuedAt: '2026-07-13T00:00:00.000Z',
      verifyUrl: '/verify-certificate/ST-TRYOUT-AKBAR-SKD-CPNS-BA-P-083FFB4C-D8C37906',
    })

    expect(Buffer.from(pdf.slice(0, 8)).toString('utf8')).toBe('%PDF-1.4')
    expect(pdf.length).toBeGreaterThan(100_000)
  })
})
