import { AdminLoadingSkeleton } from '@/components/admin/AdminLoading'

export default function ExamsLoading() {
    // Halaman exams adalah daftar kartu exam + modal; tidak ada baris metrik.
    return <AdminLoadingSkeleton mode="table" label="Memuat exam"/>
}
