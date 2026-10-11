import { adminRoutePage } from '@/lib/admin-route-page'
import MonitoringWorkspace from '@/components/admin/domain/monitoring/MonitoringWorkspace'
import ReportsWorkspace from '@/components/admin/domain/monitoring/ReportsWorkspace'
import ResultWorkspace from '@/components/admin/domain/monitoring/ResultWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const route = await adminRoutePage('/admin/monitoring', params, searchParams)
  if (route.workspace === 'monitoring')
    return <MonitoringWorkspace searchParams={route.searchParams} />
  if (route.workspace === 'reports') return <ReportsWorkspace searchParams={route.searchParams} />
  const state = await route.searchParams
  return (
    <ResultWorkspace
      params={Promise.resolve({ attemptId: state.attemptId! })}
      searchParams={route.searchParams}
    />
  )
}
