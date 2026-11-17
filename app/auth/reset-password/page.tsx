import PaperBackground from '@/components/PaperBackground'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ResetPasswordPage() {
  return (
    <div className="st-product relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-8 font-body sm:px-6">
      <PaperBackground variant="light" />
      <ResetPasswordForm />
    </div>
  )
}
