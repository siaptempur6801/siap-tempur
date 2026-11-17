import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
AdminCard,
AdminEmptyState,
AdminPage,
AdminPageHeader,
AdminTh,
adminSecondaryButtonClass,
adminTableHeadClass
} from '@/components/admin/AdminUi'
import AdminWorkspaceTabs from '@/components/admin/AdminWorkspaceTabs'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { adminAuditLabel,adminEntityTypeLabel,formatDateTime } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import { PERMISSIONS } from '@/src/auth/permissions'
import { getAdminAudit } from '@/src/services/admin-audit-workspace.service'
import { adminDirectoryService } from '@/src/services/admin-directory.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'
type Params = {
  actor?: string
  action?: string
  entity?: string
  from?: string
  to?: string
  page?: string
}
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams,
    actor = await authorizationService.requireAuthenticated()
  if (!actor.permissions.includes(PERMISSIONS.AUDIT_READ))
    return (
      <AdminEmptyState
        title="Akses tidak tersedia"
        description="Hubungi pengelola untuk akses Audit Log."
      />
    )
  let data, facets
  try {
    ;[data, facets] = await Promise.all([
      getAdminAudit(params),
      adminDirectoryService.getAuditFacets()
    ])
  } catch {
    return <AdminErrorState noun="Audit Log" retryHref="/admin/settings/audit" />
  }
  const actors = [
    ...new Map(
      data.logs
        .filter((l) => l.actor_user_id)
        .map((l) => [
          String(l.actor_user_id),
          { value: String(l.actor_user_id), label: l.actor_name }
        ])
    ).values()
  ]
  return (
    <AdminPage>
      <AdminBreadcrumbs
        items={[{ label: 'Settings', href: '/admin/settings' }, { label: 'Audit Log' }]}
      />
      <AdminPageHeader
        title="Audit Log"
        description="Telusuri tindakan sistem, resource, dan siapa yang melakukan perubahan."
      />
      <AdminWorkspaceTabs workspace="settings" permissions={actor.permissions} />
      <AdminTableToolbar
        pathname="/admin/settings/audit"
        search=""
        resultCount={data.total}
        selects={[
          {
            name: 'action',
            ariaLabel: 'Filter aksi',
            placeholder: 'Semua aksi',
            defaultValue: params.action || '',
            options: facets.actions.map((value) => ({ value, label: adminAuditLabel(value) }))
          },
          {
            name: 'entity',
            ariaLabel: 'Filter resource',
            placeholder: 'Semua resource',
            defaultValue: params.entity || '',
            options: facets.entityTypes.map((value) => ({
              value,
              label: adminEntityTypeLabel(value)
            }))
          },
          {
            name: 'actor',
            ariaLabel: 'Filter actor',
            placeholder: 'Semua actor',
            defaultValue: params.actor || '',
            options: actors
          }
        ]}
        dateRange={{ from: params.from || '', to: params.to || '' }}
      />
      <AdminCard>
        <AdminDataTable
          caption="Audit Log"
          className="min-w-[900px]"
          empty={
            !data.logs.length
              ? {
                  title: 'Tidak ada catatan yang cocok',
                  description:
                    'Jejak audit tercatat otomatis saat ada tindakan administratif. Ubah filter untuk melihat catatan lain.',
                  action: (
                    <Link className={adminSecondaryButtonClass} href="/admin/settings/audit">
                      Reset Filter
                    </Link>
                  )
                }
              : undefined
          }
          pagination={
            <AdminPagination
              pathname="/admin/settings/audit"
              params={params}
              summary={adminPageSummary(data.page, data.logs.length, data.total, 50)}
              noun="catatan"
            />
          }
        >
          <thead className={adminTableHeadClass}>
            <tr>
              {['Actor', 'Action', 'Resource', 'Timestamp', 'Details'].map((h) => (
                <AdminTh key={h}>{h}</AdminTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.logs.map((l) => (
              <tr key={String(l.id)}>
                <td>{l.actor_name}</td>
                <td>{adminAuditLabel(l.action)}</td>
                <td>{adminEntityTypeLabel(l.entity_type)}</td>
                <td className="whitespace-nowrap text-xs">{formatDateTime(l.created_at)}</td>
                <td>
                  {l.old_data != null || l.new_data != null ? (
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-info">
                        Lihat detail
                      </summary>
                      <div className="mt-3 flex max-w-md flex-col gap-3">
                        {[
                          ['Sebelum', l.old_data],
                          ['Sesudah', l.new_data]
                        ].map(
                          ([label, payload]) =>
                            payload != null && (
                              <div key={String(label)}>
                                <p className="mb-1 text-xs text-muted-foreground">{String(label)}</p>
                                <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">
                                  {JSON.stringify(payload, null, 2)}
                                </pre>
                              </div>
                            )
                        )}
                      </div>
                    </details>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
      </AdminCard>
    </AdminPage>
  )
}
