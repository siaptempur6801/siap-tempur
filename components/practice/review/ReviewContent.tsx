import Image from 'next/image'
import { Info } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
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
    <div className="h-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="space-y-5">
          {question.image_url && (
            <div className="mx-auto w-full max-w-lg overflow-hidden border border-slate-200 bg-white">
              <Image
                src={question.image_url}
                alt="Ilustrasi soal"
                width={900}
                height={520}
                unoptimized
                className="h-auto max-h-[340px] w-full object-contain"
              />
            </div>
          )}
          <div className="max-w-none text-base font-semibold leading-7 text-slate-900 sm:text-lg">
            <MathRenderer text={question.content} />
          </div>
        </div>

        <div className="mt-7 space-y-2.5">
          {options.map((option: Option, index: number) => {
            const isSelected = currentAnswer.option_id === option.id
            const isCorrect = option.is_correct
            const isMaxTKP = type === 'TKP' && option.id === maxScoreOption?.id

            let containerClass = 'border-slate-200 bg-white'
            let indicatorClass = 'border-slate-300 bg-white text-slate-500'
            let textClass = 'text-slate-700'

            if (type === 'TKP') {
              if (isSelected) {
                containerClass = 'border-blue-500 bg-blue-50'
                indicatorClass = 'border-blue-600 bg-blue-600 text-white'
                textClass = 'font-bold text-blue-950'
              } else if (isMaxTKP) {
                containerClass = 'border-emerald-300 bg-emerald-50/60'
              }
            } else if (isSelected && isCorrect) {
              containerClass = 'border-emerald-500 bg-emerald-50'
              indicatorClass = 'border-emerald-600 bg-emerald-600 text-white'
              textClass = 'font-bold text-emerald-950'
            } else if (isSelected && !isCorrect) {
              containerClass = 'border-red-500 bg-red-50'
              indicatorClass = 'border-red-600 bg-red-600 text-white'
              textClass = 'font-bold text-red-950'
            } else if (!isSelected && isCorrect) {
              containerClass = 'border-emerald-300 bg-emerald-50/60'
              indicatorClass = 'border-emerald-600 bg-white text-emerald-700'
              textClass = 'font-bold text-emerald-900'
            }

            return (
              <div
                key={option.id}
                className={cn('flex items-start gap-3 border p-3 sm:p-4', containerClass)}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black',
                    indicatorClass,
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  {option.image_url && (
                    <Image
                      src={option.image_url}
                      alt={`Pilihan ${String.fromCharCode(65 + index)}`}
                      width={360}
                      height={240}
                      unoptimized
                      className="max-h-44 w-full max-w-sm border border-slate-200 bg-white object-contain"
                    />
                  )}
                  {option.content.trim() && (
                    <div className={cn('text-sm leading-6 sm:text-base', textClass)}>
                      <MathRenderer text={option.content} />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {isSelected && (
                      <span className="border border-slate-300 bg-slate-900 px-2 py-1 text-[10px] font-black uppercase text-white">
                        Jawaban kamu
                      </span>
                    )}
                    {type !== 'TKP' && isCorrect && (
                      <span className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                        Jawaban benar
                      </span>
                    )}
                    {type === 'TKP' && option.score_value > 0 && (
                      <span
                        className={cn(
                          'border px-2 py-1 text-[10px] font-black uppercase',
                          option.score_value === 5
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700',
                        )}
                      >
                        {option.score_value} poin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {question.explanation && (
          <div className="mt-7 border-2 border-slate-900 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-base font-black text-slate-950">
              <Info size={18} className="text-amber-700" /> Pembahasan
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
              <MathRenderer text={question.explanation} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
