import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ForgotPasswordPage() {
  return (
    <main className="st-product relative min-h-screen overflow-hidden bg-[var(--st-paper)] px-4 py-6 font-body md:px-8">
      <div
        className="pointer-events-none absolute -left-20 bottom-14 h-52 w-52 rounded-full border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-10 top-24 h-44 w-36 rotate-12 border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <Link
          href="/login"
          className="st-focus inline-flex min-h-11 w-fit items-center gap-2 font-black text-gray-700 hover:text-blue-700"
        >
          <ArrowLeft size={18} /> Kembali ke login
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  )
}
