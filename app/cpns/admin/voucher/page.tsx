import { redirect } from 'next/navigation'

export default function LegacyVoucherAdminPage() {
    redirect('/cpns/admin?error=Voucher%2Fpromosi%20Schema%20V2%20belum%20tersedia.%20Gunakan%20fitur%20ini%20setelah%20migrasi%20promosi%20selesai.')
}
