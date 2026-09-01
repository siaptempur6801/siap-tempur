import { redirect } from 'next/navigation'

export default async function LegacyEditQuestionPage({ params }: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    redirect(`/cpns/admin?tab=questions&edit=${encodeURIComponent(id)}`)
}
