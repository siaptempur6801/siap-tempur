import { describe, expect, it } from 'vitest'
import { readSnapshotOptions } from '@/src/services/scoring.service'
import { calculateResponseScore } from '@/src/domain/question-response'
import type { Json } from '@/types/database.types'

/**
 * Regresi: kunci jawaban dibekukan per attempt.
 *
 * Sebelum perbaikan, `ScoringService.finishAttempt` menyekor dari
 * `question_options` yang HIDUP. Kalau admin memperbaiki kunci soal setelah
 * peserta mengerjakan, nilai peserta ikut berubah — dan peserta tidak dapat
 * membuktikan jawabannya benar dengan kunci yang berlaku saat itu.
 *
 * Jalur TKA (`app_private.score_exam_attempt`) sudah menyekor dari snapshot
 * beku, jadi satu attempt bisa punya dua kunci jawaban berbeda tergantung jalur
 * mana yang jalan. Sekarang keduanya membaca struktur yang sama.
 *
 * Keputusan produk 2026-09-18: attempt lama DIBIARKAN, tidak dihitung ulang.
 */

function snapshot(options: Array<Record<string, unknown>>, questionType = 'single_choice'): Json {
  return { questionType, subjectId: 'subject-1', passingScore: 65, options } as Json
}

describe('readSnapshotOptions', () => {
  it('membaca opsi lengkap dengan kunci jawaban', () => {
    const result = readSnapshotOptions(
      snapshot([
        { id: 'opt-a', isCorrect: true, score: 5 },
        { id: 'opt-b', isCorrect: false, score: 0 },
      ]),
    )

    expect(result).toEqual([
      { id: 'opt-a', isCorrect: true, score: 5, responseGroup: null, responseGroupOrder: null },
      { id: 'opt-b', isCorrect: false, score: 0, responseGroup: null, responseGroupOrder: null },
    ])
  })

  it('mengembalikan array KOSONG untuk snapshot lama yang tidak memuat kunci', () => {
    // Ini sinyal fallback: attempt yang dibuat sebelum kunci ikut dibekukan
    // hanya punya id/key/content di dalam snapshot.
    const legacy = snapshot([
      { id: 'opt-a', key: 'A', content: 'Pilihan A' },
      { id: 'opt-b', key: 'B', content: 'Pilihan B' },
    ])
    expect(readSnapshotOptions(legacy)).toEqual([])
  })

  it('mengabaikan opsi tanpa id', () => {
    expect(
      readSnapshotOptions(
        snapshot([
          { isCorrect: true, score: 5 },
          { id: 'opt-b', isCorrect: false, score: 0 },
        ]),
      ),
    ).toHaveLength(1)
  })

  it('menerima responseGroup dalam camelCase maupun snake_case', () => {
    const camel = readSnapshotOptions(
      snapshot([
        {
          id: 'a',
          isCorrect: true,
          score: 1,
          responseGroup: 'Pernyataan 1',
          responseGroupOrder: 2,
        },
      ]),
    )
    expect(camel[0]).toMatchObject({ responseGroup: 'Pernyataan 1', responseGroupOrder: 2 })

    const snake = readSnapshotOptions(
      snapshot([
        {
          id: 'a',
          isCorrect: true,
          score: 1,
          response_group: 'Pernyataan 1',
          response_group_order: 2,
        },
      ]),
    )
    expect(snake[0]).toMatchObject({ responseGroup: 'Pernyataan 1', responseGroupOrder: 2 })
  })

  it('menangani snapshot yang rusak tanpa melempar', () => {
    expect(readSnapshotOptions(null as unknown as Json)).toEqual([])
    expect(readSnapshotOptions([] as unknown as Json)).toEqual([])
    expect(readSnapshotOptions({ options: 'bukan array' } as unknown as Json)).toEqual([])
    expect(readSnapshotOptions({ options: [null, 42, 'x'] } as unknown as Json)).toEqual([])
  })
})

describe('nilai peserta tidak bergerak saat kunci soal diperbaiki', () => {
  it('menghasilkan skor yang sama walau opsi hidup berubah', () => {
    // Soal versi peserta: A benar. Peserta memilih A.
    const frozen = snapshot([
      { id: 'opt-a', isCorrect: true, score: 5 },
      { id: 'opt-b', isCorrect: false, score: 0 },
    ])

    // Admin kemudian memperbaiki kunci: sekarang B yang benar.
    const liveAfterCorrection = [
      { id: 'opt-a', isCorrect: false, score: 0 },
      { id: 'opt-b', isCorrect: true, score: 5 },
    ]

    const scorable = readSnapshotOptions(frozen)
    const fromFrozen = calculateResponseScore({
      questionType: 'single_choice',
      options: scorable,
      selectedOptionIds: ['opt-a'],
      config: undefined,
    })
    const fromLive = calculateResponseScore({
      questionType: 'single_choice',
      options: liveAfterCorrection.map((option) => ({
        id: option.id,
        isCorrect: option.isCorrect,
        score: option.score,
      })),
      selectedOptionIds: ['opt-a'],
      config: undefined,
    })

    // Yang dibekukan memberi nilai penuh; yang hidup akan menghukum peserta
    // karena kunci yang dia lihat saat mengerjakan sudah tidak berlaku.
    expect(fromFrozen.score).toBe(5)
    expect(fromFrozen.isCorrect).toBe(true)
    expect(fromLive.score).toBe(0)
    expect(fromLive.isCorrect).toBe(false)
  })

  it('skor TKP bergradasi tetap terbaca dari snapshot', () => {
    // TKP tidak punya jawaban benar/salah tunggal — nilainya gradasi 1..5.
    const frozen = snapshot([
      { id: 'opt-1', isCorrect: false, score: 1 },
      { id: 'opt-2', isCorrect: false, score: 2 },
      { id: 'opt-3', isCorrect: false, score: 3 },
      { id: 'opt-4', isCorrect: false, score: 4 },
      { id: 'opt-5', isCorrect: true, score: 5 },
    ])

    const scorable = readSnapshotOptions(frozen)
    expect(scorable.map((option) => option.score)).toEqual([1, 2, 3, 4, 5])

    const scored = calculateResponseScore({
      questionType: 'single_choice',
      options: scorable,
      selectedOptionIds: ['opt-3'],
      config: undefined,
    })
    expect(scored.score).toBe(3)
  })
})
