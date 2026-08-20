'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminV2Service, type AdminQuestionOptionInput } from '@/src/services/admin-v2.service'

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

function nullableText(form: FormData, key: string) {
    const value = text(form, key)
    return value || null
}

function numberValue(form: FormData, key: string, fallback = 0) {
    const raw = text(form, key)
    if (!raw) return fallback
    const value = Number(raw)
    if (!Number.isFinite(value)) throw new Error(`${key.toUpperCase()}_INVALID`)
    return value
}

function nullableNumber(form: FormData, key: string) {
    const raw = text(form, key)
    if (!raw) return null
    const value = Number(raw)
    if (!Number.isFinite(value)) throw new Error(`${key.toUpperCase()}_INVALID`)
    return value
}

function jakartaIso(form: FormData, key: string) {
    const value = text(form, key)
    if (!value) return null
    if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) {
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) throw new Error(`${key.toUpperCase()}_INVALID`)
        return parsed.toISOString()
    }
    const normalized = value.length === 16 ? `${value}:00+07:00` : `${value}+07:00`
    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) throw new Error(`${key.toUpperCase()}_INVALID`)
    return parsed.toISOString()
}

function parseQuestionOptions(raw: string): AdminQuestionOptionInput[] {
    if (!raw.trim()) return []
    const rows = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

    return rows.map((line, index) => {
        const [keyRaw, contentRaw, scoreRaw, correctRaw] = line.split('|').map((part) => part.trim())
        if (!keyRaw || !contentRaw) throw new Error(`OPTION_LINE_${index + 1}_INVALID`)
        const score = scoreRaw === '' || scoreRaw === undefined ? null : Number(scoreRaw)
        if (score !== null && !Number.isFinite(score)) throw new Error(`OPTION_SCORE_${index + 1}_INVALID`)
        const correct = correctRaw?.toLowerCase()
        const isCorrect = correct === undefined || correct === ''
            ? null
            : ['true', '1', 'yes', 'ya'].includes(correct)
        return {
            key: keyRaw.toUpperCase(),
            content: contentRaw,
            score,
            isCorrect,
            sortOrder: index + 1,
        }
    })
}

function errorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : 'ADMIN_ACTION_FAILED'
    const friendly: Record<string, string> = {
        PRODUCT_FIELDS_REQUIRED: 'Kode dan nama produk wajib diisi.',
        PRODUCT_PRICE_INVALID: 'Harga produk tidak valid.',
        TOKEN_GRANT_INVALID: 'Jumlah token tidak valid.',
        PRODUCT_DURATION_INVALID: 'Durasi produk harus lebih dari 0 hari.',
        EVENT_FIELDS_REQUIRED: 'Data event belum lengkap.',
        EVENT_TIME_INVALID: 'Waktu selesai event harus setelah waktu mulai.',
        EVENT_REGISTRATION_TIME_INVALID: 'Rentang waktu registrasi event tidak valid.',
        EVENT_SESSION_TIME_INVALID: 'Waktu sesi tidak valid.',
        EVENT_SESSION_CAPACITY_INVALID: 'Kapasitas sesi harus lebih dari 0.',
        EVENT_SESSION_NAME_REQUIRED: 'Nama sesi event wajib diisi.',
        EVENT_SESSION_MISMATCH: 'Sesi tidak berasal dari event yang dipilih.',
        EVENT_NOT_FOUND: 'Event tidak ditemukan.',
        EVENT_CATALOG_MISMATCH: 'Event tidak berada pada katalog CPNS/SKD.',
        EVENT_EXAM_MISMATCH: 'Exam dan event harus berada pada program/track yang sama.',
        EVENT_EXAM_TYPE_REQUIRED: 'Sesi Tryout Akbar hanya boleh memakai exam bertipe EVENT.',
        EVENT_SESSION_OUTSIDE_EVENT: 'Waktu sesi harus berada di dalam rentang waktu event.',
        EVENT_PRODUCT_MISMATCH: 'Produk tiket tidak cocok dengan event yang dipilih.',
        EVENT_PRODUCT_ARCHIVED: 'Produk tiket sudah diarsipkan.',
        EXAM_TYPE_INVALID: 'Tipe exam tidak valid.',
        EXAM_TITLE_REQUIRED: 'Judul exam wajib diisi.',
        EXAM_TOKEN_COST_INVALID: 'Biaya token exam tidak valid.',
        EXAM_DURATION_INVALID: 'Durasi exam harus lebih dari 0 detik.',
        EXAM_ATTEMPT_LIMIT_INVALID: 'Attempt limit harus lebih dari 0.',
        EXAM_TIME_INVALID: 'Rentang waktu exam tidak valid.',
        EXAM_NOT_FOUND: 'Exam tidak ditemukan pada katalog CPNS/SKD.',
        SUBJECT_INVALID: 'Subtes tidak valid.',
        SECTION_TITLE_REQUIRED: 'Judul section wajib diisi.',
        SECTION_SORT_ORDER_INVALID: 'Urutan section tidak valid.',
        SECTION_QUESTION_COUNT_INVALID: 'Jumlah soal section harus lebih dari 0.',
        SECTION_DURATION_INVALID: 'Durasi section harus lebih dari 0 detik.',
        SECTION_PASSING_SCORE_INVALID: 'Passing score section tidak valid.',
        QUESTION_STEM_REQUIRED: 'Isi pertanyaan wajib diisi.',
        QUESTION_OPTIONS_REQUIRED: 'Soal membutuhkan minimal dua opsi.',
        QUESTION_OPTION_KEYS_DUPLICATE: 'Key opsi harus unik, misalnya A, B, C, D.',
        QUESTION_OPTION_CONTENT_REQUIRED: 'Semua opsi harus memiliki isi.',
        QUESTION_OPTION_SCORE_INVALID: 'Skor opsi tidak valid.',
        QUESTION_CORRECT_OPTION_REQUIRED: 'Harus ada tepat satu opsi dengan penanda benar=true.',
        QUESTION_LOCKED_BY_ACTIVE_ATTEMPT: 'Kunci jawaban tidak bisa diubah saat soal sedang dipakai attempt aktif.',
    }
    return friendly[message] || message
}

async function actor(permission: PermissionCode) {
    await validateCsrf()
    return authorizationService.requirePermission(permission)
}

async function finish(tab: string, success: string, error: unknown = null, editId?: string | null) {
    revalidatePath('/cpns/admin')
    const edit = editId ? `&edit=${encodeURIComponent(editId)}` : ''
    if (error) {
        redirect(`/cpns/admin?tab=${encodeURIComponent(tab)}${edit}&error=${encodeURIComponent(errorMessage(error))}`)
    }
    redirect(`/cpns/admin?tab=${encodeURIComponent(tab)}${edit}&ok=${encodeURIComponent(success)}`)
}

export async function saveProductAction(form: FormData) {
    let failure: unknown = null
    const requestedId = nullableText(form, 'id')
    let savedId = requestedId
    try {
        await actor(PERMISSIONS.PRODUCT_MANAGE)
        savedId = await adminV2Service.saveProduct({
            id: requestedId,
            code: text(form, 'code'),
            name: text(form, 'name'),
            description: nullableText(form, 'description'),
            productType: text(form, 'product_type') || 'TOKEN_PACK',
            durationDays: nullableNumber(form, 'duration_days'),
            status: text(form, 'status') || 'draft',
            price: nullableNumber(form, 'price'),
            currency: text(form, 'currency') || 'IDR',
            tokenGrant: nullableNumber(form, 'token_grant'),
        })
    } catch (error) { failure = error }
    await finish('products', 'Produk tersimpan.', failure, savedId)
}

export async function archiveProductAction(form: FormData) {
    let failure: unknown = null
    try {
        await actor(PERMISSIONS.PRODUCT_MANAGE)
        await adminV2Service.archiveProduct(text(form, 'id'))
    } catch (error) { failure = error }
    await finish('products', 'Produk diarsipkan.', failure)
}

export async function saveEventAction(form: FormData) {
    let failure: unknown = null
    const requestedId = nullableText(form, 'id')
    let savedId = requestedId
    try {
        await actor(PERMISSIONS.EVENT_MANAGE)
        const startsAt = jakartaIso(form, 'starts_at')
        const endsAt = jakartaIso(form, 'ends_at')
        if (!startsAt || !endsAt) throw new Error('EVENT_FIELDS_REQUIRED')
        savedId = await adminV2Service.saveEvent({
            id: requestedId,
            code: text(form, 'code'),
            title: text(form, 'title'),
            slug: nullableText(form, 'slug'),
            description: nullableText(form, 'description'),
            registrationStart: jakartaIso(form, 'registration_start'),
            registrationEnd: jakartaIso(form, 'registration_end'),
            startsAt,
            endsAt,
            status: text(form, 'status') || 'draft',
        })
    } catch (error) { failure = error }
    await finish('events', 'Event tersimpan.', failure, savedId)
}

export async function archiveEventAction(form: FormData) {
    let failure: unknown = null
    try {
        await actor(PERMISSIONS.EVENT_MANAGE)
        await adminV2Service.archiveEvent(text(form, 'id'))
    } catch (error) { failure = error }
    await finish('events', 'Event diarsipkan.', failure)
}

export async function saveEventSessionAction(form: FormData) {
    let failure: unknown = null
    const eventId = text(form, 'event_id')
    try {
        await actor(PERMISSIONS.EVENT_MANAGE)
        const startsAt = jakartaIso(form, 'starts_at')
        const endsAt = jakartaIso(form, 'ends_at')
        if (!startsAt || !endsAt) throw new Error('EVENT_SESSION_TIME_INVALID')
        await adminV2Service.saveEventSession({
            id: nullableText(form, 'id'),
            eventId,
            examId: text(form, 'exam_id'),
            name: text(form, 'name'),
            startsAt,
            endsAt,
            capacity: nullableNumber(form, 'capacity'),
            status: text(form, 'status') || 'scheduled',
        })
    } catch (error) { failure = error }
    await finish('events', 'Sesi event tersimpan.', failure, eventId || null)
}

export async function linkEventProductAction(form: FormData) {
    let failure: unknown = null
    const eventId = text(form, 'event_id')
    try {
        await actor(PERMISSIONS.EVENT_MANAGE)
        await adminV2Service.linkEventProduct({
            eventId,
            sessionId: text(form, 'session_id'),
            productId: text(form, 'product_id'),
            status: text(form, 'status') || 'active',
        })
    } catch (error) { failure = error }
    await finish('events', 'Tiket produk terhubung ke event.', failure, eventId || null)
}

export async function saveExamAction(form: FormData) {
    let failure: unknown = null
    const requestedId = nullableText(form, 'id')
    let savedId = requestedId
    try {
        const authorization = await actor(PERMISSIONS.EXAM_MANAGE)
        savedId = await adminV2Service.saveExam({
            id: requestedId,
            examTypeCode: text(form, 'exam_type_code'),
            title: text(form, 'title'),
            slug: nullableText(form, 'slug'),
            durationSeconds: nullableNumber(form, 'duration_seconds'),
            attemptLimit: nullableNumber(form, 'attempt_limit'),
            questionOrder: text(form, 'question_order') || 'random',
            resultVisibility: text(form, 'result_visibility') || 'instant',
            accessType: text(form, 'access_type') || 'FREE',
            status: text(form, 'status') || 'draft',
            tokenCost: numberValue(form, 'token_cost', 0),
            startsAt: jakartaIso(form, 'starts_at'),
            endsAt: jakartaIso(form, 'ends_at'),
            actorId: authorization.userId,
        })
    } catch (error) { failure = error }
    await finish('exams', 'Exam tersimpan.', failure, savedId)
}

export async function archiveExamAction(form: FormData) {
    let failure: unknown = null
    try {
        await actor(PERMISSIONS.EXAM_MANAGE)
        await adminV2Service.archiveExam(text(form, 'id'))
    } catch (error) { failure = error }
    await finish('exams', 'Exam diarsipkan.', failure)
}

export async function saveExamSectionAction(form: FormData) {
    let failure: unknown = null
    const examId = text(form, 'exam_id')
    try {
        await actor(PERMISSIONS.EXAM_MANAGE)
        await adminV2Service.saveExamSection({
            id: nullableText(form, 'id'),
            examId,
            subjectCode: nullableText(form, 'subject_code'),
            title: text(form, 'title'),
            sortOrder: numberValue(form, 'sort_order', 0),
            questionCount: nullableNumber(form, 'question_count'),
            durationSeconds: nullableNumber(form, 'duration_seconds'),
            passingScore: nullableNumber(form, 'passing_score'),
        })
    } catch (error) { failure = error }
    await finish('exams', 'Section exam tersimpan.', failure, examId || null)
}

export async function saveQuestionAction(form: FormData) {
    let failure: unknown = null
    const requestedId = nullableText(form, 'id')
    let savedId = requestedId
    try {
        const authorization = await actor(PERMISSIONS.QUESTION_MANAGE)
        savedId = await adminV2Service.saveQuestion({
            id: requestedId,
            subjectCode: text(form, 'subject_code'),
            stem: text(form, 'stem'),
            difficulty: text(form, 'difficulty') || 'medium',
            status: text(form, 'status') || 'draft',
            sourceReference: nullableText(form, 'source_reference'),
            options: parseQuestionOptions(text(form, 'options')),
            actorId: authorization.userId,
            changeReason: nullableText(form, 'change_reason'),
        })
    } catch (error) { failure = error }
    await finish('questions', 'Soal tersimpan dan version history diperbarui.', failure, savedId)
}

export async function archiveQuestionAction(form: FormData) {
    let failure: unknown = null
    try {
        await actor(PERMISSIONS.QUESTION_MANAGE)
        await adminV2Service.archiveQuestion(text(form, 'id'))
    } catch (error) { failure = error }
    await finish('questions', 'Soal diarsipkan.', failure)
}
