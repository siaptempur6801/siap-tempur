import { adminRoutePage } from '@/lib/admin-route-page'
import Workspace from '@/components/admin/domain/catalog/CatalogWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const route = await adminRoutePage('/admin/commerce/products', params, searchParams)
  return <Workspace mode="products" searchParams={route.searchParams} />
}
