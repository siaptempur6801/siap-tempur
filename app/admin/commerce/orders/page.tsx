import { adminRoutePage } from '@/lib/admin-route-page'
import Workspace from '@/components/admin/domain/commerce/OrdersWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const route = await adminRoutePage('/admin/commerce/orders', params, searchParams)
  return <Workspace searchParams={route.searchParams} />
}
