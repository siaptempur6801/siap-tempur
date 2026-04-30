type OptionWithId = {
    id: string
}

function hashSeed(seed: string) {
    let hash = 2166136261

    for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }

    return hash >>> 0
}

function seededRandom(seed: string) {
    let state = hashSeed(seed) || 1

    return () => {
        state += 0x6D2B79F5
        let value = state
        value = Math.imul(value ^ (value >>> 15), value | 1)
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
}

export function randomizeOptionsForSession<TOption extends OptionWithId>(
    options: TOption[],
    sessionId: string,
    questionId: string
) {
    const shuffled = [...options].sort((left, right) => left.id.localeCompare(right.id))
    const random = seededRandom(`${sessionId}:${questionId}`)

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1))
        const current = shuffled[i]
        shuffled[i] = shuffled[j]
        shuffled[j] = current
    }

    return shuffled
}

export function getOptionOrderForSession(
    options: OptionWithId[],
    sessionId: string,
    questionId: string
) {
    return randomizeOptionsForSession(options, sessionId, questionId).map((option) => option.id)
}

export function orderOptionsById<TOption extends OptionWithId>(options: TOption[], optionOrder: string[]) {
    const orderIndex = new Map(optionOrder.map((optionId, index) => [optionId, index]))

    return [...options].sort((left, right) => {
        const leftIndex = orderIndex.get(left.id)
        const rightIndex = orderIndex.get(right.id)

        if (leftIndex === undefined && rightIndex === undefined) {
            return left.id.localeCompare(right.id)
        }

        if (leftIndex === undefined) return 1
        if (rightIndex === undefined) return -1

        return leftIndex - rightIndex
    })
}
