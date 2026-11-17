import { adminRoutePage } from '@/lib/admin-route-page'
import Workspace from '@/components/admin/domain/organization/OrganizationWorkspace'
import MonitoringWorkspace from '@/components/admin/domain/monitoring/MonitoringWorkspace'
import ReportsWorkspace from '@/components/admin/domain/monitoring/ReportsWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({ params, searchParams }: { params: Promise<{ route?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const route = await adminRoutePage('/admin/organizations', params, searchParams)
  if (route.workspace === 'monitoring') return <MonitoringWorkspace searchParams={route.searchParams} />
  if (route.workspace === 'reports') return <ReportsWorkspace searchParams={route.searchParams} />
  return <Workspace searchParams={route.searchParams} />
}
