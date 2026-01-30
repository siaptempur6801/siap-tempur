'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login } from '@/app/auth/actions'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        try {
            const result = await login(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Login Berhasil!', {
                    description: 'Selamat datang kembali!'
                })
                router.push('/dashboard')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Link href="/" className="absolute top-6 left-6 flex items-center text-sm text-muted-foreground hover:text-white transition">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
            </Link>

            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Selamat Datang</h2>
                    <p className="mt-2 text-muted-foreground">Masuk untuk melanjutkan streak belajarmu.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
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
                                className="relative block w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 pr-12 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="Kata Sandi"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {loading ? 'Sedang Masuk...' : 'Masuk'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Belum punya akun? </span>
                    <Link href="/register" className="font-medium text-primary hover:text-primary/80">
                        Daftar Gratis
                    </Link>
                </div>
            </div>
        </div>
    )
}
