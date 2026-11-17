import PaperBackground from '@/components/PaperBackground'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ResetPasswordPage() {
    return (
        <div className="font-sans min-h-screen flex items-center justify-center p-6 bg-[#fdfbf7] relative overflow-hidden">
            <PaperBackground variant="light" />
            <ResetPasswordForm />
        </div>
    )
}
