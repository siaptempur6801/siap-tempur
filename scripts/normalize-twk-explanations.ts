import { createClient } from '@supabase/supabase-js'
import { hasLegacyMarkdownFormatting, normalizeQuestionRichText } from '@/lib/question-rich-text'

interface TwkQuestion {
  id: string
  question_code: string | null
  explanation: string
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
  .select('id, question_code, explanation')
  .eq('type', 'TWK')
  .order('question_code')

if (error) {
  throw new Error(`Gagal membaca soal TWK: ${error.message}`)
}

const questions = (data || []) as TwkQuestion[]
const affectedQuestions = questions
  .map((question) => ({
    ...question,
    normalizedExplanation: normalizeQuestionRichText(question.explanation || ''),
  }))
  .filter((question) => question.normalizedExplanation !== question.explanation)

console.log(`TWK ditemukan: ${questions.length}`)
console.log(`Pembahasan perlu dinormalisasi: ${affectedQuestions.length}`)

if (!shouldApply) {
  console.log('Dry run selesai. Tambahkan --apply untuk menyimpan perubahan.')
} else {
  let updatedQuestions: TwkQuestion[] = []

  try {
    for (const question of affectedQuestions) {
      const normalizedExplanation = question.normalizedExplanation

      if (!normalizedExplanation || hasLegacyMarkdownFormatting(normalizedExplanation)) {
        throw new Error(
          `Hasil normalisasi tidak valid untuk ${question.question_code || question.id}.`,
        )
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('questions')
        .update({ explanation: normalizedExplanation })
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
        .update({ explanation: question.explanation })
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
    .select('id, explanation')
    .eq('type', 'TWK')

  if (verificationError) {
    throw new Error(`Gagal memverifikasi hasil: ${verificationError.message}`)
  }

  const remainingLegacyCount = (verificationRows || []).filter(
    (question) => normalizeQuestionRichText(question.explanation || '') !== question.explanation,
  ).length

  if (remainingLegacyCount > 0) {
    throw new Error(
      `Verifikasi gagal: masih ada ${remainingLegacyCount} pembahasan yang belum rapi.`,
    )
  }

  console.log(`Normalisasi berhasil: ${updatedQuestions.length} pembahasan TWK diperbarui.`)
}
