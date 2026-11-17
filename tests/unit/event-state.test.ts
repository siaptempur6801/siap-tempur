import { describe, expect, it } from 'vitest'
import {
  canOpenAttemptResult,
  getEventState,
  isEventDone,
  type EventStateInput,
} from '@/lib/event-state'

/**
 * Regresi keadaan event.
 *
 * Bug nyata yang dikunci di sini: `isDone` mensyaratkan `session_id` (yang berisi
 * id ATTEMPT, bukan id sesi). Attempt event lama tidak ikut cutover Schema V2,
 * sehingga 51 peserta yang SUDAH memegang sertifikat punya
 * `participant_status = 'completed'` tetapi `session_id = null`.
 *
 * Akibatnya `isDone` bernilai `null` (falsy) → tombol "Preview/Klaim Sertifikat"
 * tidak pernah muncul dan statusnya jatuh ke "Mulai Tryout" / "Event Berakhir",
 * padahal sertifikatnya ada dan siap diunduh.
 *
 * Sebelum perbaikan, logika ini ditulis DUA KALI di `EventClient.tsx` dengan
 * kesalahan yang sama. Kini satu tempat, dan dikunci di sini.
 */

const CLOSED_EVENT_END = '2026-06-16T05:25:00.000Z'
const AFTER_EVENT = Date.parse('2026-08-01T00:00:00.000Z')

/** Bentuk data persis seperti 51 pemegang sertifikat di produksi. */
function certificateHolder(overrides: Partial<EventStateInput> = {}): EventStateInput {
  return {
    starts_at: '2026-06-16T03:15:00.000Z',
    ends_at: CLOSED_EVENT_END,
    start_grace_minutes: 0,
    status: 'closed',
    session_id: null, // <-- tidak ada attempt
    participant_id: 'reg-1', // <-- tetapi terdaftar
    participant_status: 'completed',
    event_session_status: 'completed',
    test_session_status: null,
    is_paid: false,
    price: 0,
    payment_status: null,
    ...overrides,
  }
}

describe('isEventDone — tidak lagi mensyaratkan attempt', () => {
  it('pemegang sertifikat TANPA attempt tetap dianggap selesai (kasus produksi)', () => {
    expect(isEventDone(certificateHolder(), AFTER_EVENT)).toBe(true)
  })

  it('selesai bila attempt-nya tamat', () => {
    expect(
      isEventDone(
        certificateHolder({
          session_id: 'attempt-1',
          test_session_status: 'completed',
          participant_status: null,
        }),
        AFTER_EVENT,
      ),
    ).toBe(true)
  })

  it('selesai bila event sudah berakhir dan peserta terdaftar', () => {
    expect(
      isEventDone(
        certificateHolder({
          participant_status: null,
          event_session_status: null,
        }),
        AFTER_EVENT,
      ),
    ).toBe(true)
  })

  it('BELUM selesai bila event masih berjalan dan belum ada attempt', () => {
    const during = Date.parse('2026-06-16T04:00:00.000Z')
    expect(
      isEventDone(
        certificateHolder({
          status: 'live',
          participant_status: null,
          event_session_status: null,
        }),
        during,
      ),
    ).toBe(false)
  })

  it('belum selesai bila bukan peserta dan event belum berakhir', () => {
    expect(
      isEventDone(
        certificateHolder({
          participant_id: null,
          participant_status: null,
          event_session_status: null,
        }),
        AFTER_EVENT,
      ),
    ).toBe(false)
  })
})

describe('canOpenAttemptResult — hanya bila attempt benar-benar ada', () => {
  it('false tanpa session_id (id attempt)', () => {
    expect(canOpenAttemptResult(certificateHolder())).toBe(false)
  })

  it('true bila attempt ada dan statusnya completed', () => {
    expect(
      canOpenAttemptResult(
        certificateHolder({
          session_id: 'a1',
          test_session_status: 'completed',
        }),
      ),
    ).toBe(true)
  })

  it('true bila attempt ada dan statusnya belum terisi', () => {
    expect(
      canOpenAttemptResult(
        certificateHolder({
          session_id: 'a1',
          test_session_status: null,
        }),
      ),
    ).toBe(true)
  })

  it('false bila attempt masih berjalan', () => {
    expect(
      canOpenAttemptResult(
        certificateHolder({
          session_id: 'a1',
          test_session_status: 'in_progress',
        }),
      ),
    ).toBe(false)
  })
})

describe('getEventState — label yang dilihat peserta', () => {
  it('pemegang sertifikat tanpa attempt melihat "Event Berakhir", BUKAN "Mulai Tryout"', () => {
    const state = getEventState(certificateHolder(), AFTER_EVENT)
    expect(state.label).toBe('Event Berakhir')
    expect(state.action).toBe('disabled')
  })

  it('TIDAK pernah menghasilkan "Lihat Hasil" tanpa attempt', () => {
    const state = getEventState(certificateHolder(), AFTER_EVENT)
    expect(state.action).not.toBe('history')
  })

  it('peserta dengan attempt tamat melihat "Lihat Hasil"', () => {
    const state = getEventState(
      certificateHolder({
        session_id: 'a1',
        test_session_status: 'completed',
      }),
      AFTER_EVENT,
    )
    expect(state).toEqual({ label: 'Lihat Hasil', action: 'history', step: 3 })
  })

  it('peserta dengan attempt berjalan melihat "Lanjutkan"', () => {
    const state = getEventState(
      certificateHolder({
        session_id: 'a1',
        test_session_status: 'in_progress',
      }),
      AFTER_EVENT,
    )
    expect(state.label).toBe('Lanjutkan')
  })

  it('belum terdaftar dan event masih terjadwal melihat "Menunggu Jadwal"', () => {
    const beforeStart = Date.parse('2026-06-01T00:00:00.000Z')
    const state = getEventState(
      certificateHolder({
        status: 'scheduled',
        participant_id: null,
        participant_status: null,
        event_session_status: null,
      }),
      beforeStart,
    )
    expect(state.label).toBe('Daftar Sekarang')
  })

  it('peserta terdaftar di jendela waktu melihat "Mulai Tryout"', () => {
    // `start_grace_minutes: 60` memberi jendela masuk 1 jam setelah mulai —
    // tanpa itu `latestStartAt` sama dengan `startsAt` dan jendelanya nol.
    const during = Date.parse('2026-06-16T04:00:00.000Z')
    const state = getEventState(
      certificateHolder({
        status: 'live',
        start_grace_minutes: 60,
        participant_status: null,
        event_session_status: null,
      }),
      during,
    )
    expect(state.label).toBe('Mulai Tryout')
    expect(state.action).toBe('start')
  })

  it('peserta yang datang setelah jendela masuk melihat "Waktu Masuk Ditutup"', () => {
    const late = Date.parse('2026-06-16T05:00:00.000Z')
    const state = getEventState(
      certificateHolder({
        status: 'live',
        start_grace_minutes: 60,
        participant_status: null,
        event_session_status: null,
      }),
      late,
    )
    expect(state.label).toBe('Waktu Masuk Ditutup')
  })

  it('event berbayar yang belum dibayar menawarkan "Beli Tiket"', () => {
    const beforeStart = Date.parse('2026-06-01T00:00:00.000Z')
    const state = getEventState(
      certificateHolder({
        status: 'scheduled',
        is_paid: true,
        price: 35000,
        participant_id: null,
        participant_status: null,
        event_session_status: null,
      }),
      beforeStart,
    )
    expect(state.action).toBe('pay')
  })
})
