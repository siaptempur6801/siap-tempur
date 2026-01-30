import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Link href="/" className="absolute top-6 left-6 flex items-center text-sm text-muted-foreground hover:text-white transition">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
            </Link>

            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Buat Akun Baru</h2>
                    <p className="mt-2 text-muted-foreground">Mulai persiapan CPNS-mu hari ini.</p>
                </div>

                <form className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="sr-only">Nama Lengkap</label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                className="relative block w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="Nama Lengkap"
                            />
                        </div>
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
                                autoComplete="new-password"
                                required
                                className="relative block w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="Kata Sandi (Min. 6 karakter)"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            formAction={signup}
                            className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-lg shadow-primary/25"
                        >
                            Daftar Sekarang
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Sudah punya akun? </span>
                    <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                        Masuk
                    </Link>
                </div>
            </div>
        </div>
    )
}
