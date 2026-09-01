import { redirect } from 'next/navigation'

export default function LegacyFinanceAdminPage() {
    redirect('/cpns/admin?tab=commerce')
}
