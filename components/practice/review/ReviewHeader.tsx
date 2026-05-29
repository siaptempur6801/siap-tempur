import { motion } from 'framer-motion'
import { CheckCircle2, Map, Sparkles, XCircle } from 'lucide-react'
import { cn, formatSubjectName } from '@/lib/utils'
import type { Answer, Question } from './types'

interface ReviewHeaderProps {
    currentIndex: number
    question: Question
    currentAnswer: Answer
    status: 'perfect' | 'good' | 'bad' | 'correct' | 'wrong'
    showNav: boolean
    setShowNav: (show: boolean) => void
}

export default function ReviewHeader({
    currentIndex,
    question,
    currentAnswer,
    status,
    showNav,
    setShowNav,
}: ReviewHeaderProps) {
    const type = question.type

    return (
        <div className="p-3 sm:p-5 border-b-2 border-dashed border-gray-300 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-yellow-50/50 gap-3 relative z-10">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                    <h2 className="font-bold text-xl sm:text-2xl text-gray-900 leading-tight">
                        Pembahasan <span className="font-sans">#{currentIndex + 1}</span>
                    </h2>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] sm:text-xs font-bold rounded-full rotate-2">
                                {question.type}
                            </span>
                            {question.category && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border-2 border-blue-200 text-[10px] sm:text-xs font-bold rounded-lg -rotate-1 shadow-sm">
                                    {formatSubjectName(question.category)}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:hidden ml-auto">
                            <div className="px-2.5 py-0.5 bg-white border-2 border-gray-900 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-none">
                                {type === 'TKP' ? (
                                    <span className={cn(
                                        "flex items-center gap-1",
                                        status === 'perfect' ? 'text-green-600' : status === 'good' ? 'text-blue-600' : 'text-orange-600'
                                    )}>
                                        <Sparkles size={12} /> +<span className="font-sans">{currentAnswer.selected_option?.score_value || 0}</span>
                                    </span>
                                ) : (
                                    status === 'correct' ? (
                                        <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle2 size={13} /> Benar</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-600 font-bold"><XCircle size={13} /> Salah</span>
                                    )
                                )}
                            </div>

                            <button
                                onClick={() => setShowNav(!showNav)}
                                className={cn(
                                    "inline-flex items-center justify-center w-8 h-6 bg-white rounded-full border-2 transition-all shadow-none",
                                    showNav
                                        ? "text-blue-700 border-blue-900 hover:bg-blue-50"
                                        : "text-gray-600 border-gray-900 hover:bg-gray-50"
                                )}
                                title={showNav ? 'Sembunyikan navigasi pembahasan' : 'Tampilkan navigasi pembahasan'}
                            >
                                <motion.div animate={{ rotate: showNav ? 0 : 180 }}>
                                    <Map size={12} />
                                </motion.div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Badge + Nav Toggle (Desktop) */}
            <div className="hidden sm:flex items-center gap-2 self-start sm:self-center">
                <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white border-2 border-gray-900 rounded-full text-xs sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2 shadow-none sm:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {type === 'TKP' ? (
                        <span className={cn(
                            "flex items-center gap-1.5",
                            status === 'perfect' ? 'text-green-600' : status === 'good' ? 'text-blue-600' : 'text-orange-600'
                        )}>
                            <Sparkles size={14} className="sm:w-[18px] sm:h-[18px]" /> +<span className="font-sans">{currentAnswer.selected_option?.score_value || 0}</span> Poin
                        </span>
                    ) : (
                        status === 'correct' ? (
                            <span className="flex items-center gap-1.5 text-green-600 font-bold"><CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" /> Benar</span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-red-600 font-bold"><XCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> Salah</span>
                        )
                    )}
                </div>

                <button
                    onClick={() => setShowNav(!showNav)}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white rounded-full border-2 text-xs sm:text-lg font-bold transition-all shadow-none sm:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                        showNav
                            ? "text-blue-700 border-blue-900 hover:bg-blue-50"
                            : "text-gray-600 border-gray-900 hover:bg-gray-50"
                    )}
                    title={showNav ? 'Sembunyikan navigasi pembahasan' : 'Tampilkan navigasi pembahasan'}
                >
                    <motion.div animate={{ rotate: showNav ? 0 : 180 }}>
                        <Map size={14} className="sm:w-[18px] sm:h-[18px]" />
                    </motion.div>
                    <span>{showNav ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}</span>
                </button>
            </div>
        </div>
    )
}
