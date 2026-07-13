export type EventCertificateKind = 'winner_1' | 'winner_2' | 'winner_3' | 'participant'

export type CertificateCandidate = {
    user_id: string
    total_score: number | null
    completed_at: string | null
}

export type RankedCertificateCandidate = CertificateCandidate & {
    rank: number
}

export function normalizeCertificateName(input: string): { success: true; name: string } | { success: false; message: string } {
    const name = input.replace(/\s+/g, ' ').trim()

    if (name.length < 3) {
        return { success: false, message: 'Nama lengkap minimal 3 karakter.' }
    }

    if (name.length > 100) {
        return { success: false, message: 'Nama lengkap maksimal 100 karakter.' }
    }

    if (!/^[\p{L}\s.'-]+$/u.test(name)) {
        return { success: false, message: 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung.' }
    }

    return { success: true, name }
}

export function getCertificateKindForRank(rank: number | null | undefined): EventCertificateKind {
    if (rank === 1) return 'winner_1'
    if (rank === 2) return 'winner_2'
    if (rank === 3) return 'winner_3'
    return 'participant'
}

export function rankCertificateCandidates(candidates: CertificateCandidate[]): RankedCertificateCandidate[] {
    return [...candidates]
        .sort((left, right) => {
            const leftScore = Number(left.total_score || 0)
            const rightScore = Number(right.total_score || 0)
            if (rightScore !== leftScore) return rightScore - leftScore

            const leftCompleted = left.completed_at ? new Date(left.completed_at).getTime() : Number.MAX_SAFE_INTEGER
            const rightCompleted = right.completed_at ? new Date(right.completed_at).getTime() : Number.MAX_SAFE_INTEGER
            if (leftCompleted !== rightCompleted) return leftCompleted - rightCompleted

            return left.user_id.localeCompare(right.user_id)
        })
        .map((candidate, index) => ({
            ...candidate,
            rank: index + 1,
        }))
}

function slugCertificatePart(value: string) {
    const slug = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toUpperCase()

    return slug || 'EVENT'
}

function certificateKindCode(kind: EventCertificateKind) {
    if (kind === 'winner_1') return 'W1'
    if (kind === 'winner_2') return 'W2'
    if (kind === 'winner_3') return 'W3'
    return 'P'
}

export function buildCertificateNumber({
    eventCode,
    eventId,
    userId,
    kind,
}: {
    eventCode: string | null | undefined
    eventId: string
    userId: string
    kind: EventCertificateKind
}) {
    const eventPart = slugCertificatePart(eventCode || eventId).slice(0, 24)
    const eventIdPart = eventId.replace(/-/g, '').slice(0, 8).toUpperCase()
    const userIdPart = userId.replace(/-/g, '').slice(0, 8).toUpperCase()

    return ['ST', eventPart, certificateKindCode(kind), eventIdPart, userIdPart].join('-')
}

export function getCertificateTitle(kind: EventCertificateKind) {
    if (kind === 'winner_1') return 'Sertifikat Juara 1'
    if (kind === 'winner_2') return 'Sertifikat Juara 2'
    if (kind === 'winner_3') return 'Sertifikat Juara 3'
    return 'Sertifikat Keikutsertaan'
}

export function shouldShowCertificateScore({
    kind,
    isPassed,
}: {
    kind: EventCertificateKind
    isPassed: boolean | null | undefined
}) {
    return kind !== 'participant' || Boolean(isPassed)
}

export function getCertificateAchievementLabel({
    kind,
    rank,
    score,
    isPassed,
}: {
    kind: EventCertificateKind
    rank: number | null | undefined
    score: number | null | undefined
    isPassed: boolean | null | undefined
}) {
    const rankLabel = rank ? `Peringkat ${rank}` : 'Peserta'
    if (!shouldShowCertificateScore({ kind, isPassed })) return rankLabel

    return `${rankLabel} | Skor: ${score ?? '-'}`
}
