'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/auth/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { registerResolver, type RegisterFormData } from '@/lib/validations/auth-form'
import { sanitizeAuthReturnTo } from '@/lib/auth-redirect'
import { trackProductEvent } from '@/lib/product-analytics'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

export default function RegisterForm({ returnTo }: { returnTo: string }) {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const authActionLock = useRef(false)
    const router = useRouter()
    const safeReturnTo = sanitizeAuthReturnTo(returnTo)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: registerResolver,
        defaultValues: { fullName: '', email: '', password: '' },
    })

    const onSubmit = async (data: RegisterFormData) => {
        if (!acquireSingleFlightLock(authActionLock)) return

        trackProductEvent('px_auth_intent', { surface: 'auth', cta: 'register', auth_method: 'email' })
        setLoading(true)
        let isNavigating = false

        const formData = new FormData()
        formData.append('fullName', data.fullName)
        formData.append('email', data.email)
        formData.append('password', data.password)

        try {
            const result = await signup(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                trackProductEvent('px_auth_success', { surface: 'auth', auth_method: 'email' })
                toast.success('Akun berhasil dibuat', {
                    description: 'Cek kotak masuk atau folder spam email kamu untuk verifikasi akun.',
                    duration: 5000,
                })
                router.push(`/login?verified=false&returnTo=${encodeURIComponent(safeReturnTo)}`)
                isNavigating = true
            }
        } catch {
            toast.error('Akun belum bisa dibuat', { description: 'Coba lagi beberapa saat.' })
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(authActionLock)
                setLoading(false)
            }
        }
    }

    const handleGoogleLogin = async () => {
        if (!acquireSingleFlightLock(authActionLock)) return

        trackProductEvent('px_auth_intent', { surface: 'auth', cta: 'register', auth_method: 'google' })
        setLoading(true)
        let isNavigating = false
        try {
            const { loginWithGoogle } = await import('@/app/auth/actions')
            const result = await loginWithGoogle(safeReturnTo)
            if (result?.url) {
                window.location.href = result.url
                isNavigating = true
            } else if (result?.error) {
                toast.error(result.error)
            }
        } catch {
            toast.error('Belum bisa daftar dengan Google', { description: 'Coba lagi beberapa saat.' })
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(authActionLock)
                setLoading(false)
            }
        }
    }

    return (
        <section className="st-card-lg relative mx-auto w-full max-w-lg bg-white p-6 md:p-8" aria-labelledby="register-title">
            <div className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rotate-2 border-x border-white/60 bg-blue-100/80" aria-hidden="true" />

            <div>
                <div className="st-kicker">Buat akun</div>
                <h2 id="register-title" className="st-heading-display mt-4 text-4xl md:text-5xl">Mulai belajar dengan satu akun.</h2>
                <p className="st-muted mt-2 font-semibold">Daftar untuk menyimpan sesi, hasil, token, dan perkembangan belajar.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
                <div>
                    <label htmlFor="fullName" className="mb-1.5 block text-sm font-black">Nama lengkap</label>
                    <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        {...register('fullName')}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? 'register-name-error' : undefined}
                        className={`st-input ${errors.fullName ? 'border-red-600' : ''}`}
                        placeholder="Nama lengkap kamu"
                    />
                    {errors.fullName && <p id="register-name-error" role="alert" className="mt-1.5 text-sm font-bold text-red-700">{errors.fullName.message}</p>}
                </div>

                <div>
                    <label htmlFor="register-email-address" className="mb-1.5 block text-sm font-black">Alamat email</label>
                    <input
                        id="register-email-address"
                        type="email"
                        autoComplete="email"
                        {...register('email')}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'register-email-error' : undefined}
                        className={`st-input ${errors.email ? 'border-red-600' : ''}`}
                        placeholder="nama@email.com"
                    />
                    {errors.email && <p id="register-email-error" role="alert" className="mt-1.5 text-sm font-bold text-red-700">{errors.email.message}</p>}
                </div>

                <div>
                    <label htmlFor="register-password" className="mb-1.5 block text-sm font-black">Kata sandi</label>
                    <div className="relative">
                        <input
                            id="register-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            {...register('password')}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? 'register-password-error' : 'register-password-hint'}
                            className={`st-input pr-14 ${errors.password ? 'border-red-600' : ''}`}
                            placeholder="Buat kata sandi"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                            aria-pressed={showPassword}
                            className="st-focus absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-600 hover:bg-blue-50"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <p id="register-password-hint" className="mt-1.5 text-xs font-semibold text-gray-500">Gunakan minimal 8 karakter.</p>
                    {errors.password && <p id="register-password-error" role="alert" className="mt-1 text-sm font-bold text-red-700">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="st-button inline-flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading && <Loader2 className="animate-spin" size={19} />}
                    {loading ? 'Membuat akun...' : 'Daftar gratis'}
                </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
                <span className="h-px flex-1 bg-gray-300" /> atau <span className="h-px flex-1 bg-gray-300" />
            </div>

            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="st-button flex min-h-12 w-full items-center justify-center gap-3 bg-white px-5 py-3 font-black text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Daftar dengan Google
            </button>

            <p className="mt-7 text-center text-sm font-semibold text-gray-600">
                Sudah punya akun?{' '}
                <Link href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`} className="st-focus font-black text-blue-700 hover:underline">Masuk</Link>
            </p>
        </section>
    )
}
