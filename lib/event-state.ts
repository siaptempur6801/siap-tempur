/**
 * Logika keadaan event yang murni (tanpa React) — dapat diuji langsung.
 *
 * KENAPA DIPISAH DARI KOMPONEN
 *   Sebelumnya `isDone` ditulis DUA KALI di `components/dashboard/EventClient.tsx`
 *   (di `getEventState` dan di dalam komponen kartu). Keduanya harus sepakat,
 *   tetapi tidak ada yang memaksa demikian — dan memang keduanya sempat sama-sama
 *   salah dengan cara yang sama:
 *
 *     const isDone = event.session_id && (...)
 *
 *   `session_id` berisi id ATTEMPT, bukan id sesi event. Attempt event lama tidak
 *   ikut cutover Schema V2, sehingga 51 peserta yang sudah memegang sertifikat
 *   punya `participant_status = 'completed'` tetapi `session_id = null`. Syarat
 *   itu membuat `isDone` bernilai `null` (falsy) → tombol sertifikat tidak pernah
 *   muncul dan statusnya jatuh ke "Mulai Tryout"/"Event Berakhir", padahal
 *   sertifikatnya ada dan siap diunduh.
 *
 *   Logikanya kini hidup di satu tempat, dan `tests/unit/event-state.test.ts`
 *   mengunci perilakunya — termasuk kasus 51 peserta tersebut.
 */

export type EventDisplayStatus = 'scheduled' | 'live' | 'closed'

/** Bagian dari `UserEvent` yang dibutuhkan logika keadaan. */
export type EventStateInput = {
    starts_at: string
    ends_at: string
    start_grace_minutes: number
    status: EventDisplayStatus
    /** Berisi id ATTEMPT (bukan id sesi) — lihat catatan di atas. */
    session_id: string | null
    participant_id: string | null
    participant_status: string | null
    event_session_status: string | null
    test_session_status: string | null
    is_paid: boolean
    price: number
    payment_status: string | null
}

export type EventAction = 'history' | 'start' | 'disabled' | 'pay' | 'check_payment' | 'register'

export type EventState = {
    label: string
    action: EventAction
    step: 0 | 1 | 2 | 3
}

/** Status pembayaran Midtrans yang dianggap berhasil. */
export const SUCCESS_PAYMENT = new Set(['capture', 'settlement'])

/** Status registrasi yang menandakan partisipasi sudah tuntas. */
const COMPLETED = 'completed'

/**
 * Apakah partisipasi peserta di event ini sudah selesai?
 *
 * TIDAK mensyaratkan attempt. Penyelesaian dikenali dari sumber mana pun yang
 * tersedia: attempt yang tamat, status registrasi, status sesi, atau event yang
 * sudah melewati `ends_at` sementara peserta terdaftar.
 */
export function isEventDone(event: EventStateInput, now: number): boolean {
    const endsAt = Date.parse(event.ends_at)
    const eventEnded = Number.isFinite(endsAt) && now >= endsAt

    return Boolean(
        event.test_session_status === COMPLETED ||
        event.event_session_status === COMPLETED ||
        event.participant_status === COMPLETED ||
        (event.participant_id && eventEnded),
    )
}

/**
 * Apakah halaman hasil pengerjaan bisa dibuka?
 *
 * Halaman hasil membaca attempt berdasarkan id, jadi butuh `session_id` yang
 * benar-benar ada. `test_session_status` boleh null (baris attempt lama tidak
 * selalu punya status), tetapi bila terisi dan bukan `completed`, hasilnya belum
 * layak dibuka.
 */
export function canOpenAttemptResult(event: EventStateInput): boolean {
    if (!event.session_id) return false
    return event.test_session_status == null || event.test_session_status === COMPLETED
}

export function getEventState(event: EventStateInput, now: number): EventState {
    const startsAt = Date.parse(event.starts_at)
    const endsAt = Date.parse(event.ends_at)
    const latestStartAt = startsAt + event.start_grace_minutes * 60 * 1000
    const canUseScheduleWindow = event.status === 'scheduled' || event.status === 'live'

    const done = isEventDone(event, now)
    const canStart = canUseScheduleWindow && now >= startsAt && now <= latestStartAt && now <= endsAt

    // "Lihat Hasil" hanya bila attempt-nya memang ada; tanpa itu jatuh ke keadaan
    // berikutnya, bukan diarahkan ke halaman yang tidak punya data.
    if (done && canOpenAttemptResult(event)) {
        return { label: 'Lihat Hasil', action: 'history', step: 3 }
    }
    if (event.session_id) return { label: 'Lanjutkan', action: 'start', step: 2 }
    if (event.status === 'closed') return { label: 'Event Berakhir', action: 'disabled', step: 3 }
    if (canUseScheduleWindow && now > endsAt) {
        return { label: 'Event Berakhir', action: 'disabled', step: 3 }
    }

    // Registrasi adalah sumber kebenaran akses event.
    if (event.participant_id) {
        if (canStart) return { label: 'Mulai Tryout', action: 'start', step: 2 }
        if (canUseScheduleWindow && now > latestStartAt) {
            return { label: 'Waktu Masuk Ditutup', action: 'disabled', step: 1 }
        }
        return { label: 'Menunggu Jadwal', action: 'disabled', step: 1 }
    }

    // Gerbang event berbayar hanya berlaku sebelum registrasi ada.
    if (event.is_paid && event.price > 0) {
        const hasPaid = event.payment_status != null && SUCCESS_PAYMENT.has(event.payment_status)
        const hasPendingPayment = event.payment_status === 'pending'

        if (!hasPaid) {
            if (hasPendingPayment) return { label: 'Beli Tiket', action: 'check_payment', step: 0 }
            return { label: 'Beli Tiket', action: 'pay', step: 0 }
        }
    }

    if (!event.participant_id) return { label: 'Daftar Sekarang', action: 'register', step: 0 }
    if (canStart) return { label: 'Mulai Tryout', action: 'start', step: 2 }
    if (canUseScheduleWindow && now > latestStartAt) {
        return { label: 'Waktu Masuk Ditutup', action: 'disabled', step: 1 }
    }
    return { label: 'Menunggu Jadwal', action: 'disabled', step: 1 }
}
