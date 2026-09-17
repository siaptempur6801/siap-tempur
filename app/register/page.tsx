import Link from 'next/link'
import { MascotBubble } from '@/components/brand/playful'
import { ArrowLeft } from 'lucide-react'
import RegisterForm from '@/components/auth/RegisterForm'
import { sanitizeAuthReturnTo } from '@/lib/auth-redirect'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
    const returnTo = sanitizeAuthReturnTo((await searchParams).returnTo)

    return (
        <main className="st-product relative min-h-screen overflow-hidden bg-[var(--st-paper)] px-4 py-6 font-body md:px-8">
            <div className="pointer-events-none absolute -left-16 top-32 h-44 w-44 -rotate-6 border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-20 bottom-16 h-52 w-52 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
                <Link href={returnTo} className="st-focus inline-flex min-h-11 w-fit items-center gap-2 font-black text-gray-700 hover:text-blue-700">
                    <ArrowLeft size={18} /> Kembali
                </Link>

                <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                    <section className="hidden lg:block">
                        <div className="st-kicker">Mulai dari satu akun</div>
                        <h1 className="st-heading-display mt-5 text-6xl">Buat akun, pilih jalur, lalu mulai belajar.</h1>
                        <p className="st-muted mt-5 max-w-xl text-lg font-semibold leading-relaxed">
                            Akun SiapTempur menyimpan sesi, hasil, token, dan perkembangan belajar untuk produk yang tersedia. Kamu tidak perlu membuat akun terpisah untuk CPNS dan TKA.
                        </p>
                        <MascotBubble name="tama" size="sm" bubbleTone="blue" priority className="mt-8">
                            Satu akun untuk CPNS dan TKA. Bikin akun, pilih jalur, lalu mulai dari latihan singkat dulu.
                        </MascotBubble>
                    </section>

                    <RegisterForm returnTo={returnTo} />
                </div>
            </div>
        </main>
    )
}
