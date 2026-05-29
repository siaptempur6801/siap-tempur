'use client'

import { useState } from 'react'
import { forgotPassword } from '@/app/auth/actions'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordForm() {
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        try {
            const result = await forgotPassword(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                setSent(true)
                toast.success('Email Terkirim!', {
                    description: 'Silakan cek inbox atau spam email Anda untuk me-reset password.'
                })
            }
        } catch {
            toast.error('Gagal mengirim email')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 relative z-10 bg-white p-8 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl rotate-1">
            {/* Tape Effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

            <div className="text-center">
                <h2 className="font-handwriting text-4xl font-bold tracking-tight text-gray-900">Lupa Password?</h2>
                <p className="mt-2 text-gray-600 font-handwriting text-xl">
                    {sent ? 'Email reset password telah dikirim!' : 'Masukkan email Anda untuk menerima link reset.'}
                </p>
            </div>

            {sent ? (
                <div className="mt-8 text-center space-y-6">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <Mail className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800">Cek email Anda dan klik link di dalamnya untuk membuat password baru.</p>
                    </div>
                    <button
                        onClick={() => setSent(false)}
                        className="text-blue-600 font-bold hover:underline font-handwriting text-xl"
                    >
                        Kirim ulang?
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email-address" className="sr-only">Email address</label>
                        <input
                            id="email-address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="relative block w-full rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-0 sm:text-lg font-handwriting"
                            placeholder="Alamat Email Terdaftar"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-xl font-bold font-handwriting text-white hover:bg-blue-600 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="animate-spin" size={24} />}
                            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
