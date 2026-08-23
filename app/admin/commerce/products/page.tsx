import AdminOperationsWorkspace from '@/app/admin/AdminOperationsWorkspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParams = { program?: string; track?: string; edit?: string; ok?: string; error?: string }

export default async function ProductsRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    return <AdminOperationsWorkspace mode="products" searchParams={Promise.resolve({ ...params, program: params.program || 'CPNS', track: params.track || 'SKD' })}/>
}
