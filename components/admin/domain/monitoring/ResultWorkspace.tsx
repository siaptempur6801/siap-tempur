import {
  AdminCard,
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { formatDateTime } from '@/lib/admin-format'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { getAdminResult, type MonitoringParams } from '@/src/services/admin-monitoring.service'
import Link from '@/components/admin/navigation/AdminLink'
export default async function AdminResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>
  searchParams: Promise<MonitoringParams>
}) {
  const [{ attemptId }, context] = await Promise.all([params, searchParams])
  const q = new URLSearchParams()
  for (const k of ['event', 'org', 'batch', 'assignment', 'exam'] as const)
    if (context[k]) q.set(k, context[k])
  const back = adminReturnUrl(context.returnTo, `/admin/monitoring?${q}`)
  let data
  try {
    data = await getAdminResult(attemptId, context)
  } catch {
    return <AdminErrorState noun="hasil" retryHref={back} />
  }
  const c = data.context
  const crumbs = c.event
    ? [
        { label: 'Event', href: `/admin/events?event=${c.event.id}` },
        { label: c.event.title, href: back },
      ]
    : [
        { label: 'Instansi', href: '/admin/organizations' },
        { label: c.organization!.name, href: `/admin/organizations?org=${c.organization!.id}` },
        { label: c.batch!.name, href: back },
        ...(c.assignment ? [{ label: c.assignment.exam_title || 'Penugasan', href: back }] : []),
      ]
  return (
    <AdminPage>
      <AdminBreadcrumbs
        items={[...crumbs, { label: data.participant, href: back }, { label: 'Hasil' }]}
      />
      <AdminPageHeader
        title={`Hasil ${data.participant}`}
        description={data.examTitle}
        action={
          <Link className={adminSecondaryButtonClass} href={back}>
            ← Kembali ke Monitoring
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Skor" value={data.attempt.total_score ?? '—'} />
        <AdminCard className="space-y-3 p-4">
          <p className="text-xs font-semibold text-muted-foreground">Status</p>
          <AdminStatusBadge status={data.attempt.status} />
        </AdminCard>
        <AdminMetric
          label="Durasi"
          value={
            data.attempt.duration_used_seconds === null
              ? '—'
              : `${Math.floor(data.attempt.duration_used_seconds / 60)} menit ${data.attempt.duration_used_seconds % 60} detik`
          }
        />
        <AdminMetric label="Selesai pada" value={formatDateTime(data.attempt.submitted_at)} />
      </div>
      <AdminCard>
        <h2 className="p-5 font-bold">Rincian Subtes</h2>
        <AdminDataTable className="w-full min-w-[650px] text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              {['Subtes', 'Skor', 'Benar', 'Salah', 'Kosong', 'Status'].map((h) => (
                <AdminTh key={h}>{h}</AdminTh>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.scores.map((s, i) => (
              <tr key={i}>
                <td className="px-5 py-4">
                  {(s.subjects as unknown as { code: string; name: string } | null)?.code ||
                    'Subtes'}
                </td>
                <td className="px-4">{s.normalized_score ?? s.raw_score}</td>
                <td className="px-4">{s.correct_count}</td>
                <td className="px-4">{s.wrong_count}</td>
                <td className="px-4">{s.unanswered_count}</td>
                <td className="px-5">
                  {s.passed === null ? '—' : s.passed ? 'Lulus' : 'Belum lulus'}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
        {!data.scores.length && (
          <p className="p-5 text-sm text-muted-foreground">
            Rincian subtes belum tersedia untuk hasil ini.
          </p>
        )}
      </AdminCard>
    </AdminPage>
  )
}
