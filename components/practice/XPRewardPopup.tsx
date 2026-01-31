'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trophy, Star, Sparkles, X } from 'lucide-react'
import confetti from 'canvas-confetti'

interface XPRewardPopupProps {
    xpEarned: number
    previousXP: number
    newXP: number
    previousLevel: number
    newLevel: number
    newLevelName: string
    progress: number  // Percentage to next level
    xpToNext: number  // XP needed for next level
    show: boolean
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
    onClose
}: XPRewardPopupProps) {
    const [step, setStep] = useState<'xp' | 'levelup'>('xp')
    const [displayXP, setDisplayXP] = useState(0)
    const [animationDone, setAnimationDone] = useState(false)
    const leveledUp = newLevel > previousLevel

    // Animate XP counter
    useEffect(() => {
        if (!show) {
            setStep('xp')
            setDisplayXP(0)
            setAnimationDone(false)
            return
        }

        const duration = 1500
        const steps = 30
        const increment = xpEarned / steps
        let current = 0
        let count = 0

        const timer = setInterval(() => {
            count++
            current += increment
            setDisplayXP(Math.min(Math.round(current), xpEarned))

            if (count >= steps) {
                clearInterval(timer)
                setDisplayXP(xpEarned)

                // After XP animation, check for level up
                setTimeout(() => {
                    if (leveledUp) {
                        setStep('levelup')
                        // Fire confetti for level up
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        })
                    }
                    setAnimationDone(true)
                }, 800)
            }
        }, duration / steps)

        return () => clearInterval(timer)
    }, [show, xpEarned, leveledUp])

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-yellow-500/20 overflow-hidden"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white/70 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Background glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-purple-500/10" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/30 rounded-full blur-3xl" />

                        {/* XP Earned Step */}
                        {step === 'xp' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative z-10 text-center"
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: Infinity,
                                        repeatDelay: 1
                                    }}
                                    className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30"
                                >
                                    <Zap className="w-10 h-10 text-white" />
                                </motion.div>

                                <h2 className="text-lg font-semibold text-yellow-400 mb-2">XP Diraih!</h2>

                                <motion.div
                                    className="text-6xl font-black text-white mb-2"
                                    animate={{ scale: displayXP === xpEarned ? [1, 1.1, 1] : 1 }}
                                >
                                    +{displayXP}
                                </motion.div>

                                <p className="text-muted-foreground text-sm">
                                    Total XP: {previousXP.toLocaleString()} → {newXP.toLocaleString()}
                                </p>

                                {/* Progress bar to next level */}
                                <div className="mt-6">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Level {newLevel}</span>
                                        <span>{xpToNext > 0 ? `${xpToNext.toLocaleString()} XP lagi` : 'MAX'}</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500"
                                            initial={{ width: '0%' }}
                                            animate={{ width: leveledUp ? '100%' : `${progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </div>
                                    <p className="text-xs text-center text-muted-foreground mt-1">
                                        {progress}% menuju Level {newLevel + 1}
                                    </p>
                                </div>

                                {/* Close button - only show after animation */}
                                {animationDone && !leveledUp && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={onClose}
                                        className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl hover:from-yellow-600 hover:to-amber-700 transition-all shadow-lg shadow-yellow-500/30"
                                    >
                                        Lanjutkan
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {/* Level Up Step */}
                        {step === 'levelup' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative z-10 text-center"
                            >
                                <motion.div
                                    animate={{
                                        y: [0, -10, 0],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                    }}
                                    className="w-24 h-24 mx-auto mb-4"
                                >
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50">
                                            <Trophy className="w-12 h-12 text-white" />
                                        </div>
                                        {/* Sparkles around */}
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0"
                                        >
                                            <Star className="absolute -top-2 left-1/2 w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <Star className="absolute top-1/2 -right-2 w-3 h-3 text-pink-400 fill-pink-400" />
                                            <Star className="absolute -bottom-1 left-1/4 w-3 h-3 text-purple-400 fill-purple-400" />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                <motion.h2
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                    className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent mb-2"
                                >
                                    LEVEL UP!
                                </motion.h2>

                                <div className="flex items-center justify-center gap-4 my-4">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-muted-foreground">{previousLevel}</div>
                                        <div className="text-xs text-muted-foreground">Before</div>
                                    </div>
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                    >
                                        <Sparkles className="w-6 h-6 text-yellow-400" />
                                    </motion.div>
                                    <div className="text-center">
                                        <div className="text-4xl font-black text-white">{newLevel}</div>
                                        <div className="text-xs text-primary font-bold">{newLevelName}</div>
                                    </div>
                                </div>

                                <p className="text-muted-foreground text-sm mb-6">
                                    Selamat! Kamu naik ke level {newLevel}! 🎉
                                </p>

                                {/* Close button */}
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={onClose}
                                    className="px-8 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/30"
                                >
                                    Mantap! 🚀
                                </motion.button>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

