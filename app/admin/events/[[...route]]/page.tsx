import { adminRoutePage } from '@/lib/admin-route-page'
import Workspace from '@/components/admin/domain/event/EventWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const route = await adminRoutePage('/admin/events', params, searchParams)
  return <Workspace searchParams={route.searchParams} />
}
