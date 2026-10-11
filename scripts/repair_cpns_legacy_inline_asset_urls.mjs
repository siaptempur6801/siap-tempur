import { createClient } from '@supabase/supabase-js'

const STAGING_URL = process.env.CPNS_SCHEMA_V2_STAGING_SUPABASE_URL
const STAGING_KEY = process.env.CPNS_SCHEMA_V2_STAGING_SERVICE_ROLE_KEY

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
}

requireEnv('CPNS_SCHEMA_V2_STAGING_SUPABASE_URL', STAGING_URL)
requireEnv('CPNS_SCHEMA_V2_STAGING_SERVICE_ROLE_KEY', STAGING_KEY)

const targetOrigin = new URL(STAGING_URL).origin
const storagePrefix = `${targetOrigin}/storage/v1/object/public/question-images/`
const inlineImagePattern =
  /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/question-images\/([^\]\s"'<>]+)/gi

const staging = createClient(STAGING_URL, STAGING_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function chunk(values, size) {
  const result = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

function isCpnsLegacySourceReference(value) {
  return typeof value === 'string' && /^(TWK|TIU|TKP)-/.test(value)
}

function encodeStoragePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function rewriteInlineQuestionImageUrls(text, questionCode) {
  if (!text || !text.includes('/storage/v1/object/public/question-images/')) {
    return { text, storagePaths: [] }
  }

  const storagePaths = []
  const rewritten = text.replace(inlineImagePattern, (_url, rawPath) => {
    const decodedPath = decodeURIComponent(rawPath)
    const fileName = decodedPath.split('/').filter(Boolean).pop()
    if (!fileName) {
      throw new Error(`Unable to derive inline asset filename for ${questionCode}`)
    }

    const destinationPath = `legacy-cpns/${questionCode}/${fileName}`
    storagePaths.push(destinationPath)
    return `${storagePrefix}${encodeStoragePath(destinationPath)}`
  })

  return { text: rewritten, storagePaths }
}

async function loadLegacyQuestions() {
  const { data, error } = await staging
    .from('questions')
    .select('id,question_code,stem,source_type,source_reference')
    .eq('source_type', 'legacy_migration')
    .order('question_code', { ascending: true })

  if (error) throw error

  return data.filter((row) => isCpnsLegacySourceReference(row.source_reference))
}

async function loadExplanations(questionIds) {
  const rows = []
  for (const ids of chunk(questionIds, 100)) {
    const { data, error } = await staging
      .from('question_explanations')
      .select('id,question_id,content')
      .in('question_id', ids)

    if (error) throw error
    rows.push(...data)
  }
  return rows
}

async function verifyStoragePaths(paths) {
  const uniquePaths = [...new Set(paths)]
  const byFolder = new Map()

  for (const path of uniquePaths) {
    const parts = path.split('/')
    const fileName = parts.pop()
    const folder = parts.join('/')
    const names = byFolder.get(folder) ?? new Set()
    names.add(fileName)
    byFolder.set(folder, names)
  }

  for (const [folder, expectedNames] of byFolder.entries()) {
    const { data, error } = await staging.storage
      .from('question-images')
      .list(folder, { limit: 100 })

    if (error) throw new Error(`Unable to list ${folder}: ${error.message}`)
    const actualNames = new Set((data ?? []).map((item) => item.name))
    const missing = [...expectedNames].filter((name) => !actualNames.has(name))
    if (missing.length) {
      throw new Error(`Missing canonical inline assets in ${folder}: ${missing.join(', ')}`)
    }
  }
}

function assertNoForeignInlineAssetUrls(text, questionCode, location) {
  if (!text) return
  const urls = [
    ...text.matchAll(
      /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/question-images\/[^\]\s"'<>]+/gi,
    ),
  ].map((match) => match[0])
  const foreign = urls.filter((url) => !url.startsWith(storagePrefix))
  if (foreign.length) {
    throw new Error(`${questionCode} still contains a foreign inline asset URL in ${location}`)
  }
}

async function main() {
  const questions = await loadLegacyQuestions()
  const explanations = await loadExplanations(questions.map((row) => row.id))
  const explanationByQuestionId = new Map(explanations.map((row) => [row.question_id, row]))

  const repairs = []
  const requiredPaths = []

  for (const question of questions) {
    const stemResult = rewriteInlineQuestionImageUrls(question.stem, question.question_code)
    const explanation = explanationByQuestionId.get(question.id)
    const explanationResult = rewriteInlineQuestionImageUrls(
      explanation?.content ?? null,
      question.question_code,
    )

    requiredPaths.push(...stemResult.storagePaths, ...explanationResult.storagePaths)

    if (
      stemResult.text !== question.stem ||
      explanationResult.text !== (explanation?.content ?? null)
    ) {
      repairs.push({
        question,
        explanation,
        stem: stemResult.text,
        explanationContent: explanationResult.text,
      })
    }
  }

  await verifyStoragePaths(requiredPaths)

  let questionUpdates = 0
  let explanationUpdates = 0

  for (const repair of repairs) {
    if (repair.stem !== repair.question.stem) {
      const { error } = await staging
        .from('questions')
        .update({ stem: repair.stem })
        .eq('id', repair.question.id)
        .eq('source_type', 'legacy_migration')
      if (error)
        throw new Error(
          `Failed to repair stem for ${repair.question.question_code}: ${error.message}`,
        )
      questionUpdates += 1
    }

    if (repair.explanation && repair.explanationContent !== repair.explanation.content) {
      const { error } = await staging
        .from('question_explanations')
        .update({ content: repair.explanationContent })
        .eq('id', repair.explanation.id)
        .eq('question_id', repair.question.id)
      if (error)
        throw new Error(
          `Failed to repair explanation for ${repair.question.question_code}: ${error.message}`,
        )
      explanationUpdates += 1
    }
  }

  const refreshedQuestions = await loadLegacyQuestions()
  const refreshedExplanations = await loadExplanations(refreshedQuestions.map((row) => row.id))
  const refreshedExplanationByQuestionId = new Map(
    refreshedExplanations.map((row) => [row.question_id, row]),
  )

  for (const question of refreshedQuestions) {
    assertNoForeignInlineAssetUrls(question.stem, question.question_code, 'stem')
    assertNoForeignInlineAssetUrls(
      refreshedExplanationByQuestionId.get(question.id)?.content ?? null,
      question.question_code,
      'explanation',
    )
  }

  console.log(
    `CPNS inline asset repair complete: ${questionUpdates} stems, ${explanationUpdates} explanations, ${new Set(requiredPaths).size} canonical inline assets verified`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
