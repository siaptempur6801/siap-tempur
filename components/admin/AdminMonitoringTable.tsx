import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { formatDateTime } from '@/lib/admin-format'
import type { getAdminMonitoring } from '@/src/services/admin-monitoring.service'
import Link from '@/components/admin/navigation/AdminLink'
import {
  AdminRowActions,
  AdminStatusBadge,
  AdminTh,
  adminTableActionClass,
  adminTableHeadClass,
} from './AdminUi'
type MonitoringData = Awaited<ReturnType<typeof getAdminMonitoring>>
export default function AdminMonitoringTable({
  data,
  params,
  returnTo,
  caption = 'Daftar peserta monitoring',
}: {
  data: MonitoringData
  params: Record<string, string>
  returnTo: string
  caption?: string
}) {
  return (
    <AdminDataTable caption={caption} className="w-full min-w-[950px] text-sm">
      <thead className={adminTableHeadClass}>
        <tr>
          {['Peserta', 'Status', 'Progres', 'Mulai', 'Selesai', 'Skor', 'Aksi'].map((h) => (
            <AdminTh key={h}>{h}</AdminTh>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {data.rows.map((r) => (
          <tr key={r.id} data-participant-id={r.id} className="hover:bg-muted">
            <td className="px-5 py-4 font-semibold">
              <span>{r.name}</span>
              <p className="text-xs font-normal text-muted-foreground">{r.email}</p>
            </td>
            <td className="px-4">
              <AdminStatusBadge status={r.attempt?.status || 'not_started'} />
            </td>
            <td className="px-4">
              {r.progress ? `${r.progress.answered} / ${r.progress.total} soal` : '—'}
            </td>
            <td className="px-4 text-xs">{formatDateTime(r.attempt?.started_at)}</td>
            <td className="px-4 text-xs">{formatDateTime(r.attempt?.submitted_at)}</td>
            <td className="px-4">
              {r.attempt?.status === 'completed' ? (r.attempt.total_score ?? '—') : '—'}
            </td>
            <td className="px-5">
              {r.attempt?.status === 'completed' ? (
                <AdminRowActions>
                  <Link
                    className={adminTableActionClass}
                    data-attempt-id={r.attempt.id}
                    href={`/admin/monitoring/results/${r.attempt.id}?${new URLSearchParams({ ...params, ...(r.attempt.assignment_id ? { assignment: r.attempt.assignment_id } : {}), exam: r.attempt.exam_id, returnTo })}`}
                  >
                    Lihat Hasil
                  </Link>
                </AdminRowActions>
              ) : (
                <span className="text-xs text-muted-foreground">Hasil belum tersedia</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </AdminDataTable>
  )
}
