import Image from 'next/image'
import { CheckCircle2, XCircle } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import type { UniversalReviewItem, UniversalReviewOption } from '@/src/services/practice-result.service'
import { cn } from '@/lib/utils'

function optionState(option: UniversalReviewOption, selected: Set<string>) {
    const isSelected = selected.has(option.id)
    if (isSelected && option.isCorrect) return 'selected-correct'
    if (isSelected && !option.isCorrect) return 'selected-wrong'
    if (option.isCorrect) return 'correct'
    return 'neutral'
}

function optionClass(state: ReturnType<typeof optionState>) {
    if (state === 'selected-correct') return 'border-green-700 bg-green-100'
    if (state === 'selected-wrong') return 'border-red-700 bg-red-100'
    if (state === 'correct') return 'border-green-500 bg-green-50'
    return 'border-gray-300 bg-white'
}

function OptionRow({ option, selected }: { option: UniversalReviewOption; selected: Set<string> }) {
    const state = optionState(option, selected)
    const isSelected = selected.has(option.id)
    return (
        <div className={cn('border-2 p-3', optionClass(state))}>
            <div className="flex items-start gap-3">
                <span className="flex h-7 min-w-7 items-center justify-center border-2 border-gray-900 bg-white text-xs font-black">
                    {option.key}
                </span>
                <div className="min-w-0 flex-1 space-y-2 font-semibold text-gray-800">
                    {option.imageUrl && (
                        <Image src={option.imageUrl} alt={`Pilihan ${option.key}`} width={640} height={360} unoptimized className="max-h-52 w-auto max-w-full object-contain" />
                    )}
                    <MathRenderer text={option.content} />
                    <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase">
                        {isSelected && <span className="border border-gray-900 bg-blue-100 px-2 py-0.5">Jawaban kamu</span>}
                        {option.isCorrect && <span className="border border-green-800 bg-green-200 px-2 py-0.5 text-green-900">Jawaban benar</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function groupedOptions(item: UniversalReviewItem) {
    const groups = new Map<string, UniversalReviewOption[]>()
    for (const option of item.options) {
        const key = option.responseGroup ?? 'Kelompok'
        const rows = groups.get(key) ?? []
        rows.push(option)
        groups.set(key, rows)
    }
    return Array.from(groups.entries())
}

export default function TkaResultReview({ items }: { items: UniversalReviewItem[] }) {
    return (
        <div className="space-y-5">
            {items.map((item) => {
                const selected = new Set(item.selectedOptionIds)
                const answered = item.selectedOptionIds.length > 0
                return (
                    <article key={item.questionId} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111] md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-black uppercase text-blue-700">{item.subjectCode} · {item.responseType}</div>
                                <h3 className="mt-1 text-xl font-black">Soal {item.position}</h3>
                            </div>
                            <div className={cn(
                                'inline-flex items-center gap-2 border-2 border-gray-900 px-3 py-1 text-sm font-black',
                                item.isCorrect === true ? 'bg-green-100 text-green-900' : item.isCorrect === false ? 'bg-red-100 text-red-900' : 'bg-gray-100 text-gray-700',
                            )}>
                                {item.isCorrect === true ? <CheckCircle2 size={16}/> : item.isCorrect === false ? <XCircle size={16}/> : null}
                                {item.isCorrect === true ? 'Benar' : item.isCorrect === false ? 'Belum tepat' : answered ? 'Dinilai' : 'Kosong'}
                                <span>{item.scoreAwarded}/{item.maxScore}</span>
                            </div>
                        </div>

                        {item.stimulus && (
                            <section className="mt-4 border-2 border-gray-900 bg-yellow-50 p-4">
                                {item.stimulus.title && <h4 className="mb-2 font-black">{item.stimulus.title}</h4>}
                                {item.stimulus.imageUrl && (
                                    <Image src={item.stimulus.imageUrl} alt="Stimulus soal" width={900} height={500} unoptimized className="mb-3 max-h-72 w-auto max-w-full object-contain" />
                                )}
                                <div className="whitespace-pre-wrap font-semibold leading-relaxed"><MathRenderer text={item.stimulus.content} /></div>
                            </section>
                        )}

                        <div className="mt-4 whitespace-pre-wrap text-lg font-bold leading-relaxed">
                            <MathRenderer text={item.stem} />
                        </div>

                        <div className="mt-5 space-y-3">
                            {item.responseType === 'category' ? (
                                groupedOptions(item).map(([group, options]) => (
                                    <section key={group} className="space-y-2 border-2 border-dashed border-gray-300 bg-gray-50 p-3">
                                        <h4 className="text-xs font-black uppercase text-gray-600">{group}</h4>
                                        {options.map((option) => <OptionRow key={option.id} option={option} selected={selected} />)}
                                    </section>
                                ))
                            ) : (
                                item.options.map((option) => <OptionRow key={option.id} option={option} selected={selected} />)
                            )}
                        </div>

                        <section className="mt-5 border-t-2 border-dashed border-gray-300 pt-4">
                            <h4 className="text-sm font-black uppercase text-gray-500">Pembahasan</h4>
                            <div className="mt-2 whitespace-pre-wrap font-semibold leading-relaxed text-gray-700">
                                {item.explanation ? <MathRenderer text={item.explanation} /> : 'Pembahasan belum tersedia.'}
                            </div>
                        </section>
                    </article>
                )
            })}
        </div>
    )
}
