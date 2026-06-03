import { AnimatePresence, motion } from 'framer-motion'
import { Map, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBJECTS } from '@/lib/constants'
import type { Answer, Question } from './types'

interface ReviewSidebarProps {
    showNav: boolean
    setShowNav: (show: boolean) => void
    sortedAnswers: Answer[]
    currentIndex: number
    setCurrentIndex: (index: number) => void
    getReviewStatus: (ans: Answer, q: Question) => 'perfect' | 'good' | 'bad' | 'correct' | 'wrong'
}

export default function ReviewSidebar({
    showNav,
    setShowNav,
    sortedAnswers,
    currentIndex,
    setCurrentIndex,
    getReviewStatus,
}: ReviewSidebarProps) {
    const renderNavigationButtons = (onItemClick?: () => void) => {
        return [SUBJECTS.TWK.short, SUBJECTS.TIU.short, SUBJECTS.TKP.short].map((questionType) => {
            const filteredAnswers = sortedAnswers
                .map((ans, idx) => ({ ans, idx }))
                .filter(({ ans }) => {
                    const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                    return q.type === questionType
                })

            if (filteredAnswers.length === 0) return null

            let numberOffset = 0
            if (questionType === SUBJECTS.TIU.short) {
                numberOffset = sortedAnswers.filter(a => {
                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                    return q.type === SUBJECTS.TWK.short
                }).length
            } else if (questionType === SUBJECTS.TKP.short) {
                numberOffset = sortedAnswers.filter(a => {
                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                    return q.type === SUBJECTS.TWK.short || q.type === SUBJECTS.TIU.short
                }).length
            }

            return (
                <div key={questionType}>
                    <div className="text-[11px] font-bold text-gray-800 mb-2 px-1 uppercase tracking-[0.2em] border-s-4 border-gray-900 ps-2">
                        {questionType}
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                        {filteredAnswers.map(({ ans, idx }, positionInGroup) => {
                            const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                            const s = getReviewStatus(ans, q)
                            const displayNumber = positionInGroup + 1 + numberOffset

                            let colorClass = 'bg-white text-gray-400 border-gray-300'
                            if (q.type === 'TKP') {
                                if (s === 'perfect') colorClass = 'bg-green-500 text-white border-green-700'
                                else if (s === 'good') colorClass = 'bg-blue-500 text-white border-blue-700'
                                else colorClass = 'bg-orange-500 text-white border-orange-700'
                            } else {
                                if (s === 'correct') colorClass = 'bg-green-500 text-white border-green-700'
                                else colorClass = 'bg-red-500 text-white border-red-700'
                            }

                            return (
                                <button
                                    key={ans.id}
                                    onClick={() => {
                                        setCurrentIndex(idx)
                                        if (onItemClick) onItemClick()
                                    }}
                                    className={cn(
                                        "aspect-square w-full rounded-[6px] font-bold text-[11px] flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                        currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-1 scale-105 z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'hover:scale-[1.03]',
                                        colorClass
                                    )}
                                >
                                    {displayNumber}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )
        })
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <AnimatePresence initial={false}>
                {showNav && (
                    <motion.aside
                        initial={{ x: 280, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 280, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="hidden lg:flex h-full min-h-0 shrink-0 flex-col lg:w-[248px] xl:w-[260px] border-l-2 border-dashed border-gray-300 bg-[#fff9c4]/80 backdrop-blur-sm"
                    >
                        <div className="shrink-0 px-2.5 py-3 border-b-2 border-dashed border-gray-300 font-bold text-sm flex items-center gap-2 bg-white/30">
                            <Map size={16} />
                            <span>Daftar Pembahasan</span>
                        </div>

                        <div className="min-h-0 flex-1 px-2 py-3 space-y-3 overflow-y-auto">
                            <div className="hidden lg:flex items-center gap-3 text-[11px] text-gray-700">
                                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-700"></div><span>Benar</span></div>
                                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-700"></div><span>Salah</span></div>
                                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-700"></div><span>Sedang</span></div>
                            </div>
                            {renderNavigationButtons()}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {showNav && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] lg:hidden"
                        onClick={() => setShowNav(false)}
                    >
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.22 }}
                            className="ml-auto h-full w-[260px] border-l border-gray-900 bg-[#fff9c4] shadow-[-4px_0_0_0_rgba(0,0,0,1)]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="px-3 py-3 border-b-2 border-dashed border-gray-300 font-bold text-sm flex items-center justify-between bg-white/30">
                                <div className="flex items-center gap-2">
                                    <Map size={16} />
                                    <span>Daftar Pembahasan</span>
                                </div>
                                <button
                                    onClick={() => setShowNav(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="px-2 py-3 space-y-3 h-[calc(100%-57px)] overflow-y-auto">
                                <div className="flex items-center gap-3 text-[11px] text-gray-700">
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-700"></div><span>Benar</span></div>
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-700"></div><span>Salah</span></div>
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-700"></div><span>Sedang</span></div>
                                </div>
                                {renderNavigationButtons(() => setShowNav(false))}
                            </div>
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
