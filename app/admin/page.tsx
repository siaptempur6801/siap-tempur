import AdminOverview from '@/app/admin/AdminOverview'
import LegacyAdminWorkspace from '@/app/cpns/admin/page'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEGACY_TABS = new Set(['products', 'events', 'exams', 'questions', 'commerce'])

type SearchParams = {
    tab?: string
    ok?: string
    error?: string
    edit?: string
    program?: string
    track?: string
}

export default async function UnifiedAdminRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams

    if (params.tab && LEGACY_TABS.has(params.tab)) {
        return <LegacyAdminWorkspace searchParams={Promise.resolve(params)}/>
    }

    return <AdminOverview params={params}/>
}
