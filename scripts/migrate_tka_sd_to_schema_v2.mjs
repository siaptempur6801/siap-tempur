#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUBJECT_MAP = new Map([
  ['MTK', 'MAT'],
  ['BIND', 'BIN'],
  ['BING', 'BIG'],
])
const SUPPORTED_RESPONSE_TYPES = new Set(['single_choice', 'multiple_choice', 'category'])
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
const authorId = required('TKA_MIGRATION_AUTHOR_ID')

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
      .select('id, question_id, content, is_correct, score_value, image_url, sort_order, response_group, response_group_order')
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

  const { data: author, error: authorError } = await target
    .from('profiles')
    .select('id')
    .eq('id', authorId)
    .maybeSingle()
  if (authorError) throw authorError
  if (!author) throw new Error('TKA_MIGRATION_AUTHOR_NOT_FOUND_IN_TARGET')

  return { program, track, subjects }
}

function validateSource(sourceData, targetCatalog) {
  const errors = []
  const sourceSubjectById = new Map(sourceData.subjects.map((row) => [row.id, row]))
  const targetSubjectCodes = new Set(targetCatalog.subjects.map((row) => row.code))
  const optionCountByQuestion = new Map()
  for (const option of sourceData.options) optionCountByQuestion.set(option.question_id, (optionCountByQuestion.get(option.question_id) ?? 0) + 1)

  for (const subject of sourceData.subjects) {
    const mapped = SUBJECT_MAP.get(subject.code)
    if (!mapped) errors.push(`UNMAPPED_SUBJECT:${subject.code}`)
    else if (!targetSubjectCodes.has(mapped)) errors.push(`TARGET_SUBJECT_MISSING:${mapped}`)
  }
  for (const question of sourceData.questions) {
    if (!SUPPORTED_RESPONSE_TYPES.has(question.response_type)) errors.push(`UNSUPPORTED_RESPONSE_TYPE:${question.question_code}:${question.response_type}`)
    if (!sourceSubjectById.has(question.subject_id)) errors.push(`SOURCE_SUBJECT_MISSING:${question.question_code}`)
    if ((optionCountByQuestion.get(question.id) ?? 0) < 2) errors.push(`QUESTION_OPTIONS_INCOMPLETE:${question.question_code}`)
  }
  if (errors.length) throw new Error(`SOURCE_VALIDATION_FAILED\n${errors.slice(0, 50).join('\n')}`)
}

function summary(sourceData) {
  const byType = {}
  const bySubject = {}
  for (const question of sourceData.questions) {
    byType[question.response_type] = (byType[question.response_type] ?? 0) + 1
    const subject = sourceData.subjects.find((row) => row.id === question.subject_id)?.code ?? 'UNKNOWN'
    bySubject[subject] = (bySubject[subject] ?? 0) + 1
  }
  return {
    questions: sourceData.questions.length,
    options: sourceData.options.length,
    stimuli: sourceData.stimuli.length,
    published: sourceData.questions.filter((row) => String(row.status).toLowerCase() === 'published').length,
    byType,
    bySubject,
  }
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

  const stimulusTargetId = new Map()
  for (const stimulus of sourceData.stimuli) {
    const targetSubject = targetSubjectForSource(stimulus.subject_id)
    const stimulusCode = `LEGACY-TKA-SD-${stimulus.id}`
    const payload = {
      stimulus_code: stimulusCode,
      program_id: targetCatalog.program.id,
      track_id: targetCatalog.track.id,
      subject_id: targetSubject.id,
      title: stimulus.title,
      content: stimulus.content,
      image_url: stimulus.image_url,
      source_reference: stimulus.source,
      status: 'published',
      metadata: { legacy_stimulus_id: stimulus.id, migrated_from: 'legacy_tka_sd' },
      created_by: authorId,
      created_at: stimulus.created_at,
      updated_at: stimulus.updated_at,
    }
    const { data, error } = await target
      .from('question_stimuli')
      .upsert(payload, { onConflict: 'program_id,track_id,subject_id,stimulus_code' })
      .select('id')
      .single()
    if (error) throw error
    stimulusTargetId.set(stimulus.id, data.id)
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
      ? { scoringMode: 'exact_set', legacy_category: question.category, legacy_sub_category: question.sub_category, cognitive_level: question.cognitive_level }
      : question.response_type === 'category'
        ? { scoringMode: 'grouped_sum', legacy_category: question.category, legacy_sub_category: question.sub_category, cognitive_level: question.cognitive_level }
        : { scoringMode: 'single_option', legacy_category: question.category, legacy_sub_category: question.sub_category, cognitive_level: question.cognitive_level }

    const { data: targetQuestion, error: questionError } = await target
      .from('questions')
      .upsert({
        question_code: question.question_code,
        program_id: targetCatalog.program.id,
        track_id: targetCatalog.track.id,
        subject_id: targetSubject.id,
        question_type: question.response_type,
        stem: question.content,
        explanation: question.explanation,
        difficulty: question.difficulty || 'medium',
        source_type: 'legacy_migration',
        source_reference: question.source,
        status: published ? 'published' : String(question.status || 'draft').toLowerCase(),
        version: question.version || 1,
        author_id: authorId,
        reviewer_id: published ? authorId : null,
        published_at: published ? (question.published_at || question.updated_at || question.created_at) : null,
        stimulus_id: question.stimulus_id ? stimulusTargetId.get(question.stimulus_id) ?? null : null,
        stimulus_order: question.stimulus_order || 1,
        response_config: responseConfig,
        created_at: question.created_at,
        updated_at: question.updated_at,
      }, { onConflict: 'question_code' })
      .select('id')
      .single()
    if (questionError) throw questionError

    const legacyOptions = optionsByQuestion.get(question.id) ?? []
    const { error: clearError } = await target.from('question_options').delete().eq('question_id', targetQuestion.id)
    if (clearError) throw clearError
    const { error: optionError } = await target.from('question_options').insert(legacyOptions.map((option, index) => ({
      question_id: targetQuestion.id,
      option_key: question.response_type === 'category' ? `G${option.response_group_order || 1}_${index + 1}` : String.fromCharCode(65 + index),
      content: option.content,
      image_url: option.image_url,
      is_correct: option.is_correct,
      score: option.score_value,
      sort_order: option.sort_order ?? index + 1,
      response_group: option.response_group,
      response_group_order: option.response_group_order,
      metadata: { legacy_option_id: option.id },
    })))
    if (optionError) throw optionError
  }
}

async function reconcile(sourceData, targetCatalog) {
  const sourceCodes = sourceData.questions.map((row) => row.question_code)
  const targetRows = []
  for (const codes of batches(sourceCodes)) {
    const { data, error } = await target
      .from('questions')
      .select('id, question_code, question_type, status, stimulus_id')
      .eq('program_id', targetCatalog.program.id)
      .eq('track_id', targetCatalog.track.id)
      .in('question_code', codes)
    if (error) throw error
    targetRows.push(...data)
  }
  const targetQuestionIds = targetRows.map((row) => row.id)
  let targetOptionCount = 0
  for (const ids of batches(targetQuestionIds)) {
    const { count, error } = await target.from('question_options').select('id', { head: true, count: 'exact' }).in('question_id', ids)
    if (error) throw error
    targetOptionCount += count ?? 0
  }
  const { count: targetStimulusCount, error: stimulusError } = await target
    .from('question_stimuli')
    .select('id', { head: true, count: 'exact' })
    .eq('program_id', targetCatalog.program.id)
    .eq('track_id', targetCatalog.track.id)
    .like('stimulus_code', 'LEGACY-TKA-SD-%')
  if (stimulusError) throw stimulusError

  return {
    questions: targetRows.length,
    options: targetOptionCount,
    stimuli: targetStimulusCount ?? 0,
    byType: targetRows.reduce((acc, row) => ({ ...acc, [row.question_type]: (acc[row.question_type] ?? 0) + 1 }), {}),
    published: targetRows.filter((row) => String(row.status).toLowerCase() === 'published').length,
  }
}

async function main() {
  const [sourceData, targetCatalog] = await Promise.all([loadSource(), loadTargetCatalog()])
  validateSource(sourceData, targetCatalog)
  const sourceSummary = summary(sourceData)
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: sourceSummary }, null, 2))

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply after reviewing the source summary.')
    return
  }

  await migrate(sourceData, targetCatalog)
  const targetSummary = await reconcile(sourceData, targetCatalog)
  console.log(JSON.stringify({ target: targetSummary }, null, 2))

  const mismatch = sourceSummary.questions !== targetSummary.questions ||
    sourceSummary.options !== targetSummary.options ||
    sourceSummary.stimuli !== targetSummary.stimuli ||
    sourceSummary.published !== targetSummary.published
  if (mismatch) throw new Error('TKA_SD_RECONCILIATION_FAILED')
  console.log('TKA SD migration reconciliation PASS.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
