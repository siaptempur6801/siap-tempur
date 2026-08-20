import { redirect } from 'next/navigation'

export default function LegacyTryoutAkbarPage() {
    redirect('/cpns/admin?tab=events')
}
