'use client'

import { motion } from 'framer-motion'
import { 
    Monitor, 
    ArrowRight, 
    Play, 
    Clock, 
    Headphones, 
    Ticket, 
    Sparkles,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

export default function ToeflLatihanPage() {
    const tests = [
        {
            id: 'toefl-full-1',
            title: 'Diagnostic Test TOEFL ITP #1',
            description: 'Simulasi lengkap 140 soal (Listening, Structure, Reading).',
            duration: '115 Menit',
            difficulty: 'Standard',
            count: 140,
            image: '/illustrations/toefl-study.svg' 
        },
        {
            id: 'toefl-full-2',
            title: 'TOEFL ITP Simulation #2',
            description: 'Uji kemampuan kamu dengan paket soal terbaru.',
            duration: '115 Menit',
            difficulty: 'Standard',
            count: 140,
            image: '/illustrations/toefl-exam.svg'
        }
    ]

    return (
        <div className="max-w-6xl mx-auto space-y-12 font-handwriting py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 border-2 border-gray-900 text-blue-900 font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-1"
                    >
                        <Play size={18} fill="currentColor" /> Ready to Test?
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900">
                        Simulasi <span className="text-blue-600 underline decoration-wavy decoration-3">TOEFL ITP</span>
                    </h1>
                </div>
                
                <div className="flex items-center gap-4 bg-white border-2 border-gray-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-1">
                    <div className="p-3 bg-yellow-400 border border-gray-900 text-gray-900">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black text-gray-400 uppercase leading-none mb-1">Stock Amunisi</div>
                        <div className="text-2xl font-black text-gray-900 leading-none">Ready</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tests.map((test) => (
                    <motion.div
                        key={test.id}
                        whileHover={{ y: -5 }}
                        className="group bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                    >
                        <div className="h-48 bg-blue-50 border-b-2 border-gray-900 relative overflow-hidden flex items-center justify-center">
                            <Monitor size={80} className="text-blue-200 group-hover:text-blue-300 transition-colors" />
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-100/50 to-transparent" />
                            <div className="absolute top-4 right-4 bg-white border-2 border-gray-900 px-3 py-1 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {test.count} Soal
                            </div>
                        </div>

                        <div className="p-8 flex-1 flex flex-col">
                            <h3 className="text-2xl font-black mb-3 group-hover:text-blue-600 transition-colors">{test.title}</h3>
                            <p className="text-gray-500 font-bold mb-6 flex-1">{test.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Clock size={16} className="text-blue-500" />
                                    {test.duration}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Headphones size={16} className="text-blue-500" />
                                    Full Audio
                                </div>
                            </div>

                            <Link 
                                href={`/toefl/dashboard/latihan/${test.id}`}
                                className="w-full py-4 bg-gray-900 text-white font-black text-xl uppercase tracking-tighter shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-3 transition-all hover:bg-blue-600 hover:shadow-none translate-x-0 hover:translate-x-1 hover:translate-y-1"
                            >
                                Mulai Simulasi <ArrowRight size={20} />
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-blue-50 border-2 border-gray-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-blue-200 opacity-50 rotate-12" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="p-4 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-3 shrink-0">
                        <AlertCircle size={40} className="text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black text-gray-900 uppercase">Penting Sebelum Memulai!</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 font-bold text-sm">
                            <p className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                Gunakan Earphone/Headphone untuk Section Listening.
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                Pastikan koneksi internet stabil selama 2 jam kedepan.
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                Tiket/Token akan terpotong saat kamu klik "Mulai".
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                Hasil scoring dihitung otomatis menggunakan standar ITP.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
