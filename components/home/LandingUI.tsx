'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Shield, Zap, LayoutDashboard } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function LandingUI({ user }: { user: User | null }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px]" />
            </div>

            <nav className="absolute top-0 w-full p-6 flex justify-between items-center max-w-7xl mx-auto z-50">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                    CPNS PRO
                </div>
                <div className="space-x-4 flex items-center">
                    {user ? (
                        <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition shadow-lg shadow-primary/25 flex items-center gap-2">
                            <LayoutDashboard size={16} />
                            Dashboard Kamu
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition">
                                Masuk
                            </Link>
                            <Link href="/register" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition shadow-lg shadow-primary/25">
                                Daftar Sekarang
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 text-center z-10 space-y-8 pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                        Lolos CPNS <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-300%">
                            Bukan Sekedar Mimpi
                        </span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-xl text-muted-foreground max-w-2xl mx-auto"
                >
                    Platform belajar CPNS #1 dengan sistem CAT BKN standar resmi.
                    Scoring akurat, materi terupdate, dan fitur streak untuk
                    membangun kebiasaan belajar.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
                >
                    <Link
                        href={user ? "/dashboard" : "/register"}
                        className="px-8 py-4 rounded-xl bg-white text-black font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-white/10"
                    >
                        {user ? 'Lanjut Belajar' : 'Mulai Belajar'}
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        href="#features"
                        className="px-8 py-4 rounded-xl bg-secondary/50 border border-secondary text-white font-medium text-lg hover:bg-secondary hover:border-primary/50 transition-colors"
                    >
                        Lihat Fitur
                    </Link>
                </motion.div>

                {/* Feature Grid */}
                <motion.div
                    id="features"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20 text-left"
                >
                    <FeatureCard
                        icon={<Shield className="w-8 h-8 text-primary" />}
                        title="Scoring Akurat"
                        description="Sistem penilaian 100% mengikuti aturan resmi CAT BKN (TWK, TIU, TKP) dengan server-side validation."
                    />
                    <FeatureCard
                        icon={<Zap className="w-8 h-8 text-accent" />}
                        title="Belajar Konsisten"
                        description="Bangun kebiasaan dengan fitur Streak ala Duolingo. XP, Level, dan Achievement menanti."
                    />
                    <FeatureCard
                        icon={<CheckCircle className="w-8 h-8 text-green-400" />}
                        title="Materi Premium"
                        description="Ribuan soal latihan dan materi video eksklusif yang disusun oleh mentor berpengalaman."
                    />
                </motion.div>
            </main>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 hover:border-primary/50 transition-colors backdrop-blur-sm">
            <div className="mb-4 p-3 bg-secondary/50 w-fit rounded-xl">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    )
}
