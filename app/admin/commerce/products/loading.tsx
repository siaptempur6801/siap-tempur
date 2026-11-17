import { AdminLoadingSkeleton } from '@/components/admin/AdminLoading'

export default function ProductsLoading() {
  // Halaman products adalah toolbar + daftar kartu tanpa baris metrik.
  return <AdminLoadingSkeleton mode="table" label="Memuat produk" />
}
