/** Read-only parity on staging; full scans are test oracles, never app queries. */
import assert from 'node:assert/strict'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
nextEnv.loadEnvConfig(process.cwd())
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (new URL(url).hostname.split('.')[0] !== 'lpgrivowdcepcxradavu') throw new Error('Staging only')
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const data = async query => { const r = await query; if (r.error) throw r.error; return r.data }
const all = async build => { const result = []; for (let from = 0; ; from += 500) { const rows = await data(build().range(from, from + 499)); result.push(...rows); if (rows.length < 500) return result } }
let assertions = 0
const same = (a, b) => { assert.deepEqual(a, b); assertions++ }
const attempts = await all(() => admin.from('exam_attempts').select('id,user_id,exam_id,status,total_score,metadata,started_at,last_saved_at,last_question_position,updated_at').order('id'))
for (const userId of new Set(attempts.map(a => a.user_id))) {
    const completed = attempts.filter(a => a.user_id === userId && ['completed','COMPLETED'].includes(a.status))
    const xp = completed.reduce((sum, a) => {
        const score = Number(a.total_score || 0)
        const normalized = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0
        const kind = typeof a.metadata?.practiceKind === 'string' ? a.metadata.practiceKind : null
        return sum + Math.max(normalized, kind === 'mini_tryout' ? 20 : ['full_tryout','event'].includes(kind) ? 30 : 10)
    }, 0)
    const [totals] = await data(admin.rpc('practice_completed_attempt_totals', { p_user_id: userId }))
    same(totals, { total_sessions: completed.length, total_xp: xp })
    const active = attempts.filter(a => a.user_id === userId && ['created','CREATED','in_progress','IN_PROGRESS'].includes(a.status))
        .sort((a,b) => (b.last_saved_at || '').localeCompare(a.last_saved_at || '')).slice(0,30)
    const summaries = await data(admin.rpc('practice_active_attempt_overviews', { p_user_id: userId }))
    same(summaries.map(a=>a.id).sort(), active.map(a=>a.id).sort())
    for (const row of summaries) {
        const qs = await all(() => admin.from('attempt_questions').select('id,attempt_answers(selected_option_id)').eq('attempt_id', row.id).order('id'))
        same(row.question_count, qs.length)
        same(row.answered_questions, qs.filter(q => q.attempt_answers?.selected_option_id).length)
        same('question_snapshot' in row, false)
        same('selected_option_id' in row, false)
    }
}
const tracks = await data(admin.from('tracks').select('id,program_id,programs!inner(code)').eq('programs.code','TKA'))
for (const track of tracks) for (const statuses of [['published'],['approved','published']]) {
    const rows = await all(() => admin.from('questions').select('id').eq('program_id',track.program_id).eq('track_id',track.id).in('status',statuses).order('id'))
    const { count, error } = await admin.from('questions').select('id',{count:'exact',head:true}).eq('program_id',track.program_id).eq('track_id',track.id).in('status',statuses)
    if (error) throw error
    same(count,rows.length)
}
for (const [name,args] of [['practice_completed_attempt_totals',{p_user_id:attempts[0].user_id}],['practice_active_attempt_overviews',{p_user_id:attempts[0].user_id}],['learner_exam_attempt_summaries',{p_exam_ids:[]}],['learner_completed_attempt_totals',{}]]) {
    const { error } = await anon.rpc(name,args)
    same(error?.code,'42501')
}
console.log(JSON.stringify({status:'PASS',assertions,attempts:attempts.length,tracks:tracks.length,readOnly:true}))
