import { progressRepository, type SubjectProgressRow } from '@/src/repositories/progress.repository'

function round2(value: number) {
    return Number(value.toFixed(2))
}

export class SubjectProgressService {
    /**
     * Menyinkronkan `user_subject_progress` untuk satu user.
     *
     * Agregasi dihitung di database oleh `get_user_subject_progress`
     * (migration `20260918130000_subject_progress_aggregate_rpc.sql`).
     *
     * Sebelumnya fungsi ini menarik SELURUH id attempt user lalu mem-batch
     * skornya per ~16 KB URL: puluhan round trip untuk menghasilkan beberapa
     * angka, tumbuh tanpa batas seiring riwayat user, dan gagal keras saat
     * ambang `MAX_ATTEMPTS_PER_AGGREGATE` tersentuh sehingga submit ujian ikut
     * gagal. Sekarang satu round trip, terlepas dari panjang riwayat.
     *
     * Rumus dan pembulatannya TIDAK berubah (paritas diverifikasi terhadap data
     * staging: 8/8 subjek cocok dengan agregasi manual):
     *   accuracy      = round2(correct / questions_answered * 100)
     *   mastery_score = round2(sum(percentage * total_questions) / total_questions)
     */
    async sync(userId: string) {
        const aggregates = await progressRepository.getSubjectProgressAggregates(userId)

        const now = new Date().toISOString()
        const rows: SubjectProgressRow[] = aggregates.map((subject) => ({
            user_id: userId,
            subject_id: subject.subject_id,
            attempts: subject.attempts,
            questions_answered: subject.questions_answered,
            accuracy: subject.questions_answered > 0
                ? round2((subject.correct_answers / subject.questions_answered) * 100)
                : 0,
            mastery_score: subject.total_questions > 0
                ? round2(subject.weighted_percentage / subject.total_questions)
                : 0,
            updated_at: now,
        }))

        await progressRepository.upsertSubjectProgress(rows)
        return rows
    }
}

export const subjectProgressService = new SubjectProgressService()
