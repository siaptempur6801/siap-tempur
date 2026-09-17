import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import { MascotPair } from '@/components/brand/Mascot'
import { sanitizeAuthReturnTo } from '@/lib/auth-redirect'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
    const returnTo = sanitizeAuthReturnTo((await searchParams).returnTo)

    return (
        <main className="st-product relative min-h-screen overflow-hidden bg-[var(--st-paper)] px-4 py-6 font-body md:px-8">
            <div className="pointer-events-none absolute -left-24 bottom-10 h-52 w-52 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-12 top-20 h-52 w-40 rotate-12 border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]" aria-hidden="true" />

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
                <Link href={returnTo} className="st-focus inline-flex min-h-11 w-fit items-center gap-2 font-black text-gray-700 hover:text-blue-700">
                    <ArrowLeft size={18} /> Kembali
                </Link>

                <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                    <section className="hidden lg:block">
                        <div className="st-kicker">Satu akun SiapTempur</div>
                        <h1 className="st-heading-display mt-5 text-6xl">Masuk dan lanjutkan dari progres terakhir.</h1>
                        <p className="st-muted mt-5 max-w-xl text-lg font-semibold leading-relaxed">
                            Akun yang sama digunakan untuk CPNS dan TKA yang tersedia. Sesi, hasil, token, dan perkembangan belajar tetap tersimpan sesuai jalur belajarmu.
                        </p>
                        <MascotPair size="md" tone="soft" priority className="mt-8" />
                    </section>

                    <LoginForm returnTo={returnTo} />
                </div>
            </div>
        </main>
    )
}
