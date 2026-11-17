import AdminOverview from '@/app/admin/AdminOverview'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParams = {
    program?: string
    track?: string
}

export default async function UnifiedAdminRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    return <AdminOverview params={params}/>
}
