import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import TkaDashboardShell from '@/components/tka/TkaDashboardShell'
import TkaInteractiveReviewClient from '@/components/tka/TkaInteractiveReviewClient'
import type { UniversalReviewItem } from '@/src/services/practice-result.service'

const navigation = vi.hoisted(() => ({ pathname: '/tka/smp' }))

vi.mock('next/navigation', () => ({
    usePathname: () => navigation.pathname,
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockReviewItems: UniversalReviewItem[] = [
    {
        questionId: 'q-1',
        position: 1,
        subjectCode: 'BIN',
        stem: 'Teks soal nomor 1 bahasa indonesia.',
        responseType: 'single_choice',
        stimulus: {
            id: 'stim-1',
            code: 'STIM-1',
            title: 'Wacana Membaca',
            content: 'Isi teks wacana bacaan untuk soal.',
            imageUrl: null,
            sourceReference: 'Kemendikbud 2024',
        },
        options: [
            {
                id: 'opt-1',
                key: 'A',
                content: 'Pilihan A yang benar',
                imageUrl: null,
                isCorrect: true,
                score: 1,
                responseGroup: null,
                responseGroupOrder: null,
            },
            {
                id: 'opt-2',
                key: 'B',
                content: 'Pilihan B yang salah',
                imageUrl: null,
                isCorrect: false,
                score: 0,
                responseGroup: null,
                responseGroupOrder: null,
            },
        ],
        selectedOptionIds: ['opt-1'],
        isCorrect: true,
        scoreAwarded: 1,
        maxScore: 1,
        explanation: 'Penjelasan lengkap untuk soal nomor 1.',
    },
    {
        questionId: 'q-2',
        position: 2,
        subjectCode: 'MAT',
        stem: 'Berapakah nilai dari 2 + 2?',
        responseType: 'single_choice',
        stimulus: null,
        options: [
            {
                id: 'opt-3',
                key: 'A',
                content: '3',
                imageUrl: null,
                isCorrect: false,
                score: 0,
                responseGroup: null,
                responseGroupOrder: null,
            },
            {
                id: 'opt-4',
                key: 'B',
                content: '4',
                imageUrl: null,
                isCorrect: true,
                score: 1,
                responseGroup: null,
                responseGroupOrder: null,
            },
        ],
        selectedOptionIds: ['opt-3'],
        isCorrect: false,
        scoreAwarded: 0,
        maxScore: 1,
        explanation: '2 + 2 menghasilkan 4.',
    },
]

describe('TKA Review Experience', () => {
    it('removes the dashboard sidebar on review and pembahasan routes', () => {
        navigation.pathname = '/tka/smp/tryout/session-123/review'
        const reviewMarkup = renderToStaticMarkup(
            <TkaDashboardShell
                level="SMP"
                user={{ id: 'user-1', email: 'user@example.com' }}
                profile={null}
                activePassScopes={[]}
                signoutAction={async () => ({ success: true })}
            >
                <div id="review-content">Konten Review</div>
            </TkaDashboardShell>,
        )

        expect(reviewMarkup).toContain('id="review-content"')
        expect(reviewMarkup).not.toContain('Navigasi utama TKA')
        expect(reviewMarkup).not.toContain('>Ringkasan<')
        expect(reviewMarkup).not.toContain('>Tryout<')
        expect(reviewMarkup).toContain('data-experience-mode="exam"')

        navigation.pathname = '/tka/smp/tryout/session-123/pembahasan'
        const pembahasanMarkup = renderToStaticMarkup(
            <TkaDashboardShell
                level="SMP"
                user={{ id: 'user-1', email: 'user@example.com' }}
                profile={null}
                activePassScopes={[]}
                signoutAction={async () => ({ success: true })}
            >
                <div id="pembahasan-content">Konten Pembahasan</div>
            </TkaDashboardShell>,
        )
        expect(pembahasanMarkup).toContain('id="pembahasan-content"')
        expect(pembahasanMarkup).not.toContain('Navigasi utama TKA')

        navigation.pathname = '/tka/smp/tryout/session-123/result'
        const resultMarkup = renderToStaticMarkup(
            <TkaDashboardShell
                level="SMP"
                user={{ id: 'user-1', email: 'user@example.com' }}
                profile={null}
                activePassScopes={[]}
                signoutAction={async () => ({ success: true })}
            >
                <div id="result-content">Konten Result</div>
            </TkaDashboardShell>,
        )
        expect(resultMarkup).toContain('id="result-content"')
        expect(resultMarkup).not.toContain('Navigasi utama TKA')
        expect(resultMarkup).toContain('data-experience-mode="exam"')
    })

    it('renders embedded review client with palette and navigation inside result page', () => {
        const markup = renderToStaticMarkup(
            <TkaInteractiveReviewClient
                level="SMP"
                attemptId="session-123"
                practiceKind="full_tryout"
                backUrl="/tka/smp/tryout/session-123/result"
                fullReviewUrl="/tka/smp/tryout/session-123/review"
                items={mockReviewItems}
                embedded
            />,
        )

        expect(markup).toContain('Soal 1 dari 2')
        expect(markup).toContain('href="/tka/smp/tryout/session-123/review"')
        expect(markup).toContain('Navigasi Soal')
        expect(markup).toContain('Teks soal nomor 1 bahasa indonesia.')
        expect(markup).toContain('Jawaban kamu')
        expect(markup).toContain('Kunci jawaban')
        expect(markup).toContain('Pembahasan Lengkap')
    })

    it('renders question navigation palette, stimulus, answers, and explanation in TkaInteractiveReviewClient', () => {
        const markup = renderToStaticMarkup(
            <TkaInteractiveReviewClient
                level="SMP"
                attemptId="session-123"
                practiceKind="full_tryout"
                backUrl="/tka/smp/tryout/session-123/result"
                items={mockReviewItems}
            />,
        )

        // Top bar elements
        expect(markup).toContain('Pembahasan Full Tryout · TKA/SMP')
        expect(markup).toContain('Ringkasan Hasil')
        expect(markup).toContain('href="/tka/smp/tryout/session-123/result"')

        // Stimulus and stem
        expect(markup).toContain('Wacana Membaca')
        expect(markup).toContain('Isi teks wacana bacaan untuk soal.')
        expect(markup).toContain('Teks soal nomor 1 bahasa indonesia.')

        // Options and badge indicators
        expect(markup).toContain('Pilihan A yang benar')
        expect(markup).toContain('Jawaban kamu')
        expect(markup).toContain('Kunci jawaban')
        expect(markup).toContain('Jawaban Benar (+1 poin)')

        // Explanation card
        expect(markup).toContain('Pembahasan Lengkap')
        expect(markup).toContain('Penjelasan lengkap untuk soal nomor 1.')

        // Question navigation palette
        expect(markup).toContain('Navigasi Soal')
        expect(markup).toContain('Buka nomor 1, status: correct')
        expect(markup).toContain('Buka nomor 2, status: wrong')
        expect(markup).toContain('Semua (2)')
        expect(markup).toContain('Benar (1)')
        expect(markup).toContain('Salah (1)')
    })
})
