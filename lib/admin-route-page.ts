import { notFound } from 'next/navigation'
import { adminRouteState } from './admin-routes'

/** Small route adapter. Domain services keep their existing authorization and input contract. */
export async function adminRoutePage(
  base: string,
  route: Promise<{ route?: string[] }>,
  search: Promise<Record<string, string | string[] | undefined>>,
) {
  const [params, query] = await Promise.all([route, search])
  const state = adminRouteState(
    `${base}${params.route?.length ? `/${params.route.map(encodeURIComponent).join('/')}` : ''}`,
  )
  if (!state) notFound()
  const filters = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
  return {
    workspace: state.workspace,
    searchParams: Promise.resolve({ ...filters, ...state.context }),
  }
}
