'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, resendVerificationEmail } from '@/app/auth/actions'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import PaperBackground from '@/components/PaperBackground'

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
    const [returnTo, setReturnTo] = useState('/')
    const router = useRouter()

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const returnUrl = searchParams.get('returnTo')
        if (returnUrl) {
            setReturnTo(returnUrl)
        }
    }, [])
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setUnverifiedEmail(null)
        const formData = new FormData(event.currentTarget)
        const email = formData.get('email') as string

        try {
            const result = await login(formData)
            if (result?.error === 'unverified') {
                setUnverifiedEmail(email)
                toast.error('Email belum diverifikasi')
            } else if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Login Berhasil!', {
                    description: 'Selamat datang kembali!'
                })
                router.push(returnTo !== '/' ? `${returnTo}/dashboard` : '/cpns/dashboard')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat login')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (!unverifiedEmail) return
        setLoading(true)
        try {
            const result = await resendVerificationEmail(unverifiedEmail)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Email verifikasi dikirim ulang!', {
                    description: 'Cek kotak masuk atau spam email Anda.'
                })
                setUnverifiedEmail(null) // Hide the resend button or keep it? Maybe hide to prevent spam
            }
        } catch (error) {
            toast.error('Gagal mengirim ulang email')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="font-sans min-h-screen flex items-center justify-center p-6 bg-[#fdfbf7] relative overflow-hidden">
            <PaperBackground variant="light" />

            <Link href={returnTo} className="absolute top-6 left-6 flex items-center text-sm font-handwriting text-xl font-bold text-gray-800 hover:text-blue-600 transition z-20">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
            </Link>

            <div className="w-full max-w-md space-y-8 relative z-10 bg-white p-8 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl rotate-1">
                {/* Tape Effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                <div className="text-center">
                    <h2 className="font-handwriting text-4xl font-bold tracking-tight text-gray-900">Selamat Datang</h2>
                    <p className="mt-2 text-gray-600 font-handwriting text-xl">Masuk untuk melanjutkan streak belajarmu.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {unverifiedEmail && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700 font-handwriting text-lg">
                                        Email Anda belum diverifikasi. Cek inbox atau klik tombol di bawah.
                                    </p>
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={loading}
                                            className="text-sm font-bold text-yellow-700 hover:text-yellow-600 underline decoration-wavy"
                                        >
                                            <span className="font-handwriting text-lg">Kirim Ulang Email Verifikasi</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-0 sm:text-lg font-handwriting"
                                placeholder="Alamat Email"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-0 sm:text-lg font-handwriting"
                                placeholder="Kata Sandi"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                            </button>
                        </div>
                        <div className="flex justify-end mt-1">
                            <Link href="/forgot-password" className="text-sm font-handwriting text-blue-600 hover:underline decoration-wavy">
                                Lupa Password?
                            </Link>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-xl font-bold font-handwriting text-white hover:bg-blue-600 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="animate-spin" size={24} />}
                            {loading ? 'Sedang Masuk...' : 'Masuk'}
                        </button>
                    </div>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500 font-handwriting text-lg">Atau masuk dengan</span>
                    </div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={async () => {
                            setLoading(true)
                            try {
                                const { loginWithGoogle } = await import('@/app/auth/actions')
                                const result = await loginWithGoogle()
                                if (result?.url) {
                                    window.location.href = result.url
                                } else if (result?.error) {
                                    toast.error(result.error)
                                    setLoading(false)
                                }
                            } catch (error) {
                                toast.error('Gagal menghubungkan ke Google')
                                setLoading(false)
                            }
                        }}
                        disabled={loading}
                        className="flex w-full justify-center items-center gap-3 rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-lg font-bold font-handwriting text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </button>
                </div>

                <div className="text-center text-lg font-handwriting">
                    <span className="text-gray-600">Belum punya akun? </span>
                    <Link href={`/register${returnTo !== '/' ? `?returnTo=${returnTo}` : ''}`} className="font-bold text-blue-600 hover:underline decoration-wavy">
                        Daftar Gratis
                    </Link>
                </div>
            </div >
        </div >
    )
}
