import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function waitForProfile(supabase, userId, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, tryout_quota')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return data
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Profil test user tidak muncul setelah signup trigger.')
}

async function main() {
  const rootDir = process.cwd()
  loadEnvFile(path.join(rootDir, '.env.local'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  assert(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL tidak ditemukan.')
  assert(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const testEmail = `cpns-resume-${Date.now()}@example.com`
  const testPassword = 'ResumeFlow123!'
  let testUserId = null
  let sessionId = null

  try {
    console.log('1. Membuat user test...')
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'CPNS Resume Test',
      },
    })

    if (createUserError) {
      throw createUserError
    }

    testUserId = createdUser.user.id
    console.log(`   User ID: ${testUserId}`)

    console.log('2. Menunggu profil trigger lalu memberi tiket tryout...')
    await waitForProfile(supabase, testUserId)

    const { error: quotaError } = await supabase
      .from('profiles')
      .update({ tryout_quota: 1 })
      .eq('id', testUserId)

    if (quotaError) {
      throw quotaError
    }

    console.log('3. Memulai sesi tryout...')
    const { data: sessionStartData, error: startError } = await supabase.rpc('start_tryout_session', {
      p_user_id: testUserId,
    })

    if (startError) {
      throw startError
    }

    assert(Array.isArray(sessionStartData) && sessionStartData.length > 0, 'RPC start_tryout_session tidak mengembalikan sesi.')
    sessionId = sessionStartData[0].session_id
    assert(sessionId, 'session_id tidak ditemukan dari RPC.')
    console.log(`   Session ID: ${sessionId}`)

    console.log('4. Memastikan 110 placeholder jawaban terbentuk...')
    const { count: totalQuestions, error: totalQuestionsError } = await supabase
      .from('test_answers')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (totalQuestionsError) {
      throw totalQuestionsError
    }

    assert(totalQuestions === 110, `Total soal sesi bukan 110. Dapat: ${totalQuestions}`)

    console.log('5. Mengisi beberapa jawaban lalu menyimpan progress terakhir di soal nomor 5...')
    const { data: firstQuestions, error: questionsError } = await supabase
      .from('test_answers')
      .select(`
        question_id,
        questions!inner(
          id,
          options (
            id
          )
        )
      `)
      .eq('session_id', sessionId)
      .limit(5)

    if (questionsError) {
      throw questionsError
    }

    assert(firstQuestions && firstQuestions.length === 5, 'Gagal mengambil 5 soal pertama sesi.')

    for (let i = 0; i < 3; i += 1) {
      const row = firstQuestions[i]
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions
      const optionId = question?.options?.[0]?.id
      assert(optionId, `Soal index ${i} tidak punya opsi untuk dijawab.`)

      const { error: answerError } = await supabase
        .from('test_answers')
        .update({ option_id: optionId })
        .eq('session_id', sessionId)
        .eq('question_id', row.question_id)

      if (answerError) {
        throw answerError
      }
    }

    const currentQuestionIndex = 4
    const currentQuestionId = firstQuestions[4].question_id

    const { error: progressError } = await supabase
      .from('test_sessions')
      .update({
        current_question_index: currentQuestionIndex,
        marked_questions: { [currentQuestionId]: true },
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (progressError) {
      throw progressError
    }

    console.log('6. Mengecek sesi aktif tetap sama saat user "masuk lagi"...')
    const { data: activeSession, error: activeSessionError } = await supabase
      .from('test_sessions')
      .select('id, status, current_question_index, marked_questions')
      .eq('user_id', testUserId)
      .eq('mode', 'tryout')
      .eq('status', 'in_progress')
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSessionError) {
      throw activeSessionError
    }

    assert(activeSession, 'Sesi aktif tidak ditemukan saat resume.')
    assert(activeSession.id === sessionId, 'Resume tidak mengarah ke sesi yang sama.')
    assert(activeSession.current_question_index === currentQuestionIndex, `Nomor soal terakhir tidak tersimpan. Expected 4, got ${activeSession.current_question_index}`)
    assert(activeSession.marked_questions?.[currentQuestionId] === true, 'Marked question tidak ikut tersimpan.')

    const resumedQuestionNumber = activeSession.current_question_index + 1
    assert(resumedQuestionNumber === 5, `User tidak resume di soal 5. Dapat: ${resumedQuestionNumber}`)
    console.log(`   Resume kembali ke soal nomor ${resumedQuestionNumber}`)

    console.log('7. Memastikan progress ringkas sesuai dashboard...')
    const { count: answeredCount, error: answeredCountError } = await supabase
      .from('test_answers')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .not('option_id', 'is', null)

    if (answeredCountError) {
      throw answeredCountError
    }

    assert(answeredCount === 3, `Jumlah jawaban tersimpan bukan 3. Dapat: ${answeredCount}`)

    console.log('8. Menyelesaikan sesi...')
    const { error: finishError } = await supabase.rpc('calculate_session_score', {
      session_uuid: sessionId,
    })

    if (finishError) {
      throw finishError
    }

    const { data: finishedSession, error: finishedSessionError } = await supabase
      .from('test_sessions')
      .select('id, status, end_time, total_score')
      .eq('id', sessionId)
      .maybeSingle()

    if (finishedSessionError) {
      throw finishedSessionError
    }

    assert(finishedSession?.status === 'completed', `Sesi tidak berubah ke completed. Status: ${finishedSession?.status}`)
    assert(Boolean(finishedSession?.end_time), 'end_time tidak terisi setelah finish.')

    console.log('9. Memastikan sesi aktif sudah hilang setelah selesai...')
    const { data: remainingActiveSession, error: remainingActiveSessionError } = await supabase
      .from('test_sessions')
      .select('id')
      .eq('user_id', testUserId)
      .eq('mode', 'tryout')
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle()

    if (remainingActiveSessionError) {
      throw remainingActiveSessionError
    }

    assert(!remainingActiveSession, 'Masih ada sesi aktif setelah finish.')

    console.log('')
    console.log('HASIL TEST: PASS')
    console.log(`- Session tetap sama saat resume: ${sessionId}`)
    console.log('- Resume kembali ke soal nomor 5: PASS')
    console.log('- Jumlah jawaban tersimpan: 3')
    console.log('- Sesi selesai dan status jadi completed: PASS')
  } finally {
    if (testUserId) {
      console.log('')
      console.log('10. Cleanup test user...')
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(testUserId)
      if (deleteUserError) {
        console.error('Cleanup gagal:', deleteUserError.message)
      } else {
        console.log('    Cleanup selesai.')
      }
    }
  }
}

main().catch((error) => {
  console.error('')
  console.error('HASIL TEST: FAIL')
  console.error(error)
  process.exitCode = 1
})
