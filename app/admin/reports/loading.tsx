import { AdminLoadingSkeleton } from '@/components/admin/AdminLoading'

export default function ReportsLoading() {
  // Reports menampilkan grid 4 metrik + kartu section ber-grid dl.
  return <AdminLoadingSkeleton mode="workspace" metricsCount={4} label="Memuat laporan" />
}
