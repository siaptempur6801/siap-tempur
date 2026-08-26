import { redirect } from 'next/navigation'

const TAB_ROUTES: Record<string, string> = {
    products: '/admin/commerce/products',
    events: '/admin/assessment/events',
    exams: '/admin/assessment/exams',
    questions: '/admin/content/questions',
    commerce: '/admin/commerce',
}

export default async function LegacyAdminRoute({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; program?: string; track?: string; edit?: string; ok?: string; error?: string }>
}) {
    const params = await searchParams
    const target = TAB_ROUTES[params.tab || 'products'] || TAB_ROUTES.products
    const query = new URLSearchParams({
        program: (params.program || 'CPNS').toUpperCase(),
        track: (params.track || 'SKD').toUpperCase(),
    })
    for (const key of ['edit', 'ok', 'error'] as const) {
        if (params[key]) query.set(key, params[key] as string)
    }
    redirect(`${target}?${query.toString()}`)
}
