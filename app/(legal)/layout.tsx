import PaperBackground from '@/components/PaperBackground'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans relative">
            <PaperBackground variant="light" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 font-display text-xl font-bold transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Kembali ke Beranda
                </Link>

                <div className="bg-white p-8 md:p-12 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl relative">
                    {/* Tape Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                    <div className="prose prose-lg prose-gray max-w-none font-body">
                        {children}
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 font-display text-sm">
                    &copy; {new Date().getFullYear()} SiapTempur. Hak Cipta Dilindungi.
                </div>
            </div>
        </div>
    )
}
