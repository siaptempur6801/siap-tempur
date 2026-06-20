'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/auth/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, RegisterFormData } from '@/lib/validations/auth'
import { sanitizeAuthReturnTo } from '@/lib/auth-redirect'

export default function RegisterForm({ returnTo }: { returnTo: string }) {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const safeReturnTo = sanitizeAuthReturnTo(returnTo)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
        }
    })

    const onSubmit = async (data: RegisterFormData) => {
        setLoading(true)
        
        // Convert to FormData for Server Action
        const formData = new FormData()
        formData.append('fullName', data.fullName)
        formData.append('email', data.email)
        formData.append('password', data.password)

        try {
            const result = await signup(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Pendaftaran Berhasil!', {
                    description: 'Silakan cek kotak masuk atau spam email Anda untuk verifikasi akun.',
                    duration: 5000,
                })
                router.push(`/login?verified=false&returnTo=${encodeURIComponent(safeReturnTo)}`)
            }
        } catch {
            toast.error('Terjadi kesalahan saat pendaftaran')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
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
        } catch {
            toast.error('Gagal menghubungkan ke Google')
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 relative z-10 bg-white p-6 md:p-8 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl rotate-1">
            {/* Tape Effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-pink-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

            <div className="text-center">
                <h2 className="font-handwriting text-4xl font-bold tracking-tight text-gray-900">Buat Akun Baru</h2>
                <p className="mt-2 text-gray-600 font-handwriting text-xl">Mulai persiapan SKD-mu hari ini.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="sr-only">Nama Lengkap</label>
                        <input
                            id="fullName"
                            type="text"
                            {...register('fullName')}
                            className={`relative block w-full rounded-lg border-2 bg-[#fdfbf7] px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-lg font-handwriting ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-900 focus:border-blue-600'}`}
                            placeholder="Nama Lengkap"
                        />
                        {errors.fullName && (
                            <p className="mt-1 text-sm text-red-600 font-handwriting">{errors.fullName.message}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="email-address" className="sr-only">Email address</label>
                        <input
                            id="email-address"
                            type="email"
                            autoComplete="email"
                            {...register('email')}
                            className={`relative block w-full rounded-lg border-2 bg-[#fdfbf7] px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-lg font-handwriting ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-900 focus:border-blue-600'}`}
                            placeholder="Alamat Email"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600 font-handwriting">{errors.email.message}</p>
                        )}
                    </div>
                    <div>
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                {...register('password')}
                                className={`relative block w-full rounded-lg border-2 bg-[#fdfbf7] px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-lg font-handwriting ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-900 focus:border-blue-600'}`}
                                placeholder="Kata Sandi (Min. 8 karakter)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600 font-handwriting">{errors.password.message}</p>
                        )}
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-xl font-bold font-handwriting text-white hover:bg-blue-600 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="animate-spin" size={24} />}
                        {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                    </button>
                </div>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500 font-handwriting text-lg">Atau daftar dengan</span>
                </div>
            </div>

            <div>
                <button
                    type="button"
                    onClick={handleGoogleLogin}
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
                <span className="text-gray-600">Sudah punya akun? </span>
                <Link href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`} className="font-bold text-blue-600 hover:underline decoration-wavy">
                    Masuk
                </Link>
            </div>
        </div>
    )
}
