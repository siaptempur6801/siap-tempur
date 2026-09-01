import { redirect } from 'next/navigation'

export default function LegacyExportAdminPage() {
    redirect('/cpns/admin?error=Export%20operasional%20Schema%20V2%20belum%20tersedia.%20Jalur%20export%20legacy%20sudah%20dinonaktifkan.')
}
