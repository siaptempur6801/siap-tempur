import { AdminLoadingSkeleton } from '@/components/admin/AdminLoading'

export default function EntitlementsLoading() {
    // Halaman entitlements menampilkan 5 metrik (xl:grid-cols-5).
    return <AdminLoadingSkeleton mode="workspace" metricsCount={5} label="Memuat entitlements"/>
}
