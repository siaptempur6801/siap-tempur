#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUBJECT_MAP = new Map([
  ['MTK', 'MAT'],
  ['BIND', 'BIN'],
  ['BING', 'BIG'],
])
const SUPPORTED_RESPONSE_TYPES = new Set(['single_choice', 'multiple_choice', 'category'])
const EXPECTED = {
  questions: 213,
  options: 914,
  stimuli: 33,
  explanations: 213,
  published: 202,
  byType: { single_choice: 153, multiple_choice: 29, category: 31 },
  bySubject: { MTK: 70, BIND: 83, BING: 60 },
}
const apply = process.argv.includes('--apply')

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_REQUIRED`)
  return value
}

const source = createClient(
  required('TKA_MIGRATION_SOURCE_URL'),
  required('TKA_MIGRATION_SOURCE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
)
const target = createClient(
  required('TKA_MIGRATION_TARGET_URL'),
  required('TKA_MIGRATION_TARGET_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
)
const actorId = required('TKA_MIGRATION_ACTOR_ID')

function batches(rows, size = 100) {
  const result = []
  for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size))
  return result
}

async function one(query, label) {
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`${label}_NOT_FOUND`)
  return data
}

async function loadSource() {
  const program = await one(
    source.from('programs').select('id, slug, name').eq('slug', 'tka-sd'),
    'SOURCE_TKA_SD_PROGRAM',
  )
  const { data: subjects, error: subjectError } = await source
    .from('subjects')
    .select('id, code, name')
    .eq('program_id', program.id)
  if (subjectError) throw subjectError

  const subjectIds = subjects.map((row) => row.id)
  const { data: questions, error: questionError } = await source
    .from('questions')
    .select('id, question_code, subject_id, content, explanation, category, sub_category, image_url, status, version, response_type, cognitive_level, difficulty, source, stimulus_id, stimulus_order, created_at, updated_at, published_at')
    .eq('program_id', program.id)
    .in('subject_id', subjectIds)
    .order('question_code')
  if (questionError) throw questionError

  const questionIds = questions.map((row) => row.id)
  const options = []
  for (const ids of batches(questionIds)) {
    const { data, error } = await source
      .from('options')
      .select('id, question_id, content, is_correct, score_value, image_url, sort_order, response_group, response_group_order, created_at')
      .in('question_id', ids)
      .order('sort_order')
    if (error) throw error
    options.push(...data)
  }

  const stimulusIds = Array.from(new Set(questions.map((row) => row.stimulus_id).filter(Boolean)))
  const stimuli = []
  for (const ids of batches(stimulusIds)) {
    const { data, error } = await source
      .from('question_stimuli')
      .select('id, program_id, subject_id, title, content, image_url, source, created_at, updated_at')
      .in('id', ids)
    if (error) throw error
    stimuli.push(...data)
  }

  return { program, subjects, questions, options, stimuli }
}

async function loadTargetCatalog() {
  const program = await one(
    target.from('programs').select('id, code, name').eq('code', 'TKA'),
    'TARGET_TKA_PROGRAM',
  )
  const track = await one(
    target.from('tracks').select('id, code, name').eq('program_id', program.id).eq('code', 'SD'),
    'TARGET_TKA_SD_TRACK',
  )
  const { data: subjects, error } = await target
    .from('subjects')
    .select('id, code, name')
    .eq('track_id', track.id)
  if (error) throw error

  const actor = await one(
    target.from('profiles').select('id, status').eq('id', actorId),
    'TKA_MIGRATION_ACTOR',
  )
  if (String(actor.status).toLowerCase() !== 'active') throw new Error('TKA_MIGRATION_ACTOR_INACTIVE')

  return { program, track, subjects }
}

function sourceSummary(sourceData) {
  const byType = {}
  const bySubject = {}
  const subjectById = new Map(sourceData.subjects.map((row) => [row.id, row]))
  for (const question of sourceData.questions) {
    byType[question.response_type] = (byType[question.response_type] ?? 0) + 1
    const subject = subjectById.get(question.subject_id)?.code ?? 'UNKNOWN'
    bySubject[subject] = (bySubject[subject] ?? 0) + 1
  }
  return {
    questions: sourceData.questions.length,
    options: sourceData.options.length,
    stimuli: sourceData.stimuli.length,
    explanations: sourceData.questions.filter((row) => typeof row.explanation === 'string' && row.explanation.trim()).length,
    published: sourceData.questions.filter((row) => String(row.status).toLowerCase() === 'published').length,
    byType,
    bySubject,
  }
}

function assertExactSummary(actual) {
  const errors = []
  for (const key of ['questions', 'options', 'stimuli', 'explanations', 'published']) {
    if (actual[key] !== EXPECTED[key]) errors.push(`${key}:${actual[key]}!=${EXPECTED[key]}`)
  }
  for (const [key, value] of Object.entries(EXPECTED.byType)) {
    if ((actual.byType[key] ?? 0) !== value) errors.push(`type.${key}:${actual.byType[key] ?? 0}!=${value}`)
  }
  for (const [key, value] of Object.entries(EXPECTED.bySubject)) {
    if ((actual.bySubject[key] ?? 0) !== value) errors.push(`subject.${key}:${actual.bySubject[key] ?? 0}!=${value}`)
  }
  if (errors.length) throw new Error(`SOURCE_RECONCILIATION_MISMATCH\n${errors.join('\n')}`)
}

function validateSource(sourceData, targetCatalog) {
  const errors = []
  const sourceSubjectById = new Map(sourceData.subjects.map((row) => [row.id, row]))
  const targetSubjectCodes = new Set(targetCatalog.subjects.map((row) => row.code))
  const optionsByQuestion = new Map()
  for (const option of sourceData.options) {
    const rows = optionsByQuestion.get(option.question_id) ?? []
    rows.push(option)
    optionsByQuestion.set(option.question_id, rows)
  }

  for (const subject of sourceData.subjects) {
    const mapped = SUBJECT_MAP.get(subject.code)
    if (!mapped) errors.push(`UNMAPPED_SUBJECT:${subject.code}`)
    else if (!targetSubjectCodes.has(mapped)) errors.push(`TARGET_SUBJECT_MISSING:${mapped}`)
  }
  for (const question of sourceData.questions) {
    if (!SUPPORTED_RESPONSE_TYPES.has(question.response_type)) errors.push(`UNSUPPORTED_RESPONSE_TYPE:${question.question_code}:${question.response_type}`)
    if (!sourceSubjectById.has(question.subject_id)) errors.push(`SOURCE_SUBJECT_MISSING:${question.question_code}`)
    const options = optionsByQuestion.get(question.id) ?? []
    if (options.length < 2) errors.push(`QUESTION_OPTIONS_INCOMPLETE:${question.question_code}`)
    if (question.response_type === 'single_choice' && options.filter((row) => row.is_correct === true).length !== 1) {
      errors.push(`SINGLE_CHOICE_KEY_INVALID:${question.question_code}`)
    }
    if (question.response_type === 'multiple_choice' && options.filter((row) => row.is_correct === true).length < 1) {
      errors.push(`MULTIPLE_CHOICE_KEY_INVALID:${question.question_code}`)
    }
    if (question.response_type === 'category') {
      if (options.some((row) => !row.response_group || !row.response_group_order)) errors.push(`CATEGORY_GROUP_INVALID:${question.question_code}`)
    }
  }
  if (errors.length) throw new Error(`SOURCE_VALIDATION_FAILED\n${errors.slice(0, 100).join('\n')}`)
  assertExactSummary(sourceSummary(sourceData))
}

async function migrate(sourceData, targetCatalog) {
  const sourceSubjectById = new Map(sourceData.subjects.map((row) => [row.id, row]))
  const targetSubjectByCode = new Map(targetCatalog.subjects.map((row) => [row.code, row]))
  const targetSubjectForSource = (sourceSubjectId) => {
    const sourceSubject = sourceSubjectById.get(sourceSubjectId)
    const targetCode = SUBJECT_MAP.get(sourceSubject?.code)
    const targetSubject = targetSubjectByCode.get(targetCode)
    if (!targetSubject) throw new Error(`TARGET_SUBJECT_RESOLUTION_FAILED:${sourceSubject?.code}`)
    return targetSubject
  }

  for (const stimulus of sourceData.stimuli) {
    const targetSubject = targetSubjectForSource(stimulus.subject_id)
    const { error } = await target.from('question_stimuli').upsert({
      id: stimulus.id,
      stimulus_code: `LEGACY-TKA-SD-${stimulus.id}`,
      program_id: targetCatalog.program.id,
      track_id: targetCatalog.track.id,
      subject_id: targetSubject.id,
      title: stimulus.title,
      content: stimulus.content,
      image_url: stimulus.image_url,
      source_reference: stimulus.source,
      status: 'published',
      metadata: { legacy_stimulus_id: stimulus.id, migrated_from: 'legacy_tka_sd' },
      created_by: actorId,
      created_at: stimulus.created_at,
      updated_at: stimulus.updated_at || stimulus.created_at,
    }, { onConflict: 'id' })
    if (error) throw error
  }

  const optionsByQuestion = new Map()
  for (const option of sourceData.options) {
    const rows = optionsByQuestion.get(option.question_id) ?? []
    rows.push(option)
    optionsByQuestion.set(option.question_id, rows)
  }

  for (const question of sourceData.questions) {
    const targetSubject = targetSubjectForSource(question.subject_id)
    const published = String(question.status).toLowerCase() === 'published'
    const responseConfig = question.response_type === 'multiple_choice'
      ? { scoringMode: 'exact_set', legacyCategory: question.category, legacySubCategory: question.sub_category }
      : question.response_type === 'category'
        ? { scoringMode: 'grouped_sum', legacyCategory: question.category, legacySubCategory: question.sub_category }
        : { scoringMode: 'single_option', legacyCategory: question.category, legacySubCategory: question.sub_category }

    const { error: questionError } = await target.from('questions').upsert({
      id: question.id,
      question_code: question.question_code || `LEGACY-TKA-SD-${question.id}`,
      program_id: targetCatalog.program.id,
      track_id: targetCatalog.track.id,
      subject_id: targetSubject.id,
      question_type: question.response_type,
      stem: question.content,
      difficulty: question.difficulty || 'medium',
      cognitive_level: question.cognitive_level,
      source_type: 'legacy_migration',
      source_reference: question.source,
      status: published ? 'published' : String(question.status || 'draft').toLowerCase(),
      version: question.version || 1,
      author_id: actorId,
      reviewer_id: null,
      published_at: published ? (question.published_at || question.updated_at || question.created_at) : null,
      stimulus_id: question.stimulus_id || null,
      stimulus_order: question.stimulus_order || 1,
      response_config: responseConfig,
      created_at: question.created_at,
      updated_at: question.updated_at || question.created_at,
    }, { onConflict: 'id' })
    if (questionError) throw questionError

    const legacyOptions = optionsByQuestion.get(question.id) ?? []
    const legacyOptionIds = new Set(legacyOptions.map((row) => row.id))
    const { data: currentOptions, error: currentOptionError } = await target
      .from('question_options')
      .select('id')
      .eq('question_id', question.id)
    if (currentOptionError) throw currentOptionError
    const staleIds = (currentOptions ?? []).map((row) => row.id).filter((id) => !legacyOptionIds.has(id))
    if (staleIds.length) {
      const { error } = await target.from('question_options').delete().in('id', staleIds)
      if (error) throw error
    }

    for (const [index, option] of legacyOptions.entries()) {
      const { error } = await target.from('question_options').upsert({
        id: option.id,
        question_id: question.id,
        option_key: question.response_type === 'category'
          ? `G${option.response_group_order || 1}_${index + 1}`
          : String.fromCharCode(65 + index),
        content: option.content,
        image_url: option.image_url,
        is_correct: option.is_correct,
        score: option.score_value,
        sort_order: option.sort_order ?? index + 1,
        response_group: option.response_group,
        response_group_order: option.response_group_order,
        metadata: { legacy_option_id: option.id },
        created_at: option.created_at,
      }, { onConflict: 'id' })
      if (error) throw error
    }

    if (typeof question.explanation === 'string' && question.explanation.trim()) {
      const { error: deleteExplanationError } = await target
        .from('question_explanations')
        .delete()
        .eq('question_id', question.id)
      if (deleteExplanationError) throw deleteExplanationError
      const { error: explanationError } = await target.from('question_explanations').insert({
        question_id: question.id,
        content: question.explanation.trim(),
        format: 'markdown',
        version: question.version || 1,
        created_at: question.created_at,
        updated_at: question.updated_at || question.created_at,
      })
      if (explanationError) throw explanationError
    }
  }
}

async function reconcile(sourceData, targetCatalog) {
  const sourceIds = sourceData.questions.map((row) => row.id)
  const targetRows = []
  for (const ids of batches(sourceIds)) {
    const { data, error } = await target
      .from('questions')
      .select('id, question_type, status, stimulus_id')
      .eq('program_id', targetCatalog.program.id)
      .eq('track_id', targetCatalog.track.id)
      .in('id', ids)
    if (error) throw error
    targetRows.push(...data)
  }

  let targetOptionCount = 0
  let explanationCount = 0
  for (const ids of batches(sourceIds)) {
    const [{ count: optionCount, error: optionError }, { count: explanationBatch, error: explanationError }] = await Promise.all([
      target.from('question_options').select('id', { head: true, count: 'exact' }).in('question_id', ids),
      target.from('question_explanations').select('id', { head: true, count: 'exact' }).in('question_id', ids),
    ])
    if (optionError) throw optionError
    if (explanationError) throw explanationError
    targetOptionCount += optionCount ?? 0
    explanationCount += explanationBatch ?? 0
  }

  const sourceStimulusIds = sourceData.stimuli.map((row) => row.id)
  let targetStimulusCount = 0
  for (const ids of batches(sourceStimulusIds)) {
    const { count, error } = await target.from('question_stimuli').select('id', { head: true, count: 'exact' }).in('id', ids)
    if (error) throw error
    targetStimulusCount += count ?? 0
  }

  return {
    questions: targetRows.length,
    options: targetOptionCount,
    stimuli: targetStimulusCount,
    explanations: explanationCount,
    published: targetRows.filter((row) => String(row.status).toLowerCase() === 'published').length,
    byType: targetRows.reduce((acc, row) => ({ ...acc, [row.question_type]: (acc[row.question_type] ?? 0) + 1 }), {}),
  }
}

async function main() {
  const [sourceData, targetCatalog] = await Promise.all([loadSource(), loadTargetCatalog()])
  validateSource(sourceData, targetCatalog)
  const source = sourceSummary(sourceData)
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', actorId, source }, null, 2))

  if (!apply) {
    console.log('TKA SD dry-run PASS. Re-run with --apply to migrate after reviewing this summary.')
    return
  }

  await migrate(sourceData, targetCatalog)
  const targetSummary = await reconcile(sourceData, targetCatalog)
  console.log(JSON.stringify({ target: targetSummary }, null, 2))

  const comparable = { ...targetSummary, bySubject: EXPECTED.bySubject }
  assertExactSummary(comparable)
  console.log('TKA SD migration reconciliation PASS.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
