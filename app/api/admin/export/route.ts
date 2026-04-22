import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { isAdmin } from '@/utils/admin'
import { createAdminClient } from '@/utils/supabase/server'
import { PASSING_GRADES } from '@/lib/constants'

type ExportType = 'sessions' | 'ranking' | 'questions' | 'vouchers' | 'events'
type ExportFormat = 'xlsx' | 'csv'

const MAX_ROWS = 5000

function getParam(request: NextRequest, key: string) {
    return request.nextUrl.searchParams.get(key)?.trim() || ''
}

function sanitizeSheetName(name: string) {
    return name.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Export'
}

function formatDate(value?: string | null) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString()
}

function csvEscape(value: unknown) {
    const text = value == null ? '' : String(value)
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }
    return text
}

function toCsv(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    return [
        headers.map(csvEscape).join(','),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
    ].join('\r\n')
}

function createFileResponse(rows: Record<string, unknown>[], type: ExportType, format: ExportFormat) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const filename = `siap-tempur-${type}-${timestamp}.${format}`

    if (format === 'csv') {
        const csv = toCsv(rows)
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    }

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(type))
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}

async function getSessionRows(request: NextRequest) {
    const supabase = await createAdminClient()
    const status = getParam(request, 'status')
    const dateFrom = getParam(request, 'date_from')
    const dateTo = getParam(request, 'date_to')

    let query = supabase
        .from('test_sessions')
        .select('id, user_id, mode, status, start_time, end_time, score_twk, score_tiu, score_tkp, total_score, is_passed, created_at, profiles(full_name)')
        .order('start_time', { ascending: false })
        .limit(MAX_ROWS)

    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('start_time', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('start_time', `${dateTo}T23:59:59.999Z`)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data || []).map((session) => {
        const profile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles
        const passed = Boolean(session.is_passed) || (
            Number(session.score_twk || 0) >= PASSING_GRADES.TWK &&
            Number(session.score_tiu || 0) >= PASSING_GRADES.TIU &&
            Number(session.score_tkp || 0) >= PASSING_GRADES.TKP
        )

        return {
            session_id: session.id,
            user_id: session.user_id,
            nama: profile?.full_name || '',
            mode: session.mode,
            status: session.status,
            waktu_mulai: formatDate(session.start_time),
            waktu_selesai: formatDate(session.end_time),
            skor_twk: session.score_twk || 0,
            skor_tiu: session.score_tiu || 0,
            skor_tkp: session.score_tkp || 0,
            total_skor: session.total_score || 0,
            lulus_passing_grade: passed ? 'Ya' : 'Tidak',
            created_at: formatDate(session.created_at),
        }
    })
}

async function getRankingRows() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('leaderboard_snapshot')
        .select('rank_pos, user_id, full_name, top_score, score_twk, score_tiu, score_tkp')
        .order('rank_pos', { ascending: true })
        .limit(MAX_ROWS)

    if (error) throw new Error(error.message)

    return (data || []).map((row) => ({
        ranking: row.rank_pos,
        user_id: row.user_id,
        nama: row.full_name || '',
        skor_twk: row.score_twk || 0,
        skor_tiu: row.score_tiu || 0,
        skor_tkp: row.score_tkp || 0,
        total_skor: row.top_score || 0,
    }))
}

async function getQuestionRows(request: NextRequest) {
    const supabase = await createAdminClient()
    const questionType = getParam(request, 'question_type')
    const dateFrom = getParam(request, 'date_from')
    const dateTo = getParam(request, 'date_to')

    let query = supabase
        .from('questions')
        .select('id, question_code, type, category, sub_category, content, image_url, explanation, created_at, options(content, image_url, is_correct, score_value)')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS)

    if (questionType) query = query.eq('type', questionType)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data || []).map((question) => {
        const options = question.options || []
        const optionByIndex = (index: number) => options[index]
        const correctIndex = options.findIndex((option) => option.is_correct)

        return {
            kode_soal: question.question_code || question.id,
            tipe: question.type,
            kategori: question.category || question.sub_category || '',
            isi_soal: question.content,
            gambar_soal: question.image_url || '',
            opsi_a: optionByIndex(0)?.content || '',
            opsi_a_gambar: optionByIndex(0)?.image_url || '',
            opsi_a_poin: optionByIndex(0)?.score_value || 0,
            opsi_b: optionByIndex(1)?.content || '',
            opsi_b_gambar: optionByIndex(1)?.image_url || '',
            opsi_b_poin: optionByIndex(1)?.score_value || 0,
            opsi_c: optionByIndex(2)?.content || '',
            opsi_c_gambar: optionByIndex(2)?.image_url || '',
            opsi_c_poin: optionByIndex(2)?.score_value || 0,
            opsi_d: optionByIndex(3)?.content || '',
            opsi_d_gambar: optionByIndex(3)?.image_url || '',
            opsi_d_poin: optionByIndex(3)?.score_value || 0,
            opsi_e: optionByIndex(4)?.content || '',
            opsi_e_gambar: optionByIndex(4)?.image_url || '',
            opsi_e_poin: optionByIndex(4)?.score_value || 0,
            kunci_jawaban: correctIndex >= 0 ? ['A', 'B', 'C', 'D', 'E'][correctIndex] : '',
            pembahasan: question.explanation || '',
            created_at: formatDate(question.created_at),
        }
    })
}

async function getVoucherRows(request: NextRequest) {
    const supabase = await createAdminClient()
    const dateFrom = getParam(request, 'date_from')
    const dateTo = getParam(request, 'date_to')

    let query = supabase
        .from('vouchers')
        .select('code, quota_amount, max_uses, used_count, expires_at, is_active, created_at, voucher_claims(user_email, claimed_at, profiles(full_name))')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS)

    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data || []).flatMap((voucher) => {
        const claims = voucher.voucher_claims || []
        if (claims.length === 0) {
            return [{
                kode_voucher: voucher.code,
                token: voucher.quota_amount,
                max_penggunaan: voucher.max_uses,
                total_dipakai: voucher.used_count,
                status: voucher.is_active ? 'Aktif' : 'Nonaktif',
                expired_at: formatDate(voucher.expires_at),
                nama_user: '',
                email_user: '',
                claimed_at: '',
                created_at: formatDate(voucher.created_at),
            }]
        }

        return claims.map((claim) => {
            const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles
            return {
                kode_voucher: voucher.code,
                token: voucher.quota_amount,
                max_penggunaan: voucher.max_uses,
                total_dipakai: voucher.used_count,
                status: voucher.is_active ? 'Aktif' : 'Nonaktif',
                expired_at: formatDate(voucher.expires_at),
                nama_user: profile?.full_name || '',
                email_user: claim.user_email || '',
                claimed_at: formatDate(claim.claimed_at),
                created_at: formatDate(voucher.created_at),
            }
        })
    })
}

async function getEventRows(request: NextRequest) {
    const supabase = await createAdminClient()
    const eventId = getParam(request, 'event_id')
    const dateFrom = getParam(request, 'date_from')
    const dateTo = getParam(request, 'date_to')

    let eventQuery = supabase
        .from('tryout_events')
        .select('id, title, status, starts_at, ends_at, duration_minutes, start_grace_minutes, max_participants, requires_code, created_at')
        .order('starts_at', { ascending: false })
        .limit(MAX_ROWS)

    if (eventId) eventQuery = eventQuery.eq('id', eventId)
    if (dateFrom) eventQuery = eventQuery.gte('starts_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) eventQuery = eventQuery.lte('starts_at', `${dateTo}T23:59:59.999Z`)

    const { data: events, error: eventError } = await eventQuery
    if (eventError) throw new Error(eventError.message)
    if (!events || events.length === 0) return []

    const eventIds = events.map((event) => event.id)

    const [{ data: participants, error: participantError }, { data: sessions, error: sessionError }] = await Promise.all([
        supabase
            .from('tryout_event_participants')
            .select('id, event_id, event_code_id, user_id, status, registered_at, profiles(full_name, phone_number, gender, education_level, target_instance), tryout_event_codes(code)')
            .in('event_id', eventIds)
            .order('registered_at', { ascending: true })
            .limit(MAX_ROWS),
        supabase
            .from('tryout_event_sessions')
            .select('event_id, user_id, session_id, status, started_at, finished_at, test_sessions(status, start_time, end_time, score_twk, score_tiu, score_tkp, total_score, is_passed)')
            .in('event_id', eventIds)
            .limit(MAX_ROWS),
    ])

    if (participantError) throw new Error(participantError.message)
    if (sessionError) throw new Error(sessionError.message)

    const sessionByEventUser = new Map(
        (sessions || []).map((session) => [`${session.event_id}:${session.user_id}`, session])
    )

    return events.flatMap((event) => {
        const eventParticipants = (participants || []).filter((participant) => participant.event_id === event.id)

        if (eventParticipants.length === 0) {
            return [{
                event_id: event.id,
                nama_event: event.title,
                status_event: event.status,
                event_mulai: formatDate(event.starts_at),
                event_tutup: formatDate(event.ends_at),
                durasi_menit: event.duration_minutes,
                start_window_menit: event.start_grace_minutes,
                max_peserta: event.max_participants || '',
                wajib_kode: event.requires_code ? 'Ya' : 'Tidak',
                participant_id: '',
                user_id: '',
                nama_peserta: '',
                no_hp: '',
                gender: '',
                pendidikan: '',
                target_instansi: '',
                kode_masuk: '',
                status_peserta: '',
                registered_at: '',
                session_id: '',
                status_session_event: '',
                status_test: '',
                started_at: '',
                finished_at: '',
                skor_twk: '',
                skor_tiu: '',
                skor_tkp: '',
                total_skor: '',
                lulus_passing_grade: '',
                created_at: formatDate(event.created_at),
            }]
        }

        return eventParticipants.map((participant) => {
            const profile = Array.isArray(participant.profiles) ? participant.profiles[0] : participant.profiles
            const code = Array.isArray(participant.tryout_event_codes) ? participant.tryout_event_codes[0] : participant.tryout_event_codes
            const eventSession = sessionByEventUser.get(`${participant.event_id}:${participant.user_id}`)
            const testSession = Array.isArray(eventSession?.test_sessions) ? eventSession?.test_sessions[0] : eventSession?.test_sessions
            const passed = Boolean(testSession?.is_passed) || (
                Number(testSession?.score_twk || 0) >= PASSING_GRADES.TWK &&
                Number(testSession?.score_tiu || 0) >= PASSING_GRADES.TIU &&
                Number(testSession?.score_tkp || 0) >= PASSING_GRADES.TKP
            )

            return {
                event_id: event.id,
                nama_event: event.title,
                status_event: event.status,
                event_mulai: formatDate(event.starts_at),
                event_tutup: formatDate(event.ends_at),
                durasi_menit: event.duration_minutes,
                start_window_menit: event.start_grace_minutes,
                max_peserta: event.max_participants || '',
                wajib_kode: event.requires_code ? 'Ya' : 'Tidak',
                participant_id: participant.id,
                user_id: participant.user_id,
                nama_peserta: profile?.full_name || '',
                no_hp: profile?.phone_number || '',
                gender: profile?.gender || '',
                pendidikan: profile?.education_level || '',
                target_instansi: profile?.target_instance || '',
                kode_masuk: code?.code || '',
                status_peserta: participant.status,
                registered_at: formatDate(participant.registered_at),
                session_id: eventSession?.session_id || '',
                status_session_event: eventSession?.status || '',
                status_test: testSession?.status || '',
                started_at: formatDate(eventSession?.started_at || testSession?.start_time),
                finished_at: formatDate(eventSession?.finished_at || testSession?.end_time),
                skor_twk: testSession?.score_twk ?? '',
                skor_tiu: testSession?.score_tiu ?? '',
                skor_tkp: testSession?.score_tkp ?? '',
                total_skor: testSession?.total_score ?? '',
                lulus_passing_grade: testSession ? (passed ? 'Ya' : 'Tidak') : '',
                created_at: formatDate(event.created_at),
            }
        })
    })
}

export async function GET(request: NextRequest) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const type = getParam(request, 'type') as ExportType
    const format = (getParam(request, 'format') || 'xlsx') as ExportFormat

    if (!['sessions', 'ranking', 'questions', 'vouchers', 'events'].includes(type)) {
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    if (!['xlsx', 'csv'].includes(format)) {
        return NextResponse.json({ error: 'Invalid export format' }, { status: 400 })
    }

    try {
        const rows =
            type === 'sessions'
                ? await getSessionRows(request)
                : type === 'ranking'
                    ? await getRankingRows()
                    : type === 'questions'
                        ? await getQuestionRows(request)
                        : type === 'vouchers'
                            ? await getVoucherRows(request)
                            : await getEventRows(request)

        return createFileResponse(rows, type, format)
    } catch (error) {
        console.error('[admin-export]', error)
        return NextResponse.json({ error: 'Gagal membuat export data' }, { status: 500 })
    }
}
