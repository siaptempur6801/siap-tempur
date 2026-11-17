import { describe, expect, it } from 'vitest'
import {
  activeStageFor,
  activeStagesFor,
  nextStep,
  REVIEW_STAGE_TOTAL,
  STAGE_NUMBER,
  summarizeBatch,
  SUBMITTABLE_STATUSES,
  type BatchRow,
} from '@/lib/review-batch'

/**
 * Gating panel review massal.
 *
 * Ini bagian yang paling mudah salah: kalau `summarizeBatch`/`nextStep` keliru,
 * tombol bisa menyembunyikan langkah yang justru dibutuhkan, atau mengarahkan
 * operator memanggil RPC massal pada batch yang belum siap.
 *
 * Angka di test ini memakai bentuk data NYATA batch `cpns-full-tryout-1` di
 * produksi: 80 soal (35 TIU + 45 TKP), semuanya `draft`, semuanya membawa
 * `reviewer_id = author_id` sebagai sisa importer legacy.
 */

const ACTOR = 'd8c37906-29c8-4a47-8c10-ed2e19dc0de2'
const AUTHOR = '93b4d35b-a1fb-4a16-9304-fef1116002cf'

/** Batch apa adanya di produksi saat migration batch di-apply. */
function legacyImportedBatch(size = 80): BatchRow[] {
  return Array.from({ length: size }, () => ({
    status: 'draft',
    reviewerId: AUTHOR,
    authorId: AUTHOR,
  }))
}

describe('nomor tahap', () => {
  it('memberi posisi 1-3 untuk label "Tahap X dari 3"', () => {
    expect(REVIEW_STAGE_TOTAL).toBe(3)
    expect(STAGE_NUMBER.editorial).toBe(1)
    expect(STAGE_NUMBER.academic).toBe(2)
    expect(STAGE_NUMBER.technical_qa).toBe(3)
  })
})

describe('activeStageFor', () => {
  it('memetakan setiap status review ke tahapnya', () => {
    expect(activeStageFor([{ status: 'submitted', reviewerId: null, authorId: AUTHOR }])).toBe(
      'editorial',
    )
    expect(
      activeStageFor([{ status: 'editorial_review', reviewerId: null, authorId: AUTHOR }]),
    ).toBe('editorial')
    expect(
      activeStageFor([{ status: 'academic_review', reviewerId: null, authorId: AUTHOR }]),
    ).toBe('academic')
    expect(activeStageFor([{ status: 'technical_qa', reviewerId: null, authorId: AUTHOR }])).toBe(
      'technical_qa',
    )
  })

  it('mengembalikan null bila tidak ada soal di tahap review', () => {
    expect(activeStageFor([{ status: 'draft', reviewerId: null, authorId: AUTHOR }])).toBeNull()
    expect(activeStageFor([{ status: 'approved', reviewerId: null, authorId: AUTHOR }])).toBeNull()
    expect(activeStageFor([{ status: 'published', reviewerId: null, authorId: AUTHOR }])).toBeNull()
    expect(
      activeStageFor([{ status: 'revision_required', reviewerId: null, authorId: AUTHOR }]),
    ).toBeNull()
    expect(activeStageFor([{ status: 'rejected', reviewerId: null, authorId: AUTHOR }])).toBeNull()
    expect(activeStageFor([])).toBeNull()
  })

  it('memilih tahap terdalem saat batch tidak seragam', () => {
    // Sebagian batch tertinggal di editorial; sisanya sudah di akademik.
    // Operator harus menyelesaikan editorial dulu, jadi itu yang dilaporkan.
    expect(
      activeStageFor([
        { status: 'academic_review', reviewerId: null, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: null, authorId: AUTHOR },
      ]),
    ).toBe('editorial')
    expect(
      activeStageFor([
        { status: 'technical_qa', reviewerId: null, authorId: AUTHOR },
        { status: 'academic_review', reviewerId: null, authorId: AUTHOR },
      ]),
    ).toBe('academic')
  })

  it('melaporkan SEMUA tahap yang berjalan, bukan hanya satu', () => {
    // `bulk_review_pilot_stage` memajukan setiap soal SATU tahap sesuai
    // posisinya sendiri, jadi batch campuran tetap aman. Panel harus
    // mengatakannya apa adanya, bukan meratakan ke satu label.
    expect(
      activeStagesFor([
        { status: 'academic_review', reviewerId: null, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: null, authorId: AUTHOR },
      ]),
    ).toEqual(['editorial', 'academic'])
    expect(
      activeStagesFor([
        { status: 'technical_qa', reviewerId: null, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: null, authorId: AUTHOR },
      ]),
    ).toEqual(['editorial', 'technical_qa'])
    expect(
      activeStagesFor([{ status: 'editorial_review', reviewerId: null, authorId: AUTHOR }]),
    ).toEqual(['editorial'])
    expect(activeStagesFor([{ status: 'approved', reviewerId: null, authorId: AUTHOR }])).toEqual(
      [],
    )
  })

  it('memperlakukan submitted sebagai editorial (belum diklaim reviewer)', () => {
    // `claim_pilot_review_stage` menangani `submitted` bersama
    // `editorial_review`, jadi keduanya harus tampil sebagai satu tahap.
    expect(
      activeStageFor([
        { status: 'submitted', reviewerId: null, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: null, authorId: AUTHOR },
      ]),
    ).toBe('editorial')
  })
})

describe('summarizeBatch — batch legacy di produksi', () => {
  it('melaporkan 80 soal draft sebagai belum punya reviewer sah', () => {
    const summary = summarizeBatch(legacyImportedBatch(), ACTOR)

    expect(summary.total).toBe(80)
    expect(summary.byStatus).toEqual({ draft: 80 })
    // Inti regresi: `reviewer_id` TERISI (menunjuk author), tetapi tidak ada
    // satu pun reviewer yang sah. Tanpa perhitungan self-assign, panel akan
    // melaporkan 0 dan menyembunyikan kenyataan bahwa batch belum diklaim.
    expect(summary.selfAssigned).toBe(80)
    expect(summary.unassigned).toBe(80)
    expect(summary.assignedToMe).toBe(0)
  })

  it('menandai batch draft sebagai butuh langkah 1', () => {
    const summary = summarizeBatch(legacyImportedBatch(), ACTOR)

    expect(summary.needsPrepare).toBe(true)
    expect(summary.activeStage).toBeNull()
    expect(summary.approved).toBe(0)
    expect(summary.isDone).toBe(false)
    expect(summary.actionable).toBe(true)
    expect(nextStep(summary)).toBe(1)
  })
})

describe('summarizeBatch — reviewer_id = author tidak dihitung sebagai milik aktor', () => {
  it('tidak menghitung self-assign sebagai "ditugaskan ke saya" walau aktor adalah author', () => {
    // Kasus tepi: aktor kebetulan author soal itu sendiri. RPC massal akan
    // menolaknya ("Author cannot review their own question"), jadi panel
    // tidak boleh mengklaim soal itu ada di tangan aktor.
    const summary = summarizeBatch([{ status: 'draft', reviewerId: ACTOR, authorId: ACTOR }], ACTOR)

    expect(summary.assignedToMe).toBe(0)
    expect(summary.selfAssigned).toBe(1)
    expect(summary.unassigned).toBe(1)
  })
})

describe('nextStep — urutan langkah', () => {
  const rows = (status: string, count = 1, reviewerId: string | null = ACTOR): BatchRow[] =>
    Array.from({ length: count }, () => ({ status, reviewerId, authorId: AUTHOR }))

  it('langkah 1 selama masih ada draft', () => {
    expect(nextStep(summarizeBatch(rows('draft'), ACTOR))).toBe(1)
    expect(nextStep(summarizeBatch(rows('revision_required'), ACTOR))).toBe(1)
  })

  it('langkah 2 selama ada submitted yang belum diklaim', () => {
    // `submitted` tidak bisa di-submit ulang, tetapi tetap butuh klaim.
    // Langkah 2 sudah mengklaim sendiri, jadi tidak perlu bolak-balik ke
    // langkah 1 — satu klik per tahap.
    const summary = summarizeBatch(rows('submitted', 1, null), ACTOR)
    expect(summary.needsPrepare).toBe(false)
    expect(summary.unassigned).toBe(1)
    expect(summary.activeStage).toBe('editorial')
    expect(nextStep(summary)).toBe(2)
  })

  it('langkah 2 setelah batch diklaim dan berada di satu tahap', () => {
    const summary = summarizeBatch(rows('submitted', 80, ACTOR), ACTOR)
    expect(summary.unassigned).toBe(0)
    expect(summary.assignedToMe).toBe(80)
    expect(nextStep(summary)).toBe(2)
  })

  it('langkah 2 juga saat tahap berikutnya belum diklaim lagi', () => {
    // Setelah editorial disetujui, `review_question_stage` mengosongkan
    // reviewer_id. Panel TIDAK boleh menyuruh operator kembali ke langkah 1:
    // langkah 2 mengklaim ulang sendiri, jadi tetap dua klik per tahap.
    const summary = summarizeBatch(rows('academic_review', 80, null), ACTOR)
    expect(summary.unassigned).toBe(80)
    expect(summary.needsPrepare).toBe(false)
    expect(nextStep(summary)).toBe(2)
  })

  it('langkah 2 selama ada tahap review aktif', () => {
    expect(nextStep(summarizeBatch(rows('editorial_review'), ACTOR))).toBe(2)
    expect(nextStep(summarizeBatch(rows('academic_review'), ACTOR))).toBe(2)
    expect(nextStep(summarizeBatch(rows('technical_qa'), ACTOR))).toBe(2)
  })

  it('langkah 3 setelah semua approved', () => {
    const summary = summarizeBatch(rows('approved', 80), ACTOR)
    expect(summary.needsPrepare).toBe(false)
    expect(summary.activeStage).toBeNull()
    expect(summary.approved).toBe(80)
    expect(nextStep(summary)).toBe(3)
  })

  it('null setelah semua terbit', () => {
    const summary = summarizeBatch(rows('published', 80, null), ACTOR)
    expect(summary.isDone).toBe(true)
    expect(summary.approved).toBe(0)
    // `publish_question` mengosongkan `reviewer_id`; soal terbit BUKAN
    // "belum ada reviewer", jadi tidak boleh memicu langkah 1.
    expect(summary.unassigned).toBe(0)
    expect(nextStep(summary)).toBeNull()
  })

  it('mendahulukan langkah 1 saat batch campuran draft + approved', () => {
    // Batch yang belum seragam: selesaikan penyiapan dulu, jangan terbitkan
    // sebagian lalu meninggalkan sisanya.
    const summary = summarizeBatch([...rows('draft', 5), ...rows('approved', 3)], ACTOR)
    expect(nextStep(summary)).toBe(1)
    expect(summary.approved).toBe(3)
  })
})

describe('summarizeBatch — batch kosong', () => {
  it('tidak mengklaim selesai dan tidak ada langkah', () => {
    const summary = summarizeBatch([], ACTOR)

    expect(summary.total).toBe(0)
    // `isDone` mensyaratkan total > 0: batch kosong bukan "selesai".
    expect(summary.isDone).toBe(false)
    expect(summary.actionable).toBe(false)
    expect(nextStep(summary)).toBeNull()
  })
})

describe('SUBMITTABLE_STATUSES', () => {
  it('hanya draft dan revision_required yang boleh dikirim ulang', () => {
    expect([...SUBMITTABLE_STATUSES].sort()).toEqual(['draft', 'revision_required'])
    for (const status of [
      'submitted',
      'editorial_review',
      'academic_review',
      'technical_qa',
      'approved',
      'published',
      'rejected',
    ]) {
      expect(SUBMITTABLE_STATUSES.has(status)).toBe(false)
    }
  })
})

describe('summarizeBatch — hitungan per status', () => {
  it('memisahkan assignedToMe hanya untuk reviewer sah milik aktor', () => {
    const summary = summarizeBatch(
      [
        { status: 'editorial_review', reviewerId: ACTOR, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: ACTOR, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: null, authorId: AUTHOR },
        { status: 'editorial_review', reviewerId: 'orang-lain', authorId: AUTHOR },
      ],
      ACTOR,
    )

    expect(summary.assignedToMe).toBe(2)
    expect(summary.unassigned).toBe(1)
    expect(summary.byStatus).toEqual({ editorial_review: 4 })
    expect(summary.total).toBe(4)
  })
})
