'use client'

import React from 'react'
import Link from 'next/link'
import { SearchX, Home, ArrowLeft } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
import { motion } from 'framer-motion'

export default function NotFound() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative bg-[#fdfbf7] overflow-hidden font-handwriting">
            <PaperBackground />

            <div className="relative z-10 max-w-md w-full text-center">
                {/* 404 Sketchy Illustration */}
                <motion.div
                    initial={{ rotate: -5, scale: 0.9, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    className="mb-8 relative inline-block"
                >
                    <div className="absolute -inset-4 bg-yellow-200/50 -rotate-3 rounded-sm z-0"></div>
                    <div className="relative z-10 bg-white border-4 border-gray-900 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-8xl font-black text-gray-900 block mb-2">404</span>
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                            <SearchX size={32} />
                            <span className="text-2xl font-bold uppercase tracking-widest">Halaman Hilang</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Waduh, Kamu Tersesat?</h2>
                    <p className="text-xl text-gray-600 mb-8 italic">
                        Sepertinya soal atau halaman yang kamu cari sudah pindah atau memang belum ada. Jangan panik, tetap fokus!
                    </p>

                    <div className="flex flex-col gap-4">
                        <Link
                            href="/cpns/dashboard"
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white border-2 border-gray-900 text-2xl font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        >
                            <Home size={24} />
                            Kembali ke Dashboard
                        </Link>

                        <Link
                            href="/"
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 text-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Halaman Utama
                        </Link>
                    </div>
                </motion.div>

                {/* Decorative Elements */}
                <div className="absolute top-0 -right-20 opacity-20 pointer-events-none rotate-12">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                        <path d="M10 10 Q 100 0 190 10 Q 200 100 190 190 Q 100 200 10 190 Q 0 100 10 10" fill="none" stroke="currentColor" strokeWidth="4" />
                        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="120">?</text>
                    </svg>
                </div>
            </div>
        </div>
    )
}
