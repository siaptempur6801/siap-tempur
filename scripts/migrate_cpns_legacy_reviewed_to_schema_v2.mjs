import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = process.env.CPNS_LEGACY_SOURCE_SUPABASE_URL
const SOURCE_KEY = process.env.CPNS_LEGACY_SOURCE_SERVICE_ROLE_KEY
const STAGING_URL = process.env.CPNS_SCHEMA_V2_STAGING_SUPABASE_URL
const STAGING_KEY = process.env.CPNS_SCHEMA_V2_STAGING_SERVICE_ROLE_KEY
const REVIEWER_USER_ID = process.env.CPNS_MAPPING_REVIEWER_USER_ID

const args = new Set(process.argv.slice(2))
const importReviewed = args.has('--import-reviewed')
const publish = args.has('--publish')
const publishConfirmation = process.argv
  .find((arg) => arg.startsWith('--confirm-publish='))
  ?.split('=')[1]
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1]
const batchLimit = limitArg ? Number.parseInt(limitArg, 10) : 500

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
}

requireEnv('CPNS_LEGACY_SOURCE_SUPABASE_URL', SOURCE_URL)
requireEnv('CPNS_LEGACY_SOURCE_SERVICE_ROLE_KEY', SOURCE_KEY)
requireEnv('CPNS_SCHEMA_V2_STAGING_SUPABASE_URL', STAGING_URL)
requireEnv('CPNS_SCHEMA_V2_STAGING_SERVICE_ROLE_KEY', STAGING_KEY)
requireEnv('CPNS_MAPPING_REVIEWER_USER_ID', REVIEWER_USER_ID)

if (SOURCE_URL === STAGING_URL) {
  throw new Error('Source and staging Supabase URLs must be different. Refusing to run.')
}

if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 500) {
  throw new Error('--limit must be an integer between 1 and 500')
}

if (publish && !importReviewed) {
  throw new Error('--publish is only valid together with --import-reviewed')
}

if (publish && publishConfirmation !== 'STAGING_ONLY') {
  throw new Error('Publishing requires explicit --confirm-publish=STAGING_ONLY')
}

const source = createClient(SOURCE_URL, SOURCE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const staging = createClient(STAGING_URL, STAGING_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function chunk(values, size) {
  const result = []
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size))
  return result
}

async function loadReviewDecisions() {
  const text = await readFile(
    new URL('../data/cpns_legacy_mapping_review_v1.json', import.meta.url),
    'utf8',
  )
  const artifact = JSON.parse(text)
  const decisionByCode = new Map()

  for (const group of artifact.groups ?? []) {
    if (!['TWK', 'TIU', 'TKP'].includes(group.subject)) {
      throw new Error(`Invalid subject in review artifact: ${group.subject}`)
    }
    if (!['reviewed', 'needs_revision', 'blocked'].includes(group.status)) {
      throw new Error(`Invalid review status in review artifact: ${group.status}`)
    }
    if (group.status === 'reviewed' && !group.primary) {
      throw new Error(`Reviewed group is missing a primary node for subject ${group.subject}`)
    }
    if (group.status !== 'reviewed' && (group.primary || group.secondary)) {
      throw new Error(`Unresolved review group must not contain nodes for subject ${group.subject}`)
    }

    for (const questionCode of group.questionCodes ?? []) {
      if (decisionByCode.has(questionCode)) {
        throw new Error(`Duplicate question code in review artifact: ${questionCode}`)
      }

      decisionByCode.set(questionCode, {
        subject: group.subject,
        status: group.status,
        primary: group.primary ?? null,
        secondary: group.secondary ?? null,
        method: artifact.defaultReviewMethod ?? 'manual_semantic_review',
        note:
          artifact.needsRevisionNotes?.[questionCode] ??
          artifact.defaultReviewedNote ??
          'Explicit source-controlled manual semantic review decision.',
      })
    }
  }

  if (decisionByCode.size !== artifact.expectedQuestionCount) {
    throw new Error(
      `Review artifact count mismatch: expected ${artifact.expectedQuestionCount}, expanded ${decisionByCode.size}`,
    )
  }

  return { artifact, decisionByCode }
}

async function getImportSummary() {
  const { data, error } = await staging.rpc('get_cpns_legacy_import_summary')
  if (error) throw error
  const summary = Array.isArray(data) ? data[0] : data
  if (!summary) throw new Error('Staging import summary RPC returned no row')
  return summary
}

async function fetchSourceQuestions() {
  const { data: program, error: programError } = await source
    .from('programs')
    .select('id,slug')
    .eq('slug', 'cpns')
    .single()
  if (programError) throw programError

  const { data: subjects, error: subjectError } = await source.from('subjects').select('id,code')
  if (subjectError) throw subjectError
  const subjectCodeById = new Map(subjects.map((row) => [row.id, row.code]))

  const allQuestions = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await source
      .from('questions')
      .select(
        [
          'id',
          'question_code',
          'subject_id',
          'content',
          'category',
          'sub_category',
          'explanation',
          'response_type',
          'difficulty',
          'cognitive_level',
          'source',
          'status',
          'version',
          'created_at',
          'updated_at',
          'published_at',
          'image_url',
        ].join(','),
      )
      .eq('program_id', program.id)
      .order('question_code', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    allQuestions.push(...data)
    if (data.length < pageSize) break
  }

  const optionMap = new Map()
  for (const ids of chunk(
    allQuestions.map((row) => row.id),
    100,
  )) {
    const { data: options, error } = await source
      .from('options')
      .select(
        'id,question_id,content,is_correct,score_value,image_url,sort_order,response_group,response_group_order,created_at',
      )
      .in('question_id', ids)
      .order('sort_order', { ascending: true })
    if (error) throw error

    for (const option of options) {
      const list = optionMap.get(option.question_id) ?? []
      list.push(option)
      optionMap.set(option.question_id, list)
    }
  }

  return allQuestions.map((question) => {
    const subject = subjectCodeById.get(question.subject_id)
    if (!['TWK', 'TIU', 'TKP'].includes(subject)) {
      throw new Error(`Unexpected CPNS subject for ${question.question_code}: ${subject}`)
    }

    const options = optionMap.get(question.id) ?? []
    if (options.length !== 5) {
      throw new Error(`Expected 5 options for ${question.question_code}, got ${options.length}`)
    }

    return { question, subject, options }
  })
}

function reconcileSourceWithReviewArtifact(items, artifact, decisionByCode) {
  if (items.length !== artifact.expectedQuestionCount) {
    throw new Error(
      `Source CPNS question count (${items.length}) does not match review artifact (${artifact.expectedQuestionCount}). Review the delta before migrating.`,
    )
  }

  const sourceCodes = new Set(items.map((item) => item.question.question_code))

  for (const item of items) {
    const decision = decisionByCode.get(item.question.question_code)
    if (!decision) {
      throw new Error(
        `Source question has no explicit review decision: ${item.question.question_code}`,
      )
    }
    if (decision.subject !== item.subject) {
      throw new Error(
        `Review artifact subject mismatch for ${item.question.question_code}: ${decision.subject} vs source ${item.subject}`,
      )
    }
  }

  for (const questionCode of decisionByCode.keys()) {
    if (!sourceCodes.has(questionCode)) {
      throw new Error(`Review artifact contains a question absent from source: ${questionCode}`)
    }
  }
}

async function syncReviewDecision(item, decision) {
  const { error } = await staging.rpc('upsert_cpns_legacy_mapping_review', {
    p_source_question_id: item.question.id,
    p_source_question_code: item.question.question_code,
    p_subject_code: item.subject,
    p_legacy_category: item.question.category,
    p_legacy_sub_category: item.question.sub_category,
    p_primary_node_code: decision.primary,
    p_secondary_node_code: decision.secondary,
    p_review_status: decision.status,
    p_review_method: decision.method,
    p_review_notes: decision.note,
    p_reviewed_by: REVIEWER_USER_ID,
  })

  if (error) {
    throw new Error(
      `Failed to sync review decision for ${item.question.question_code}: ${error.message}`,
    )
  }
}

async function syncReviewRegistry(items, decisionByCode) {
  let completed = 0
  for (const group of chunk(items, 10)) {
    await Promise.all(
      group.map((item) =>
        syncReviewDecision(item, decisionByCode.get(item.question.question_code)),
      ),
    )
    completed += group.length
    console.log(`Synced review registry ${completed}/${items.length}`)
  }
}

function parseLegacyQuestionImagePath(url) {
  if (!url) return null
  const marker = '/storage/v1/object/public/question-images/'
  const index = url.indexOf(marker)
  if (index < 0) {
    throw new Error(`Unsupported legacy question image URL: ${url}`)
  }
  return decodeURIComponent(url.slice(index + marker.length))
}

async function migrateQuestionAsset(question) {
  if (!question.image_url) return null

  const sourcePath = parseLegacyQuestionImagePath(question.image_url)
  const fileName = sourcePath.split('/').pop()
  const destinationPath = `legacy-cpns/${question.question_code}/${fileName}`

  const { data: blob, error: downloadError } = await source.storage
    .from('question-images')
    .download(sourcePath)
  if (downloadError)
    throw new Error(
      `Failed to download image for ${question.question_code}: ${downloadError.message}`,
    )

  const { error: uploadError } = await staging.storage
    .from('question-images')
    .upload(destinationPath, blob, {
      upsert: true,
      contentType: blob.type || undefined,
      cacheControl: '3600',
    })
  if (uploadError)
    throw new Error(`Failed to upload image for ${question.question_code}: ${uploadError.message}`)

  return destinationPath
}

function buildPayload(question, subject, options, canonicalAssetStoragePath) {
  return {
    sourceQuestionId: question.id,
    questionCode: question.question_code,
    subject,
    stem: question.content,
    legacyCategory: question.category,
    legacySubCategory: question.sub_category,
    explanation: question.explanation,
    responseType: question.response_type,
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitive_level,
    source: question.source,
    status: question.status,
    version: question.version,
    createdAt: question.created_at,
    updatedAt: question.updated_at,
    publishedAt: question.published_at,
    imageUrl: question.image_url,
    canonicalAssetStoragePath,
    options: options.map((option) => ({
      id: option.id,
      content: option.content,
      isCorrect: option.is_correct,
      score: option.score_value,
      imageUrl: option.image_url,
      sortOrder: option.sort_order,
      responseGroup: option.response_group,
      responseGroupOrder: option.response_group_order,
      createdAt: option.created_at,
    })),
  }
}

async function stageQuestion(item) {
  const canonicalAssetStoragePath = await migrateQuestionAsset(item.question)
  const payload = buildPayload(item.question, item.subject, item.options, canonicalAssetStoragePath)
  const { error } = await staging.rpc('stage_cpns_legacy_question', {
    p_source_question_id: item.question.id,
    p_source_question_code: item.question.question_code,
    p_payload: payload,
  })
  if (error) throw new Error(`Failed to stage ${item.question.question_code}: ${error.message}`)
}

async function stageAll(items) {
  let completed = 0
  for (const group of chunk(items, 10)) {
    await Promise.all(group.map(stageQuestion))
    completed += group.length
    console.log(`Staged ${completed}/${items.length}`)
  }
}

async function importReadyBatch() {
  const { data, error } = await staging.rpc('import_reviewed_cpns_legacy_batch', {
    p_publish: publish,
    p_limit: batchLimit,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

async function main() {
  console.log(
    'CPNS legacy migration mode:',
    importReviewed
      ? publish
        ? 'sync review + stage + import + publish on staging'
        : 'sync review + stage + import as draft'
      : 'sync review + stage only',
  )

  const { artifact, decisionByCode } = await loadReviewDecisions()
  const sourceQuestions = await fetchSourceQuestions()
  reconcileSourceWithReviewArtifact(sourceQuestions, artifact, decisionByCode)
  console.log(`Source + explicit review artifact reconciled: ${sourceQuestions.length}`)

  await syncReviewRegistry(sourceQuestions, decisionByCode)

  const beforeStage = await getImportSummary()
  console.log('After review sync:', beforeStage)

  if (Number(beforeStage.registry_total) !== artifact.expectedQuestionCount) {
    throw new Error(
      `Registry reconciliation failed after sync: expected ${artifact.expectedQuestionCount}, got ${beforeStage.registry_total}`,
    )
  }

  const expectedNeedsRevision = [...decisionByCode.values()].filter(
    (decision) => decision.status === 'needs_revision',
  ).length
  if (Number(beforeStage.needs_revision) !== expectedNeedsRevision) {
    throw new Error(
      `Review-status reconciliation failed: expected ${expectedNeedsRevision} needs_revision, got ${beforeStage.needs_revision}`,
    )
  }

  await stageAll(sourceQuestions)

  const staged = await getImportSummary()
  console.log('After staging:', staged)

  if (Number(staged.raw_staged) !== sourceQuestions.length) {
    throw new Error(
      `Raw stage reconciliation failed: expected ${sourceQuestions.length}, got ${staged.raw_staged}`,
    )
  }

  const expectedReady = [...decisionByCode.values()].filter(
    (decision) => decision.status === 'reviewed',
  ).length
  if (Number(staged.import_ready) !== expectedReady) {
    throw new Error(
      `Import-ready reconciliation failed: expected ${expectedReady}, got ${staged.import_ready}. Check reviewed mappings and canonical assets.`,
    )
  }

  if (!importReviewed) {
    console.log('Stage-only run complete. No canonical questions were imported.')
    return
  }

  const importResult = await importReadyBatch()
  console.log('Import batch:', importResult)

  const after = await getImportSummary()
  console.log('After import:', after)

  if (Number(importResult.remaining_ready_count) !== 0 && batchLimit >= expectedReady) {
    throw new Error(
      `Import reconciliation failed: ${importResult.remaining_ready_count} reviewed staged questions remain ready but unimported`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
