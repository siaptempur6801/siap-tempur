'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Sparkles, Trophy, X, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

interface XPRewardPopupProps {
    xpEarned: number
    previousXP: number
    newXP: number
    previousLevel: number
    newLevel: number
    newLevelName: string
    progress: number
    xpToNext: number
    show: boolean
    streakCount?: number
    isStreak?: boolean
    onClose: () => void
}

export default function XPRewardPopup({
    xpEarned,
    previousXP,
    newXP,
    previousLevel,
    newLevel,
    newLevelName,
    progress,
    xpToNext,
    show,
    streakCount = 0,
    isStreak = false,
    onClose,
}: XPRewardPopupProps) {
    const leveledUp = newLevel > previousLevel

    useEffect(() => {
        if (!show) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)

        if (leveledUp) {
            void confetti({ particleCount: 90, spread: 65, origin: { y: 0.62 } })
        }

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [leveledUp, onClose, show])

    return (
        <AnimatePresence>
            {show ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) onClose()
                    }}
                >
                    <motion.section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="xp-reward-title"
                        initial={{ scale: 0.94, y: 24 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.96, y: 18 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                        className="relative w-full max-w-md overflow-hidden border-2 border-slate-950 bg-white p-6 shadow-[8px_8px_0_#111827] md:p-7"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="st-focus absolute right-3 top-3 flex h-10 w-10 items-center justify-center border-2 border-slate-950 bg-white text-slate-700 transition hover:bg-slate-100"
                            aria-label="Tutup reward XP"
                        >
                            <X size={19} />
                        </button>

                        <div className="flex h-14 w-14 items-center justify-center border-2 border-slate-950 bg-yellow-300 shadow-[3px_3px_0_#111827]">
                            {leveledUp ? <Trophy size={27} aria-hidden="true" /> : <Zap size={27} aria-hidden="true" />}
                        </div>

                        <div className="mt-5 pr-10">
                            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                                <Sparkles size={16} aria-hidden="true" /> {leveledUp ? 'Level baru tercapai' : 'Reward sesi'}
                            </p>
                            <h2 id="xp-reward-title" className="st-heading-display mt-2 text-3xl md:text-4xl">
                                +{xpEarned.toLocaleString('id-ID')} XP
                            </h2>
                            <p className="mt-2 text-sm font-bold text-slate-600">
                                Total XP naik dari {previousXP.toLocaleString('id-ID')} menjadi {newXP.toLocaleString('id-ID')}.
                            </p>
                        </div>

                        <div className="mt-6 border-y-2 border-slate-950 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Level {newLevel}</p>
                                    <p className="mt-1 text-xl font-black text-slate-950">{newLevelName}</p>
                                </div>
                                {isStreak ? (
                                    <div className="flex items-center gap-2 bg-orange-100 px-3 py-2 text-sm font-black text-orange-800">
                                        <Flame size={18} aria-hidden="true" /> {streakCount} hari
                                    </div>
                                ) : null}
                            </div>

                            <div
                                className="mt-4 h-4 overflow-hidden border-2 border-slate-950 bg-slate-100"
                                role="progressbar"
                                aria-label="Progres level"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                            >
                                <motion.div
                                    className="h-full bg-blue-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.7, delay: 0.15 }}
                                />
                            </div>
                            <p className="mt-2 text-xs font-bold text-slate-500">
                                {xpToNext > 0 ? `${xpToNext.toLocaleString('id-ID')} XP lagi menuju level berikutnya.` : 'Kamu sudah mencapai level tertinggi.'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="st-button st-focus mt-6 inline-flex min-h-11 w-full items-center justify-center bg-blue-600 px-5 py-3 text-sm font-black text-white"
                        >
                            Lanjut lihat hasil
                        </button>
                    </motion.section>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
