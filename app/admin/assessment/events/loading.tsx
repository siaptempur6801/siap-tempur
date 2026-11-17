import { AdminLoadingSkeleton } from '@/components/admin/AdminLoading'

export default function EventsLoading() {
    // Halaman events adalah toolbar + daftar kartu event tanpa baris metrik.
    return <AdminLoadingSkeleton mode="table" label="Memuat event"/>
}
