'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trophy, Star, Sparkles, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import PaperBackground from '@/components/PaperBackground'

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
    streakCount,
    isStreak,
    onClose
}: XPRewardPopupProps) {
    const [step, setStep] = useState<'xp' | 'streak' | 'levelup'>('xp')
    const [displayXP, setDisplayXP] = useState(0)
    const [animationDone, setAnimationDone] = useState(false)
    const leveledUp = newLevel > previousLevel

    // Sequence controller
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
        let count = 0

        const timer = setInterval(() => {
            count++
            setDisplayXP(Math.min(Math.round(increment * count), xpEarned))

            if (count >= steps) {
                clearInterval(timer)
                setDisplayXP(xpEarned)

                // Sequence Transition
                setTimeout(() => {
                    if (isStreak) {
                        setStep('streak')
                        // Auto transition to levelup after streak if applicable
                        setTimeout(() => {
                            if (leveledUp) {
                                setStep('levelup')
                                confetti({
                                    particleCount: 100,
                                    spread: 70,
                                    origin: { y: 0.6 }
                                })
                            }
                            setAnimationDone(true)
                        }, 2500)
                    } else if (leveledUp) {
                        setStep('levelup')
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        })
                        setAnimationDone(true)
                    } else {
                        setAnimationDone(true)
                    }
                }, 1000)
            }
        }, duration / steps)

        return () => clearInterval(timer)
    }, [show, xpEarned, leveledUp, isStreak])

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
                        className="relative bg-[#fff9c4] border-2 border-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden font-handwriting"
                    >
                        <PaperBackground />
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/5 hover:bg-black/10 transition text-gray-700 hover:text-black"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Background doodle/decor */}
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Sparkles className="w-12 h-12 text-gray-900" />
                        </div>

                        {/* XP Earned Step */}
                        {step === 'xp' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative z-10 text-center"
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 3, -3, 0]
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: Infinity,
                                        repeatDelay: 1
                                    }}
                                    className="w-20 h-20 mx-auto mb-4 bg-yellow-400 border-2 border-gray-900 rounded-full flex items-center justify-center shadow-md rotate-3"
                                >
                                    <Zap className="w-10 h-10 text-gray-900 fill-current" />
                                </motion.div>

                                <h2 className="text-2xl font-bold text-gray-800 mb-2">XP Diraih! ✨</h2>

                                <motion.div
                                    className="text-7xl font-black text-gray-900 mb-2 font-sans tracking-tight"
                                    animate={{ scale: displayXP === xpEarned ? [1, 1.1, 1] : 1 }}
                                >
                                    +{displayXP}
                                </motion.div>

                                <p className="text-gray-600 text-lg font-bold">
                                    Total: <span className="font-sans">{previousXP.toLocaleString()}</span> → <span className="font-sans">{newXP.toLocaleString()}</span>
                                </p>

                                {/* Progress bar to next level */}
                                <div className="mt-8">
                                    <div className="flex justify-between text-base font-bold text-gray-700 mb-2">
                                        <span>Level {newLevel}</span>
                                        <span>{xpToNext > 0 ? `${xpToNext.toLocaleString()} XP lagi` : 'MAX'}</span>
                                    </div>
                                    <div className="h-5 bg-white/50 border-2 border-gray-900 rounded-full overflow-hidden shadow-inner">
                                        <motion.div
                                            className="h-full bg-blue-500 border-r-2 border-gray-900"
                                            initial={{ width: '0%' }}
                                            animate={{ width: leveledUp ? '100%' : `${progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </div>
                                    <p className="text-sm text-center text-gray-500 mt-2 italic font-medium">
                                        {progress}% menuju Level {newLevel + 1}
                                    </p>
                                </div>

                                {/* Close button - only show after animation */}
                                {animationDone && !isStreak && !leveledUp && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={onClose}
                                        className="mt-8 px-10 py-3 bg-blue-600 text-white border-2 border-gray-900 font-bold text-xl rounded-xl hover:bg-blue-700 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                    >
                                        Lanjutkan ✨
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {/* Streak Step */}
                        {step === 'streak' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                className="relative z-10 text-center"
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        y: [0, -10, 0]
                                    }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="w-24 h-24 mx-auto mb-6 bg-orange-500 border-4 border-gray-800 rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-3"
                                >
                                    <div className="relative">
                                        <Sparkles className="absolute -top-6 -right-6 w-8 h-8 text-yellow-400 animate-pulse" />
                                        <motion.div
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                        >
                                            <Trophy className="w-12 h-12 text-white" />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                <h2 className="text-4xl font-black text-orange-600 mb-2 drop-shadow-sm">
                                    STREAK! 🔥
                                </h2>

                                <div className="text-7xl font-black text-gray-900 mb-2 font-sans tabular-nums">
                                    {streakCount} <span className="text-2xl text-gray-400 font-handwriting">Hari</span>
                                </div>

                                <p className="text-gray-700 text-xl font-bold bg-white/50 py-2 rounded-xl mb-6">
                                    Makin gigih, makin deket <br />jadi ASN! 🦾
                                </p>

                                {animationDone && !leveledUp && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={onClose}
                                        className="mt-4 px-10 py-3 bg-orange-600 text-white border-2 border-gray-800 font-bold text-xl rounded-xl hover:bg-orange-700 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                    >
                                        Goo! 🚀
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
                                    className="w-24 h-24 mx-auto mb-6"
                                >
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-purple-500 border-2 border-gray-900 rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-3">
                                            <Trophy className="w-12 h-12 text-white" />
                                        </div>
                                        {/* Sparkles around */}
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0"
                                        >
                                            <Star className="absolute -top-3 left-1/2 w-6 h-6 text-yellow-500 fill-yellow-500 -translate-x-1/2" />
                                            <Star className="absolute top-1/2 -right-3 w-4 h-4 text-orange-500 fill-orange-500 -translate-y-1/2" />
                                            <Star className="absolute -bottom-2 left-1/4 w-5 h-5 text-purple-600 fill-purple-600" />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                <motion.h2
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                    className="text-4xl font-black text-purple-700 mb-2 drop-shadow-sm"
                                >
                                    LEVEL UP! 🎉
                                </motion.h2>

                                <div className="flex items-center justify-center gap-6 my-6 bg-white/40 border-2 border-dashed border-gray-400 p-4 rounded-2xl">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-gray-400 line-through decoration-red-400 font-sans">
                                            Level {previousLevel}
                                        </div>
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-widest mt-1">Dulu</div>
                                    </div>
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                    >
                                        <Sparkles className="w-8 h-8 text-yellow-500" />
                                    </motion.div>
                                    <div className="text-center">
                                        <div className="text-5xl font-black text-gray-900 font-sans">
                                            Level {newLevel}
                                        </div>
                                        <div className="text-sm text-blue-600 font-bold mt-1 px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                                            {newLevelName}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Sekarang!</div>
                                    </div>
                                </div>

                                <p className="text-gray-700 text-lg font-medium mb-8 leading-tight">
                                    Gokil! Kamu baru saja naik ke level baru. Terus semangat ya! 💪⚡
                                </p>

                                {/* Close button */}
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={onClose}
                                    className="px-10 py-4 bg-purple-600 text-white border-2 border-gray-900 font-bold text-2xl rounded-2xl hover:bg-purple-700 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Gaskan Lagi! 🚀
                                </motion.button>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

