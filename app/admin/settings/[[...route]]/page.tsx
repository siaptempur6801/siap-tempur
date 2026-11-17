import { adminRoutePage } from '@/lib/admin-route-page'
import Workspace from '@/components/admin/domain/settings/SettingsWorkspace'
import AuditWorkspace from '@/components/admin/domain/settings/AuditLogWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({ params, searchParams }: { params: Promise<{ route?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const route = await adminRoutePage('/admin/settings', params, searchParams)
  if (route.workspace === 'audit') return <AuditWorkspace searchParams={route.searchParams} />
  return <Workspace searchParams={route.searchParams} />
}
