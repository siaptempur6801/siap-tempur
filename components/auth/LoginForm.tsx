'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, resendVerificationEmail } from '@/app/auth/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { loginResolver, type LoginFormData } from '@/lib/validations/auth-form'
import { resolvePostLoginRedirect, sanitizeAuthReturnTo } from '@/lib/auth-redirect'
import { trackProductEvent } from '@/lib/product-analytics'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

export default function LoginForm({ returnTo }: { returnTo: string }) {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
    const authActionLock = useRef(false)
    const router = useRouter()
    const safeReturnTo = sanitizeAuthReturnTo(returnTo)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: loginResolver,
        defaultValues: { email: '', password: '' },
    })

    const onSubmit = async (data: LoginFormData) => {
        if (!acquireSingleFlightLock(authActionLock)) return

        trackProductEvent('px_auth_intent', { surface: 'auth', cta: 'login', auth_method: 'email' })
        setLoading(true)
        setUnverifiedEmail(null)

        const formData = new FormData()
        formData.append('email', data.email)
        formData.append('password', data.password)

        try {
            const result = await login(formData)
            if (result?.error === 'unverified') {
                setUnverifiedEmail(data.email)
                toast.error('Email belum diverifikasi')
                releaseSingleFlightLock(authActionLock)
                setLoading(false)
            } else if (result?.error) {
                toast.error(result.error)
                releaseSingleFlightLock(authActionLock)
                setLoading(false)
            } else {
                trackProductEvent('px_auth_success', { surface: 'auth', auth_method: 'email' })
                toast.success('Berhasil masuk', { description: 'Lanjutkan belajarmu.' })
                router.push(resolvePostLoginRedirect(safeReturnTo))
            }
        } catch {
            toast.error('Belum bisa masuk', { description: 'Coba lagi beberapa saat.' })
            releaseSingleFlightLock(authActionLock)
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (!unverifiedEmail) return
        if (!acquireSingleFlightLock(authActionLock)) return

        setLoading(true)
        try {
            const result = await resendVerificationEmail(unverifiedEmail)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Email verifikasi sudah dikirim', {
                    description: 'Cek kotak masuk atau folder spam email kamu.',
                })
                setUnverifiedEmail(null)
            }
        } catch {
            toast.error('Email verifikasi belum bisa dikirim', { description: 'Coba lagi beberapa saat.' })
        } finally {
            releaseSingleFlightLock(authActionLock)
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        if (!acquireSingleFlightLock(authActionLock)) return

        trackProductEvent('px_auth_intent', { surface: 'auth', cta: 'login', auth_method: 'google' })
        setLoading(true)
        try {
            const { loginWithGoogle } = await import('@/app/auth/actions')
            const result = await loginWithGoogle(safeReturnTo)
            if (result?.url) {
                window.location.href = result.url
            } else if (result?.error) {
                toast.error(result.error)
                releaseSingleFlightLock(authActionLock)
                setLoading(false)
            }
        } catch {
            toast.error('Belum bisa masuk dengan Google', { description: 'Coba lagi beberapa saat.' })
            releaseSingleFlightLock(authActionLock)
            setLoading(false)
        }
    }

    return (
        <section className="st-card-lg relative mx-auto w-full max-w-lg bg-white p-6 md:p-8" aria-labelledby="login-title">
            <div className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 border-x border-white/60 bg-[var(--st-yellow)]/80" aria-hidden="true" />

            <div>
                <div className="st-kicker">Masuk ke akun</div>
                <h2 id="login-title" className="st-heading-display mt-4 text-4xl md:text-5xl">Selamat datang kembali.</h2>
                <p className="st-muted mt-2 font-semibold">Masuk untuk melanjutkan sesi dan perkembangan belajarmu.</p>
            </div>

            {unverifiedEmail && (
                <div className="mt-6 border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] p-4" role="alert">
                    <p className="font-black">Email kamu belum diverifikasi.</p>
                    <p className="st-muted mt-1 text-sm font-semibold">Cek kotak masuk atau kirim ulang email verifikasi.</p>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="st-focus mt-3 inline-flex min-h-11 items-center text-sm font-black text-blue-700 underline underline-offset-4 disabled:opacity-50"
                    >
                        Kirim ulang email verifikasi
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
                <div>
                    <label htmlFor="email-address" className="mb-1.5 block text-sm font-black">Alamat email</label>
                    <input
                        id="email-address"
                        type="email"
                        autoComplete="email"
                        {...register('email')}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'login-email-error' : undefined}
                        className={`st-input ${errors.email ? 'border-red-600' : ''}`}
                        placeholder="nama@email.com"
                    />
                    {errors.email && <p id="login-email-error" role="alert" className="mt-1.5 text-sm font-bold text-red-700">{errors.email.message}</p>}
                </div>

                <div>
                    <div className="flex items-center justify-between gap-3">
                        <label htmlFor="password" className="block text-sm font-black">Kata sandi</label>
                        <Link href="/forgot-password" className="st-focus text-sm font-black text-blue-700 hover:underline">Lupa kata sandi?</Link>
                    </div>
                    <div className="relative mt-1.5">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            {...register('password')}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? 'login-password-error' : undefined}
                            className={`st-input pr-14 ${errors.password ? 'border-red-600' : ''}`}
                            placeholder="Masukkan kata sandi"
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
                    {errors.password && <p id="login-password-error" role="alert" className="mt-1.5 text-sm font-bold text-red-700">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="st-button inline-flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading && <Loader2 className="animate-spin" size={19} />}
                    {loading ? 'Memproses...' : 'Masuk'}
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
                Masuk dengan Google
            </button>

            <p className="mt-7 text-center text-sm font-semibold text-gray-600">
                Belum punya akun?{' '}
                <Link href={`/register?returnTo=${encodeURIComponent(safeReturnTo)}`} className="st-focus font-black text-blue-700 hover:underline">Daftar gratis</Link>
            </p>
        </section>
    )
}
