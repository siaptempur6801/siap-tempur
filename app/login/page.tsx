import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
import LoginForm from '@/components/auth/LoginForm'
import { sanitizeAuthReturnTo } from '@/lib/auth-redirect'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
    const returnTo = sanitizeAuthReturnTo((await searchParams).returnTo)

    return (
        <div className="font-sans min-h-screen flex items-center justify-center p-6 bg-[#fdfbf7] relative overflow-hidden">
            <PaperBackground variant="light" />

            <Link href={returnTo} className="absolute top-6 left-6 flex items-center font-handwriting text-xl font-bold text-gray-800 hover:text-blue-600 transition z-20">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
            </Link>

            <LoginForm returnTo={returnTo} />
        </div>
    )
}
