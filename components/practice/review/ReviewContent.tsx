import Image from 'next/image'
import { Sparkles, AlertCircle } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import PaperBackground from '@/components/PaperBackground'
import { cn } from '@/lib/utils'
import type { Answer, Question, Option } from './types'

interface ReviewContentProps {
    question: Question
    currentAnswer: Answer
    maxScoreOption: Option
}

export default function ReviewContent({
    question,
    currentAnswer,
    maxScoreOption,
}: ReviewContentProps) {
    const type = question.type
    const options = question.options || []

    return (
        <div className="flex-1 min-w-0 p-4 sm:p-8 xl:p-10 overflow-y-auto">
            <div className="relative mb-6 sm:mb-10 space-y-5">
                <div className="absolute -left-4 sm:-left-6 top-1 w-1 sm:h-full bg-blue-400 rounded-full opacity-50"></div>
                {question.image_url && (
                    <div className="w-full max-w-md mx-auto rounded-xl border-2 border-gray-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white relative">
                        <div className="absolute top-2 left-2 z-10 p-1.5 bg-yellow-300 border-2 border-gray-900 rounded shadow-sm -rotate-2">
                            <Sparkles size={14} className="text-gray-900" />
                        </div>
                        <Image
                            src={question.image_url}
                            alt="Ilustrasi Soal"
                            width={900}
                            height={520}
                            unoptimized
                            className="w-full h-auto object-contain max-h-[320px]"
                        />
                    </div>
                )}
                <div className="text-lg sm:text-2xl font-bold leading-relaxed text-gray-800 max-w-none">
                    <MathRenderer text={question.content} />
                </div>
            </div>

            <div className="space-y-2 sm:space-y-2.5 mb-7 sm:mb-8 max-w-none">
                {options.map((option: Option, i: number) => {
                    const isSelected = currentAnswer.option_id === option.id
                    const isCorrect = option.is_correct
                    const isMaxTKP = type === 'TKP' && option.id === maxScoreOption?.id

                    let borderClass = 'border-gray-200'
                    let bgClass = 'bg-white hover:bg-gray-50'
                    let textClass = 'text-gray-500'
                    let indicatorColor = 'border-gray-300 text-gray-300'

                    if (type === 'TKP') {
                        if (isSelected) {
                            borderClass = 'border-blue-600 border-solid'
                            bgClass = 'bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)]'
                            textClass = 'text-blue-900 font-bold'
                            indicatorColor = 'border-blue-600 bg-blue-600 text-white'
                        }
                        if (isMaxTKP && !isSelected) {
                            borderClass = 'border-green-500 border-dashed opacity-80'
                            bgClass = 'bg-green-50/50'
                        }
                    } else {
                        if (isSelected && isCorrect) {
                            borderClass = 'border-green-600'
                            bgClass = 'bg-green-50 shadow-[2px_2px_0px_0px_rgba(22,163,74,1)]'
                            textClass = 'text-green-900 font-bold'
                            indicatorColor = 'border-green-600 bg-green-600 text-white'
                        } else if (isSelected && !isCorrect) {
                            borderClass = 'border-red-600'
                            bgClass = 'bg-red-50 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]'
                            textClass = 'text-red-900 font-bold'
                            indicatorColor = 'border-red-600 bg-red-600 text-white'
                        } else if (!isSelected && isCorrect) {
                            borderClass = 'border-green-600 border-dashed'
                            bgClass = 'bg-green-50/50'
                            textClass = 'text-green-700 font-bold'
                            indicatorColor = 'border-green-600 bg-white text-green-600'
                        }
                    }

                    return (
                        <div key={option.id} className={cn(
                            "px-3 py-3.5 sm:px-3.5 sm:py-3.5 rounded-lg border-2 flex items-start gap-2.5 sm:gap-3 transition-all relative overflow-hidden group",
                            borderClass,
                            bgClass
                        )}>
                            <div className={cn(
                                "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm sm:text-base",
                                indicatorColor
                            )}>
                                {String.fromCharCode(65 + i)}
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                                {option.image_url && (
                                    <Image
                                        src={option.image_url}
                                        alt={`Pilihan ${String.fromCharCode(65 + i)}`}
                                        width={360}
                                        height={240}
                                        unoptimized
                                        className="max-h-44 w-full max-w-sm object-contain rounded-lg border-2 border-gray-200 bg-white"
                                    />
                                )}
                                {option.content.trim() && (
                                    <div className={cn("text-[15px] sm:text-lg leading-snug wrap-break-word", textClass)}>
                                        <MathRenderer text={option.content} />
                                    </div>
                                )}

                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                    {isSelected && <span className="text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-gray-900 text-white shadow-sm">Pilihan Anda</span>}
                                    {type !== 'TKP' && isCorrect && <span className="text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border-2 border-green-600 bg-white text-green-700 shadow-sm">Kunci</span>}
                                    {type === 'TKP' && option.score_value > 0 && (
                                        <span className={cn(
                                            "text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border-2 shadow-sm",
                                            option.score_value === 5 ? "bg-green-500 text-white border-green-700" : "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            Poin: {option.score_value}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {question.explanation && (
                <div className="relative group max-w-none">
                    <div className="absolute -top-3 left-10 w-24 h-7 bg-yellow-200/50 border border-white/40 shadow-sm rotate-2 z-20"></div>

                    <div className="bg-[#fff740] border-2 border-gray-900 p-5 sm:p-8 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                        <PaperBackground />
                        <div className="flex items-center gap-3 font-bold text-gray-900 mb-3 sm:mb-4 text-xl sm:text-2xl relative z-10">
                            <AlertCircle size={20} className="text-orange-600 fill-yellow-100 sm:w-6 sm:h-6" />
                            <span>Mengapa Begitu?</span>
                        </div>
                        <div className="text-base sm:text-xl text-gray-800 leading-relaxed relative z-10 font-medium italic">
                            <MathRenderer text={question.explanation} />
                        </div>
                        <div className="absolute bottom-2 right-3 opacity-20 z-10">
                            <Sparkles size={40} className="text-gray-900" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
