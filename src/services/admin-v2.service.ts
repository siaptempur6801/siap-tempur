import { randomUUID } from 'node:crypto'
import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'
import {
    catalogContextService,
    CPNS_SKD_CONTEXT,
    type ProgramTrackContext,
} from '@/src/services/catalog-context.service'

export type AdminQuestionOptionInput = {
    key: string
    content: string
    isCorrect: boolean | null
    score: number | null
    sortOrder: number
    responseGroup?: string | null
    responseGroupOrder?: number | null
}

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function nowIso() {
    return new Date().toISOString()
}

function sameId(left: unknown, right: unknown) {
    return String(left ?? '') === String(right ?? '')
}

function validPositive(value: number | null | undefined) {
    return value === null || value === undefined || (Number.isFinite(value) && value > 0)
}

function validNonNegative(value: number | null | undefined) {
    return value === null || value === undefined || (Number.isFinite(value) && value >= 0)
}

function contextOrDefault(context?: ProgramTrackContext) {
    return context ?? CPNS_SKD_CONTEXT
}

function validateQuestionOptions(questionType: string, options: AdminQuestionOptionInput[]) {
    if (options.length < 2) throw new Error('QUESTION_OPTIONS_REQUIRED')
    const normalizedKeys = options.map((option) => option.key.trim().toUpperCase())
    if (new Set(normalizedKeys).size !== normalizedKeys.length) throw new Error('QUESTION_OPTION_KEYS_DUPLICATE')
    if (options.some((option) => !option.content.trim())) throw new Error('QUESTION_OPTION_CONTENT_REQUIRED')
    if (options.some((option) => option.score !== null && (!Number.isFinite(option.score) || option.score < 0))) {
        throw new Error('QUESTION_OPTION_SCORE_INVALID')
    }

    const type = questionType.toLowerCase()
    if (type === 'single_choice') {
        if (options.filter((option) => option.isCorrect === true).length !== 1) {
            throw new Error('QUESTION_CORRECT_OPTION_REQUIRED')
        }
        return
    }
    if (type === 'multiple_choice') {
        if (options.filter((option) => option.isCorrect === true).length < 1) {
            throw new Error('QUESTION_CORRECT_OPTION_REQUIRED')
        }
        return
    }
    if (type === 'category') {
        const grouped = new Map<string, AdminQuestionOptionInput[]>()
        for (const option of options) {
            const group = option.responseGroup?.trim()
            if (!group) throw new Error('QUESTION_RESPONSE_GROUP_REQUIRED')
            const rows = grouped.get(group) ?? []
            rows.push(option)
            grouped.set(group, rows)
        }
        if (grouped.size === 0) throw new Error('QUESTION_RESPONSE_GROUP_REQUIRED')
        for (const rows of grouped.values()) {
            if (rows.filter((option) => option.isCorrect === true).length !== 1) {
                throw new Error('QUESTION_RESPONSE_GROUP_CORRECT_REQUIRED')
            }
        }
        return
    }
    throw new Error('QUESTION_TYPE_INVALID')
}

export class AdminV2Service {
    private async getCatalog(context?: ProgramTrackContext) {
        return catalogContextService.resolve(contextOrDefault(context))
    }

    async listCatalogContexts() {
        return catalogContextService.listActiveContexts()
    }

    async getWorkspaceData(context?: ProgramTrackContext) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(context)

        const [productsResult, eventsResult, examsResult, questionsResult, ordersResult, paymentsResult] = await Promise.all([
            admin
                .from('products')
                .select('id, code, name, description, product_type, duration_days, status, created_at, updated_at')
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
                .order('updated_at', { ascending: false })
                .limit(50),
            admin
                .from('events')
                .select('id, code, title, slug, event_type, description, registration_start, registration_end, starts_at, ends_at, status, created_at')
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
                .order('starts_at', { ascending: false })
                .limit(50),
            admin
                .from('exams')
                .select('id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, token_cost, updated_at')
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
                .order('updated_at', { ascending: false })
                .limit(80),
            admin
                .from('questions')
                .select('id, question_code, subject_id, question_type, stem, difficulty, source_reference, status, version, author_id, reviewer_id, published_at, updated_at')
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
                .order('updated_at', { ascending: false })
                .limit(80),
            admin
                .from('orders')
                .select('id, order_number, user_id, status, subtotal, discount_amount, total_amount, currency, paid_at, created_at')
                .order('created_at', { ascending: false })
                .limit(50),
            admin
                .from('payments')
                .select('id, order_id, provider, provider_transaction_id, payment_method, amount, status, paid_at, created_at, updated_at')
                .order('created_at', { ascending: false })
                .limit(50),
        ])

        for (const result of [productsResult, eventsResult, examsResult, questionsResult, ordersResult, paymentsResult]) {
            if (result.error) throw result.error
        }

        const productIds = (productsResult.data ?? []).map((row) => row.id)
        const eventIds = (eventsResult.data ?? []).map((row) => row.id)
        const examIds = (examsResult.data ?? []).map((row) => row.id)
        const questionIds = (questionsResult.data ?? []).map((row) => row.id)
        const untyped = await createAdminClient()

        const [pricesResult, grantsResult, eventProductsResult, sessionsResult, sectionsResult, optionsResult] = await Promise.all([
            productIds.length
                ? admin.from('product_prices').select('id, product_id, currency, amount, starts_at, ends_at, status').in('product_id', productIds).order('starts_at', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            productIds.length
                ? untyped.from('product_wallet_grants').select('product_id, wallet_type, amount').in('product_id', productIds)
                : Promise.resolve({ data: [], error: null }),
            eventIds.length
                ? untyped.from('event_products').select('product_id, event_id, session_id, status').in('event_id', eventIds)
                : Promise.resolve({ data: [], error: null }),
            eventIds.length
                ? admin.from('event_sessions').select('id, event_id, exam_id, name, starts_at, ends_at, capacity, status').in('event_id', eventIds).order('starts_at', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
            examIds.length
                ? admin.from('exam_sections').select('id, exam_id, subject_id, title, sort_order, question_count, duration_seconds, config').in('exam_id', examIds).order('sort_order', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
            questionIds.length
                ? untyped.from('question_options').select('id, question_id, option_key, content, is_correct, score, sort_order, response_group, response_group_order').in('question_id', questionIds).order('sort_order', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
        ])
        for (const result of [pricesResult, grantsResult, eventProductsResult, sessionsResult, sectionsResult, optionsResult]) {
            if (result.error) throw result.error
        }

        return {
            catalog,
            contexts: await this.listCatalogContexts(),
            products: productsResult.data ?? [],
            productPrices: pricesResult.data ?? [],
            productWalletGrants: grantsResult.data ?? [],
            events: eventsResult.data ?? [],
            eventProducts: eventProductsResult.data ?? [],
            eventSessions: sessionsResult.data ?? [],
            exams: examsResult.data ?? [],
            examSections: sectionsResult.data ?? [],
            questions: questionsResult.data ?? [],
            questionOptions: optionsResult.data ?? [],
            orders: ordersResult.data ?? [],
            payments: paymentsResult.data ?? [],
        }
    }

    async saveProduct(input: {
        id?: string | null
        code: string
        name: string
        description?: string | null
        productType: string
        durationDays?: number | null
        status: string
        price?: number | null
        currency?: string
        tokenGrant?: number | null
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_')
        if (!code || !input.name.trim()) throw new Error('PRODUCT_FIELDS_REQUIRED')
        if (!validNonNegative(input.price)) throw new Error('PRODUCT_PRICE_INVALID')
        if (!validNonNegative(input.tokenGrant)) throw new Error('TOKEN_GRANT_INVALID')
        if (!validPositive(input.durationDays)) throw new Error('PRODUCT_DURATION_INVALID')

        let productId = input.id ?? null
        if (productId) {
            const { data: current, error: currentError } = await admin
                .from('products')
                .select('id, program_id, track_id')
                .eq('id', productId)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('PRODUCT_CATALOG_MISMATCH')
            }
            const { error } = await admin
                .from('products')
                .update({
                    code,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    product_type: input.productType,
                    duration_days: input.durationDays ?? null,
                    status: input.status,
                    updated_at: nowIso(),
                })
                .eq('id', productId)
            if (error) throw error
        } else {
            const { data, error } = await admin
                .from('products')
                .insert({
                    code,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    product_type: input.productType,
                    program_id: catalog.program.id,
                    track_id: catalog.track.id,
                    duration_days: input.durationDays ?? null,
                    status: input.status,
                })
                .select('id')
                .single()
            if (error) throw error
            productId = String(data.id)
        }

        if (input.price !== null && input.price !== undefined) {
            const { error: deactivateError } = await admin
                .from('product_prices')
                .update({ status: 'inactive', ends_at: nowIso() })
                .eq('product_id', productId)
                .in('status', ['active', 'ACTIVE'])
                .is('ends_at', null)
            if (deactivateError) throw deactivateError

            const { error: priceError } = await admin
                .from('product_prices')
                .insert({
                    product_id: productId,
                    currency: input.currency || 'IDR',
                    amount: input.price,
                    starts_at: nowIso(),
                    ends_at: null,
                    status: 'active',
                })
            if (priceError) throw priceError
        }

        const untyped = await createAdminClient()
        if (input.tokenGrant !== null && input.tokenGrant !== undefined) {
            if (input.tokenGrant > 0) {
                const { error } = await untyped
                    .from('product_wallet_grants')
                    .upsert({
                        product_id: productId,
                        wallet_type: 'exam_token',
                        amount: input.tokenGrant,
                        config: {},
                    }, { onConflict: 'product_id,wallet_type' })
                if (error) throw error
            } else {
                const { error } = await untyped
                    .from('product_wallet_grants')
                    .delete()
                    .eq('product_id', productId)
                    .eq('wallet_type', 'exam_token')
                if (error) throw error
            }
        }

        return productId
    }

    async archiveProduct(productId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('products')
            .update({ status: 'archived', updated_at: nowIso() })
            .eq('id', productId)
        if (error) throw error
    }

    async saveEvent(input: {
        id?: string | null
        code: string
        title: string
        slug?: string | null
        description?: string | null
        registrationStart?: string | null
        registrationEnd?: string | null
        startsAt: string
        endsAt: string
        status: string
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-')
        const slug = slugify(input.slug || input.title)
        if (!code || !input.title.trim() || !slug) throw new Error('EVENT_FIELDS_REQUIRED')
        if (Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EVENT_TIME_INVALID')
        if (input.registrationStart && input.registrationEnd && Date.parse(input.registrationStart) >= Date.parse(input.registrationEnd)) {
            throw new Error('EVENT_REGISTRATION_TIME_INVALID')
        }
        if (input.registrationEnd && Date.parse(input.registrationEnd) > Date.parse(input.endsAt)) {
            throw new Error('EVENT_REGISTRATION_TIME_INVALID')
        }

        const payload = {
            code,
            title: input.title.trim(),
            slug,
            event_type: 'tryout_akbar',
            program_id: catalog.program.id,
            track_id: catalog.track.id,
            description: input.description?.trim() || null,
            registration_start: input.registrationStart || null,
            registration_end: input.registrationEnd || null,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            status: input.status,
        }

        if (input.id) {
            const { data: current, error: currentError } = await admin
                .from('events')
                .select('id, program_id, track_id')
                .eq('id', input.id)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('EVENT_CATALOG_MISMATCH')
            }
            const { error } = await admin.from('events').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }

        const { data, error } = await admin.from('events').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async archiveEvent(eventId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin.from('events').update({ status: 'archived' }).eq('id', eventId)
        if (error) throw error
    }

    async saveEventSession(input: {
        id?: string | null
        eventId: string
        examId: string
        name: string
        startsAt: string
        endsAt: string
        capacity?: number | null
        status: string
        context?: ProgramTrackContext
    }) {
        if (!input.name.trim()) throw new Error('EVENT_SESSION_NAME_REQUIRED')
        if (Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EVENT_SESSION_TIME_INVALID')
        if (!validPositive(input.capacity)) throw new Error('EVENT_SESSION_CAPACITY_INVALID')

        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const eventType = catalog.examTypes.find((row) => row.code === 'EVENT')
        if (!eventType) throw new Error('EXAM_TYPE_INVALID')

        const [{ data: event, error: eventError }, { data: exam, error: examError }] = await Promise.all([
            admin.from('events').select('id, program_id, track_id, starts_at, ends_at').eq('id', input.eventId).maybeSingle(),
            admin.from('exams').select('id, program_id, track_id, exam_type_id').eq('id', input.examId).maybeSingle(),
        ])
        if (eventError) throw eventError
        if (examError) throw examError
        if (!event) throw new Error('EVENT_NOT_FOUND')
        if (!exam) throw new Error('EXAM_NOT_FOUND')
        if (!sameId(event.program_id, catalog.program.id) || !sameId(event.track_id, catalog.track.id)) throw new Error('EVENT_CATALOG_MISMATCH')
        if (!sameId(exam.program_id, event.program_id) || !sameId(exam.track_id, event.track_id)) throw new Error('EVENT_EXAM_MISMATCH')
        if (!sameId(exam.exam_type_id, eventType.id)) throw new Error('EVENT_EXAM_TYPE_REQUIRED')
        if (Date.parse(input.startsAt) < Date.parse(String(event.starts_at)) || Date.parse(input.endsAt) > Date.parse(String(event.ends_at))) {
            throw new Error('EVENT_SESSION_OUTSIDE_EVENT')
        }

        const payload = {
            event_id: input.eventId,
            exam_id: input.examId,
            name: input.name.trim(),
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            capacity: input.capacity ?? null,
            status: input.status,
        }
        if (input.id) {
            const { error } = await admin.from('event_sessions').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin.from('event_sessions').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async linkEventProduct(input: { eventId: string; sessionId: string; productId: string; status?: string }) {
        const admin = await createV2AdminClient()
        const untyped = await createAdminClient()
        const [{ data: session, error: sessionError }, { data: event, error: eventError }, { data: product, error: productError }] = await Promise.all([
            admin.from('event_sessions').select('id, event_id').eq('id', input.sessionId).maybeSingle(),
            admin.from('events').select('id, program_id, track_id').eq('id', input.eventId).maybeSingle(),
            admin.from('products').select('id, program_id, track_id, status').eq('id', input.productId).maybeSingle(),
        ])
        if (sessionError) throw sessionError
        if (eventError) throw eventError
        if (productError) throw productError
        if (!session || !sameId(session.event_id, input.eventId)) throw new Error('EVENT_SESSION_MISMATCH')
        if (!event || !product) throw new Error('EVENT_PRODUCT_MISMATCH')
        if (!sameId(product.program_id, event.program_id) || !sameId(product.track_id, event.track_id)) throw new Error('EVENT_PRODUCT_MISMATCH')
        if (String(product.status).toLowerCase() === 'archived') throw new Error('EVENT_PRODUCT_ARCHIVED')

        const { error } = await untyped
            .from('event_products')
            .upsert({
                product_id: input.productId,
                event_id: input.eventId,
                session_id: input.sessionId,
                status: input.status ?? 'active',
            }, { onConflict: 'product_id' })
        if (error) throw error
    }

    async saveExam(input: {
        id?: string | null
        examTypeCode: string
        title: string
        slug?: string | null
        durationSeconds?: number | null
        attemptLimit?: number | null
        questionOrder: string
        resultVisibility: string
        accessType: string
        status: string
        tokenCost: number
        startsAt?: string | null
        endsAt?: string | null
        actorId: string
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const examType = catalog.examTypes.find((row) => row.code === input.examTypeCode)
        if (!examType) throw new Error('EXAM_TYPE_INVALID')
        if (!input.title.trim()) throw new Error('EXAM_TITLE_REQUIRED')
        if (!validPositive(input.durationSeconds)) throw new Error('EXAM_DURATION_INVALID')
        if (!validPositive(input.attemptLimit)) throw new Error('EXAM_ATTEMPT_LIMIT_INVALID')
        if (!validNonNegative(input.tokenCost)) throw new Error('EXAM_TOKEN_COST_INVALID')
        if (input.startsAt && input.endsAt && Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EXAM_TIME_INVALID')
        const slug = slugify(input.slug || input.title)
        if (!slug) throw new Error('EXAM_TITLE_REQUIRED')

        const payload = {
            program_id: catalog.program.id,
            track_id: catalog.track.id,
            exam_type_id: examType.id,
            title: input.title.trim(),
            slug,
            duration_seconds: input.durationSeconds ?? null,
            attempt_limit: input.attemptLimit ?? null,
            question_order: input.questionOrder,
            result_visibility: input.resultVisibility,
            access_type: input.accessType,
            status: input.status,
            starts_at: input.startsAt || null,
            ends_at: input.endsAt || null,
            token_cost: input.tokenCost,
            updated_at: nowIso(),
        }

        if (input.id) {
            const { data: current, error: currentError } = await admin
                .from('exams')
                .select('id, program_id, track_id')
                .eq('id', input.id)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('EXAM_CATALOG_MISMATCH')
            }
            const { error } = await admin.from('exams').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin
            .from('exams')
            .insert({ ...payload, created_by: input.actorId })
            .select('id')
            .single()
        if (error) throw error
        return String(data.id)
    }

    async archiveExam(examId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin.from('exams').update({ status: 'archived', updated_at: nowIso() }).eq('id', examId)
        if (error) throw error
    }

    async saveExamSection(input: {
        id?: string | null
        examId: string
        subjectCode?: string | null
        title: string
        sortOrder: number
        questionCount?: number | null
        durationSeconds?: number | null
        passingScore?: number | null
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const subject = input.subjectCode
            ? catalog.subjects.find((row) => row.code === input.subjectCode)
            : null
        if (input.subjectCode && !subject) throw new Error('SUBJECT_INVALID')
        if (!input.title.trim()) throw new Error('SECTION_TITLE_REQUIRED')
        if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new Error('SECTION_SORT_ORDER_INVALID')
        if (!validPositive(input.questionCount)) throw new Error('SECTION_QUESTION_COUNT_INVALID')
        if (!validPositive(input.durationSeconds)) throw new Error('SECTION_DURATION_INVALID')
        if (!validNonNegative(input.passingScore)) throw new Error('SECTION_PASSING_SCORE_INVALID')

        const { data: exam, error: examError } = await admin
            .from('exams')
            .select('id, program_id, track_id')
            .eq('id', input.examId)
            .maybeSingle()
        if (examError) throw examError
        if (!exam || !sameId(exam.program_id, catalog.program.id) || !sameId(exam.track_id, catalog.track.id)) throw new Error('EXAM_NOT_FOUND')

        const payload = {
            exam_id: input.examId,
            subject_id: subject?.id ?? null,
            title: input.title.trim(),
            sort_order: input.sortOrder,
            question_count: input.questionCount ?? null,
            duration_seconds: input.durationSeconds ?? null,
            config: input.passingScore === null || input.passingScore === undefined
                ? {} as Json
                : { passing_score: input.passingScore } as Json,
        }
        if (input.id) {
            const { error } = await admin.from('exam_sections').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin.from('exam_sections').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async saveQuestion(input: {
        id?: string | null
        subjectCode: string
        questionType?: string
        stem: string
        difficulty: string
        status: string
        sourceReference?: string | null
        options?: AdminQuestionOptionInput[]
        actorId: string
        changeReason?: string | null
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const untyped = await createAdminClient()
        const catalog = await this.getCatalog(input.context)
        const subject = catalog.subjects.find((row) => row.code === input.subjectCode)
        if (!subject) throw new Error('SUBJECT_INVALID')
        if (!input.stem.trim()) throw new Error('QUESTION_STEM_REQUIRED')
        const questionType = (input.questionType || 'single_choice').trim().toLowerCase()
        const options = input.options ?? []

        if (!input.id && options.length < 2) throw new Error('QUESTION_OPTIONS_REQUIRED')
        if (options.length > 0) validateQuestionOptions(questionType, options)

        if (!input.id) {
            const questionCode = `ADM-${catalog.track.code}-${input.subjectCode}-${Date.now()}-${randomUUID().slice(0, 4).toUpperCase()}`
            const { data: question, error: questionError } = await admin
                .from('questions')
                .insert({
                    question_code: questionCode,
                    program_id: catalog.program.id,
                    track_id: catalog.track.id,
                    subject_id: subject.id,
                    question_type: questionType,
                    stem: input.stem.trim(),
                    difficulty: input.difficulty,
                    source_type: 'internal',
                    source_reference: input.sourceReference?.trim() || null,
                    status: input.status,
                    version: 1,
                    author_id: input.actorId,
                    reviewer_id: input.status.toLowerCase() === 'published' ? input.actorId : null,
                    published_at: input.status.toLowerCase() === 'published' ? nowIso() : null,
                })
                .select('id')
                .single()
            if (questionError) throw questionError
            const questionId = String(question.id)

            const { error: optionError } = await untyped.from('question_options').insert(
                options.map((option) => ({
                    question_id: questionId,
                    option_key: option.key.trim().toUpperCase(),
                    content: option.content.trim(),
                    is_correct: option.isCorrect,
                    score: option.score,
                    sort_order: option.sortOrder,
                    response_group: option.responseGroup?.trim() || null,
                    response_group_order: option.responseGroupOrder ?? null,
                }))
            )
            if (optionError) {
                await admin.from('questions').delete().eq('id', questionId)
                throw optionError
            }
            return questionId
        }

        const [{ data: currentQuestion, error: currentError }, { data: currentOptions, error: currentOptionError }] = await Promise.all([
            admin.from('questions').select('*').eq('id', input.id).maybeSingle(),
            untyped.from('question_options').select('id, option_key, content, is_correct, score, sort_order, response_group, response_group_order').eq('question_id', input.id).order('sort_order'),
        ])
        if (currentError) throw currentError
        if (currentOptionError) throw currentOptionError
        if (!currentQuestion) throw new Error('QUESTION_NOT_FOUND')
        if (!sameId(currentQuestion.program_id, catalog.program.id) || !sameId(currentQuestion.track_id, catalog.track.id)) {
            throw new Error('QUESTION_CATALOG_MISMATCH')
        }

        const normalizedSourceReference = input.sourceReference?.trim() || null
        const questionChanged =
            !sameId(currentQuestion.subject_id, subject.id) ||
            String(currentQuestion.question_type ?? 'single_choice') !== questionType ||
            String(currentQuestion.stem ?? '') !== input.stem.trim() ||
            String(currentQuestion.difficulty ?? '') !== input.difficulty ||
            String(currentQuestion.status ?? '') !== input.status ||
            (currentQuestion.source_reference ?? null) !== normalizedSourceReference

        const submittedOptions = options.map((option) => ({
            key: option.key.trim().toUpperCase(),
            content: option.content.trim(),
            isCorrect: option.isCorrect,
            score: option.score === null ? null : Number(option.score),
            sortOrder: option.sortOrder,
            responseGroup: option.responseGroup?.trim() || null,
            responseGroupOrder: option.responseGroupOrder ?? null,
        }))
        const persistedOptions = (currentOptions ?? []).map((option) => ({
            key: String(option.option_key ?? '').trim().toUpperCase(),
            content: String(option.content ?? '').trim(),
            isCorrect: option.is_correct,
            score: option.score === null ? null : Number(option.score),
            sortOrder: Number(option.sort_order),
            responseGroup: option.response_group ? String(option.response_group) : null,
            responseGroupOrder: option.response_group_order === null ? null : Number(option.response_group_order),
        }))
        const optionsChanged = options.length > 0 && JSON.stringify(submittedOptions) !== JSON.stringify(persistedOptions)

        if (!questionChanged && !optionsChanged) return input.id

        if (optionsChanged || String(currentQuestion.question_type ?? 'single_choice') !== questionType) {
            const { data: activeReferences, error: referenceError } = await admin
                .from('attempt_questions')
                .select('id, attempt_id, exam_attempts!inner(status)')
                .eq('question_id', input.id)
                .in('exam_attempts.status', ['created', 'CREATED', 'in_progress', 'IN_PROGRESS'])
                .limit(1)
            if (referenceError) throw referenceError
            if ((activeReferences ?? []).length > 0) throw new Error('QUESTION_LOCKED_BY_ACTIVE_ATTEMPT')
        }

        const snapshot: Json = JSON.parse(JSON.stringify({
            question: currentQuestion,
            options: currentOptions ?? [],
        })) as Json
        const nextVersion = Number(currentQuestion.version ?? 1) + 1
        const { error: versionError } = await admin.from('question_versions').insert({
            question_id: input.id,
            version: Number(currentQuestion.version ?? 1),
            snapshot,
            changed_by: input.actorId,
            change_reason: input.changeReason?.trim() || 'Admin update',
        })
        if (versionError && versionError.code !== '23505') throw versionError

        const { error: questionError } = await admin
            .from('questions')
            .update({
                subject_id: subject.id,
                question_type: questionType,
                stem: input.stem.trim(),
                difficulty: input.difficulty,
                source_reference: normalizedSourceReference,
                status: input.status,
                version: nextVersion,
                reviewer_id: input.status.toLowerCase() === 'published' ? input.actorId : currentQuestion.reviewer_id,
                published_at: input.status.toLowerCase() === 'published'
                    ? currentQuestion.published_at || nowIso()
                    : currentQuestion.published_at,
                updated_at: nowIso(),
            })
            .eq('id', input.id)
        if (questionError) throw questionError

        if (optionsChanged) {
            const submittedKeys = new Set(options.map((option) => option.key.trim().toUpperCase()))
            const staleOptionIds = (currentOptions ?? [])
                .filter((row) => !submittedKeys.has(String(row.option_key).toUpperCase()))
                .map((row) => row.id)
            if (staleOptionIds.length > 0) {
                const { error: deleteError } = await untyped.from('question_options').delete().in('id', staleOptionIds)
                if (deleteError) throw deleteError
            }

            for (const option of options) {
                const optionKey = option.key.trim().toUpperCase()
                const existing = (currentOptions ?? []).find((row) => String(row.option_key).toUpperCase() === optionKey)
                const payload = {
                    content: option.content.trim(),
                    is_correct: option.isCorrect,
                    score: option.score,
                    sort_order: option.sortOrder,
                    response_group: option.responseGroup?.trim() || null,
                    response_group_order: option.responseGroupOrder ?? null,
                }
                if (existing) {
                    const { error } = await untyped.from('question_options').update(payload).eq('id', existing.id)
                    if (error) throw error
                } else {
                    const { error } = await untyped.from('question_options').insert({
                        question_id: input.id,
                        option_key: optionKey,
                        ...payload,
                    })
                    if (error) throw error
                }
            }
        }
        return input.id
    }

    async archiveQuestion(questionId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('questions')
            .update({ status: 'archived', updated_at: nowIso() })
            .eq('id', questionId)
        if (error) throw error
    }
}

export const adminV2Service = new AdminV2Service()
