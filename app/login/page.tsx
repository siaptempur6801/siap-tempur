import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
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

                <form className="mt-8 space-y-6">
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
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="Kata Sandi"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-lg shadow-primary/25"
                        >
                            Masuk
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
