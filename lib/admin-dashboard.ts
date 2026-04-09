export const QUESTION_TYPES = ['TWK', 'TIU', 'TKP'] as const
export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const
export const ADMIN_PAGE_SIZES = [10, 50, 100] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]
export type OptionLabel = (typeof OPTION_LABELS)[number]
export type AdminPageSize = (typeof ADMIN_PAGE_SIZES)[number]

export type CategoryMap = Record<QuestionType, string[]>

export interface AdminFilters {
    q: string
    category: QuestionType
    subCategory: string
    page: number
    pageSize: AdminPageSize
}

export const DEFAULT_ADMIN_RETURN_PATH = '/cpns/dashboard/admin'

type ConfigRow = {
    type: string
    sub_category: string | null
    is_active?: boolean | null
}

export function createEmptyCategoryMap(): CategoryMap {
    return {
        TWK: [],
        TIU: [],
        TKP: [],
    }
}

export function normalizeAdminFilters(params?: {
    q?: string
    category?: string
    sub_category?: string
    page?: string
    page_size?: string
}): AdminFilters {
    const category = QUESTION_TYPES.includes((params?.category || '') as QuestionType)
        ? (params?.category as QuestionType)
        : 'TWK'
    const pageSize = ADMIN_PAGE_SIZES.includes(Number(params?.page_size) as AdminPageSize)
        ? (Number(params?.page_size) as AdminPageSize)
        : 10
    const rawPage = Number(params?.page)
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

    return {
        q: params?.q?.trim() || '',
        category,
        subCategory: params?.sub_category?.trim() || '',
        page,
        pageSize,
    }
}

export function buildCategoryMap(configs: ConfigRow[]): CategoryMap {
    const categoryMap = createEmptyCategoryMap()

    for (const config of configs) {
        const type = config.type as QuestionType
        const subCategory = config.sub_category?.trim()

        if (!QUESTION_TYPES.includes(type) || !subCategory) {
            continue
        }

        if (!categoryMap[type].includes(subCategory)) {
            categoryMap[type].push(subCategory)
        }
    }

    return categoryMap
}

export function buildActiveCategoryMap(configs: ConfigRow[]): CategoryMap {
    return buildCategoryMap(configs.filter((config) => config.is_active !== false))
}

export function sanitizeAdminReturnPath(returnTo?: string) {
    if (!returnTo) {
        return DEFAULT_ADMIN_RETURN_PATH
    }

    const trimmed = returnTo.trim()
    if (!trimmed.startsWith('/cpns/dashboard/admin')) {
        return DEFAULT_ADMIN_RETURN_PATH
    }

    return trimmed
}
