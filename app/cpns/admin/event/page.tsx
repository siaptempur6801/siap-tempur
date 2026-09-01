import { redirect } from 'next/navigation'

export default function LegacyEventAdminPage() {
    redirect('/cpns/admin?tab=events')
}
