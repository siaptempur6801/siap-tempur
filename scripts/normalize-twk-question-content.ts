import { createClient } from '@supabase/supabase-js'
import { normalizeQuestionContentSpacing } from '@/lib/question-rich-text'

interface TwkQuestion {
  id: string
  question_code: string | null
  content: string
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} tidak tersedia.`)
  }

  return value
}

const shouldApply = process.argv.includes('--apply')
const supabase = createClient(
  requireEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL'),
  requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

const { data, error } = await supabase
  .from('questions')
  .select('id, question_code, content')
  .eq('type', 'TWK')
  .order('question_code')

if (error) {
  throw new Error(`Gagal membaca soal TWK: ${error.message}`)
}

const questions = (data || []) as TwkQuestion[]
const affectedQuestions = questions
  .map((question) => ({
    ...question,
    normalizedContent: normalizeQuestionContentSpacing(question.content),
  }))
  .filter((question) => question.normalizedContent !== question.content)

console.log(`TWK ditemukan: ${questions.length}`)
console.log(`Narasi soal perlu dirapikan: ${affectedQuestions.length}`)
if (affectedQuestions.length > 0) {
  console.log(
    `Target: ${affectedQuestions.map((question) => question.question_code || question.id).join(', ')}`,
  )
}

if (!shouldApply) {
  console.log('Dry run selesai. Tambahkan --apply untuk menyimpan perubahan.')
} else {
  let updatedQuestions: TwkQuestion[] = []

  try {
    for (const question of affectedQuestions) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('questions')
        .update({ content: question.normalizedContent })
        .eq('id', question.id)
        .eq('type', 'TWK')
        .select('id')

      if (updateError || updatedRows?.length !== 1) {
        throw new Error(
          `Gagal memperbarui ${question.question_code || question.id}: ${updateError?.message || 'baris tidak ditemukan'}`,
        )
      }

      updatedQuestions = [...updatedQuestions, question]
    }
  } catch (updateFailure) {
    console.error('Normalisasi gagal. Mengembalikan soal yang sudah sempat diperbarui...')

    for (const question of [...updatedQuestions].reverse()) {
      const { error: rollbackError } = await supabase
        .from('questions')
        .update({ content: question.content })
        .eq('id', question.id)
        .eq('type', 'TWK')

      if (rollbackError) {
        console.error(
          `Rollback gagal untuk ${question.question_code || question.id}: ${rollbackError.message}`,
        )
      }
    }

    throw updateFailure
  }

  const { data: verificationRows, error: verificationError } = await supabase
    .from('questions')
    .select('id, content')
    .eq('type', 'TWK')

  if (verificationError) {
    throw new Error(`Gagal memverifikasi hasil: ${verificationError.message}`)
  }

  const remainingCount = (verificationRows || []).filter(
    (question) => normalizeQuestionContentSpacing(question.content || '') !== question.content,
  ).length

  if (remainingCount > 0) {
    throw new Error(`Verifikasi gagal: masih ada ${remainingCount} narasi yang belum rapi.`)
  }

  console.log(`Normalisasi berhasil: ${updatedQuestions.length} narasi soal TWK diperbarui.`)
}
