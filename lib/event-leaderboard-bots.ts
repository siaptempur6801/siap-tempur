export const MAX_EVENT_BOT_COUNT = 100
export const MAX_EVENT_BOT_SCORE = 360
export const MIN_EVENT_BOT_SCORE = 260

export type EventBotName = {
    id: string
    full_name: string
}

export type EventBotEntry = {
    id: string
    event_id: string
    display_name: string
    seed: number
    target_progress_count: number
    target_score_twk: number
    target_score_tiu: number
    target_score_tkp: number
    target_total_score: number
    started_at: string
    finished_at: string
}

export type EventBotConfig = {
    id: string
    bot_count: number | null
    starts_at: string
    duration_minutes: number
    start_grace_minutes: number
}

export type LeaderboardRankableEntry = {
    entry_id: string
    user_id: string
    full_name: string
    avatar_url: string | null
    progress_count: number
    score_twk: number
    score_tiu: number
    score_tkp: number
    total_score: number
    live_rank: number
    is_bot: boolean
    started_at: string
}

type ReconcileBotEntriesInput = {
    event: EventBotConfig
    existingEntries: EventBotEntry[]
    botNames: EventBotName[]
}

type ReconcileBotEntriesResult = {
    nextEntries: EventBotEntry[]
    entriesToInsert: EventBotEntry[]
    entryIdsToDelete: string[]
}

type QueryError = { message: string }
type QueryResponse<T> = { data: T | null; error: QueryError | null }
type SupabaseSelectBuilder<T> = {
    eq: (column: string, value: unknown) => SupabaseSelectBuilder<T>
    order: (column: string, options: { ascending: boolean }) => Promise<QueryResponse<T>>
    single: () => Promise<QueryResponse<T>>
}
type SupabaseTableBuilder = {
    select: <T>(columns: string) => SupabaseSelectBuilder<T>
    delete: () => {
        in: (column: string, values: string[]) => Promise<{ error: QueryError | null }>
    }
    insert: (values: Record<string, unknown>[]) => {
        select: <T>(columns: string) => Promise<QueryResponse<T>>
    }
    upsert: (values: Record<string, unknown>[], options: { onConflict: string; ignoreDuplicates: boolean }) => {
        select: <T>(columns: string) => Promise<QueryResponse<T>>
    }
}
type SupabaseLikeClient = {
    from: (table: string) => unknown
}

type EventBotEntryRow = EventBotEntry
type EventBotNameRow = EventBotName
type EventBotConfigRow = EventBotConfig

const FALLBACK_FIRST_NAMES = [
    'Aditya', 'Aldi', 'Ananda', 'Bima', 'Cahya', 'Daffa', 'Dinda', 'Erlangga', 'Fikri', 'Gita',
    'Hasan', 'Irfan', 'Kirana', 'Laras', 'Maulana', 'Naufal', 'Oktavia', 'Pradipta', 'Raka', 'Syifa',
]
const FALLBACK_LAST_NAMES = [
    'Abimanyu', 'Anggara', 'Cahyadi', 'Damayanti', 'Fauzan', 'Gunawan', 'Hartanto', 'Kusuma', 'Mahendra', 'Ningrum',
    'Pamungkas', 'Prameswari', 'Ramadhani', 'Saputri', 'Utami', 'Wibisana', 'Yulianto', 'Zulfikar', 'Prakoso', 'Nugraheni',
]
const FALLBACK_THIRD_NAMES = [
    'Azzahra', 'Bagaskara', 'Cendekia', 'Dewantara', 'Fathurrahman', 'Gemilang', 'Handayani', 'Kurniawan', 'Laksamana', 'Maharani',
    'Permatasari', 'Rahmadani', 'Setiawan', 'Wijayanti', 'Yudhistira',
]

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

function hashString(value: string) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function randomFromSeed(seed: number) {
    let state = seed >>> 0
    return () => {
        state = Math.imul(1664525, state) + 1013904223
        return (state >>> 0) / 4294967296
    }
}

function pickBotName(botNames: EventBotName[], usedNames: Set<string>, seed: number) {
    const random = randomFromSeed(seed)

    if (botNames.length > 0) {
        const startIndex = Math.floor(random() * botNames.length)

        for (let offset = 0; offset < botNames.length; offset += 1) {
            const candidate = botNames[(startIndex + offset) % botNames.length]
            if (!usedNames.has(candidate.full_name)) return candidate.full_name
        }
    }

    const firstStartIndex = Math.floor(random() * FALLBACK_FIRST_NAMES.length)
    const lastStartIndex = Math.floor(random() * FALLBACK_LAST_NAMES.length)
    const thirdStartIndex = Math.floor(random() * FALLBACK_THIRD_NAMES.length)

    for (let firstOffset = 0; firstOffset < FALLBACK_FIRST_NAMES.length; firstOffset += 1) {
        for (let lastOffset = 0; lastOffset < FALLBACK_LAST_NAMES.length; lastOffset += 1) {
            const displayName = [
                FALLBACK_FIRST_NAMES[(firstStartIndex + firstOffset) % FALLBACK_FIRST_NAMES.length],
                FALLBACK_LAST_NAMES[(lastStartIndex + lastOffset) % FALLBACK_LAST_NAMES.length],
            ].join(' ')

            if (!usedNames.has(displayName)) return displayName
        }
    }

    for (let firstOffset = 0; firstOffset < FALLBACK_FIRST_NAMES.length; firstOffset += 1) {
        for (let lastOffset = 0; lastOffset < FALLBACK_LAST_NAMES.length; lastOffset += 1) {
            for (let thirdOffset = 0; thirdOffset < FALLBACK_THIRD_NAMES.length; thirdOffset += 1) {
                const displayName = [
                    FALLBACK_FIRST_NAMES[(firstStartIndex + firstOffset) % FALLBACK_FIRST_NAMES.length],
                    FALLBACK_LAST_NAMES[(lastStartIndex + lastOffset) % FALLBACK_LAST_NAMES.length],
                    FALLBACK_THIRD_NAMES[(thirdStartIndex + thirdOffset) % FALLBACK_THIRD_NAMES.length],
                ].join(' ')

                if (!usedNames.has(displayName)) return displayName
            }
        }
    }

    return 'Ananda Kusuma Pradipta'
}

export function buildBotScorePlan(seed: number) {
    const random = randomFromSeed(seed)
    const totalScore = MIN_EVENT_BOT_SCORE + Math.floor(random() * (MAX_EVENT_BOT_SCORE - MIN_EVENT_BOT_SCORE + 1))
    const scoreTwk = 50 + Math.floor(random() * 36)
    const scoreTiu = 55 + Math.floor(random() * 36)
    const scoreTkp = clamp(totalScore - scoreTwk - scoreTiu, 120, 220)
    const adjustedTotal = Math.min(scoreTwk + scoreTiu + scoreTkp, MAX_EVENT_BOT_SCORE)
    const adjustedTkp = adjustedTotal - scoreTwk - scoreTiu

    return {
        progress_count: 80 + Math.floor(random() * 31),
        score_twk: scoreTwk,
        score_tiu: scoreTiu,
        score_tkp: adjustedTkp,
        total_score: adjustedTotal,
    }
}

export function reconcileEventBotEntries({
    event,
    existingEntries,
    botNames,
}: ReconcileBotEntriesInput): ReconcileBotEntriesResult {
    const desiredCount = clamp(Math.trunc(event.bot_count || 0), 0, MAX_EVENT_BOT_COUNT)
    const sortedExisting = [...existingEntries].sort((a, b) => {
        const startedDiff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        if (startedDiff !== 0) return startedDiff
        return a.id.localeCompare(b.id)
    })
    const keptEntries = sortedExisting.slice(0, desiredCount)
    const entryIdsToDelete = sortedExisting.slice(desiredCount).map((entry) => entry.id)
    const entriesToInsert: EventBotEntry[] = []
    const usedNames = new Set(keptEntries.map((entry) => entry.display_name))
    const eventStart = new Date(event.starts_at)
    const startTime = Number.isNaN(eventStart.getTime()) ? new Date() : eventStart
    const eventWindowMs = Math.max(event.duration_minutes + event.start_grace_minutes, 1) * 60 * 1000

    for (let index = keptEntries.length; index < desiredCount; index += 1) {
        const seed = hashString(`${event.id}:${index}`)
        const random = randomFromSeed(seed)
        const score = buildBotScorePlan(seed)
        const startedAt = startTime
        const workDurationMs = Math.max(
            15 * 60 * 1000,
            Math.floor(eventWindowMs * (0.55 + random() * 0.35))
        )
        const finishedAt = new Date(Math.min(startedAt.getTime() + workDurationMs, startTime.getTime() + eventWindowMs))
        const displayName = pickBotName(botNames, usedNames, seed)
        usedNames.add(displayName)

        entriesToInsert.push({
            id: `bot-${event.id}-${index + 1}`,
            event_id: event.id,
            display_name: displayName,
            seed,
            target_progress_count: score.progress_count,
            target_score_twk: score.score_twk,
            target_score_tiu: score.score_tiu,
            target_score_tkp: score.score_tkp,
            target_total_score: score.total_score,
            started_at: startedAt.toISOString(),
            finished_at: finishedAt.toISOString(),
        })
    }

    const nextEntries = [...keptEntries, ...entriesToInsert].sort((a, b) => {
        const startedDiff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        if (startedDiff !== 0) return startedDiff
        return a.id.localeCompare(b.id)
    })

    return {
        nextEntries,
        entriesToInsert,
        entryIdsToDelete,
    }
}

export function computeDisplayedBotEntry({
    entry,
    eventStatus,
    now = new Date(),
}: {
    entry: EventBotEntry
    eventStatus: string
    now?: Date
}): LeaderboardRankableEntry {
    const startedAt = new Date(entry.started_at).getTime()
    const finishedAt = new Date(entry.finished_at).getTime()
    const duration = Math.max(finishedAt - startedAt, 1)
    const ratio = eventStatus === 'live'
        ? getRealisticBotProgressRatio(entry.seed, clamp((now.getTime() - startedAt) / duration, 0, 1))
        : 1
    const progressCount = Math.floor(entry.target_progress_count * ratio)
    const scores = computeRealisticBotScores(entry, progressCount)

    return {
        entry_id: `bot:${entry.id}`,
        user_id: `bot:${entry.id}`,
        full_name: entry.display_name,
        avatar_url: null,
        progress_count: progressCount,
        score_twk: scores.score_twk,
        score_tiu: scores.score_tiu,
        score_tkp: scores.score_tkp,
        total_score: scores.total_score,
        live_rank: 0,
        is_bot: true,
        started_at: entry.started_at,
    }
}

function getRealisticBotProgressRatio(seed: number, rawRatio: number) {
    if (rawRatio <= 0 || rawRatio >= 1) return rawRatio

    const random = randomFromSeed(seed ^ 0x9e3779b9)
    const pace = 1.12 + random() * 0.28
    const pauseOneStart = 0.18 + random() * 0.16
    const pauseTwoStart = 0.52 + random() * 0.18
    const pauseOneLength = 0.015 + random() * 0.025
    const pauseTwoLength = 0.02 + random() * 0.035
    const pausePenalty = (start: number, length: number) => {
        if (rawRatio <= start) return 0
        return Math.min(rawRatio - start, length)
    }
    const activeRatio = clamp(
        (rawRatio - pausePenalty(pauseOneStart, pauseOneLength) - pausePenalty(pauseTwoStart, pauseTwoLength)) * pace,
        0,
        1
    )
    const curve = 0.92 + random() * 0.18

    return clamp(Math.pow(activeRatio, curve), 0, 1)
}

function computeRealisticBotScores(entry: EventBotEntry, progressCount: number) {
    const targetProgress = Math.max(entry.target_progress_count, 1)
    const sections = shuffleBotSections(entry.seed).map((section) => ({
        section,
        questionCount: section === 'twk'
            ? Math.min(targetProgress, 30)
            : section === 'tiu'
                ? Math.min(Math.max(targetProgress - 30, 0), 35)
                : Math.max(targetProgress - 65, 0),
    }))
    const answered = { twk: 0, tiu: 0, tkp: 0 }
    let remainingProgress = progressCount

    for (const { section, questionCount } of sections) {
        const answeredCount = Math.min(Math.max(remainingProgress, 0), questionCount)
        answered[section] = answeredCount
        remainingProgress -= answeredCount
    }

    const twkQuestionCount = sections.find((section) => section.section === 'twk')?.questionCount || 0
    const tiuQuestionCount = sections.find((section) => section.section === 'tiu')?.questionCount || 0
    const tkpQuestionCount = sections.find((section) => section.section === 'tkp')?.questionCount || 0
    const scoreTwk = twkQuestionCount > 0
        ? Math.floor(entry.target_score_twk * (answered.twk / twkQuestionCount))
        : 0
    const scoreTiu = tiuQuestionCount > 0
        ? Math.floor(entry.target_score_tiu * (answered.tiu / tiuQuestionCount))
        : 0
    const scoreTkp = tkpQuestionCount > 0
        ? Math.floor(entry.target_score_tkp * (answered.tkp / tkpQuestionCount))
        : 0

    return {
        score_twk: scoreTwk,
        score_tiu: scoreTiu,
        score_tkp: scoreTkp,
        total_score: scoreTwk + scoreTiu + scoreTkp,
    }
}

function shuffleBotSections(seed: number): Array<'twk' | 'tiu' | 'tkp'> {
    const sections: Array<'twk' | 'tiu' | 'tkp'> = ['twk', 'tiu', 'tkp']
    const random = randomFromSeed(seed ^ 0x7f4a7c15)

    for (let index = sections.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(random() * (index + 1))
        ;[sections[index], sections[randomIndex]] = [sections[randomIndex], sections[index]]
    }

    return sections
}

export function rankEventLeaderboardEntries<T extends LeaderboardRankableEntry>(entries: T[]) {
    return [...entries]
        .sort((a, b) => {
            if (b.total_score !== a.total_score) return b.total_score - a.total_score
            const startedDiff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
            if (startedDiff !== 0) return startedDiff
            return a.entry_id.localeCompare(b.entry_id)
        })
        .slice(0, 100)
        .map((entry, index) => ({
            ...entry,
            live_rank: index + 1,
        }))
}

function mapBotEntryRow(row: EventBotEntryRow): EventBotEntry {
    return {
        id: String(row.id),
        event_id: String(row.event_id),
        display_name: String(row.display_name),
        seed: Number(row.seed || 0),
        target_progress_count: Number(row.target_progress_count || 0),
        target_score_twk: Number(row.target_score_twk || 0),
        target_score_tiu: Number(row.target_score_tiu || 0),
        target_score_tkp: Number(row.target_score_tkp || 0),
        target_total_score: Number(row.target_total_score || 0),
        started_at: String(row.started_at),
        finished_at: String(row.finished_at),
    }
}

export async function ensureEventLeaderboardBots(
    client: SupabaseLikeClient,
    eventId: string
): Promise<EventBotEntry[]> {
    const eventTable = client.from('tryout_events') as SupabaseTableBuilder
    const botEntryTable = client.from('tryout_event_bot_entries') as SupabaseTableBuilder
    const botNameTable = client.from('event_bot_names') as SupabaseTableBuilder

    const { data: event, error: eventError } = await eventTable
        .select<EventBotConfigRow>('id, bot_count, starts_at, duration_minutes, start_grace_minutes')
        .eq('id', eventId)
        .single()

    if (eventError || !event) {
        throw new Error(eventError?.message || 'Event tidak ditemukan')
    }

    const { data: existingRows, error: existingError } = await botEntryTable
        .select<EventBotEntryRow[]>('id, event_id, display_name, seed, target_progress_count, target_score_twk, target_score_tiu, target_score_tkp, target_total_score, started_at, finished_at')
        .eq('event_id', eventId)
        .order('started_at', { ascending: true })

    if (existingError) throw new Error(existingError.message)

    const desiredCount = clamp(Math.trunc(Number(event.bot_count || 0)), 0, MAX_EVENT_BOT_COUNT)
    const { data: botNameRows, error: botNameError } = desiredCount > 0
        ? await botNameTable
            .select<EventBotNameRow[]>('id, full_name')
            .eq('is_active', true)
            .order('full_name', { ascending: true })
        : { data: [], error: null }

    if (botNameError) throw new Error(botNameError.message)

    const reconciled = reconcileEventBotEntries({
        event: {
            id: String(event.id),
            bot_count: desiredCount,
            starts_at: String(event.starts_at),
            duration_minutes: Number(event.duration_minutes || 100),
            start_grace_minutes: Number(event.start_grace_minutes || 0),
        },
        existingEntries: (existingRows || []).map(mapBotEntryRow),
        botNames: (botNameRows || []).map((row) => ({
            id: String(row.id),
            full_name: String(row.full_name),
        })),
    })

    if (reconciled.entryIdsToDelete.length > 0) {
        const { error } = await botEntryTable
            .delete()
            .in('id', reconciled.entryIdsToDelete)

        if (error) throw new Error(error.message)
    }

    if (reconciled.entriesToInsert.length > 0) {
        const rowsToInsert = reconciled.entriesToInsert.map((entry) => ({
            event_id: entry.event_id,
            display_name: entry.display_name,
            seed: entry.seed,
            target_progress_count: entry.target_progress_count,
            target_score_twk: entry.target_score_twk,
            target_score_tiu: entry.target_score_tiu,
            target_score_tkp: entry.target_score_tkp,
            target_total_score: entry.target_total_score,
            started_at: entry.started_at,
            finished_at: entry.finished_at,
        }))
        const { error } = await botEntryTable
            .upsert(rowsToInsert, {
                onConflict: 'event_id,display_name',
                ignoreDuplicates: true,
            })
            .select<EventBotEntryRow[]>('id, event_id, display_name, seed, target_progress_count, target_score_twk, target_score_tiu, target_score_tkp, target_total_score, started_at, finished_at')

        if (error) throw new Error(error.message)

        const { data: refreshedRows, error: refreshError } = await botEntryTable
            .select<EventBotEntryRow[]>('id, event_id, display_name, seed, target_progress_count, target_score_twk, target_score_tiu, target_score_tkp, target_total_score, started_at, finished_at')
            .eq('event_id', eventId)
            .order('started_at', { ascending: true })

        if (refreshError) throw new Error(refreshError.message)

        return (refreshedRows || []).map(mapBotEntryRow)
    }

    return reconciled.nextEntries
}
