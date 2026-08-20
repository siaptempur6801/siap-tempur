import { redirect } from 'next/navigation'

export default function LegacyCreateQuestionPage() {
    redirect('/cpns/admin?tab=questions')
}
