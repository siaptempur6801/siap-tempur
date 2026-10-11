import { adminRoutePage } from '@/lib/admin-route-page'
import Workspace from '@/components/admin/domain/users/UsersWorkspace'
import AccessWorkspace from '@/components/admin/domain/users/AccessWorkspace'
import UserWorkspace from '@/components/admin/domain/users/UserWorkspace'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const route = await adminRoutePage('/admin/users', params, searchParams)
  if (route.workspace === 'access') return <AccessWorkspace searchParams={route.searchParams} />
  if (route.workspace === 'user') {
    const state = await route.searchParams
    return (
      <UserWorkspace
        params={Promise.resolve({ userId: state.userId! })}
        searchParams={route.searchParams}
      />
    )
  }
  return <Workspace searchParams={route.searchParams} />
}
