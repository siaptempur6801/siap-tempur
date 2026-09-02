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
    if (state === 'selected-correct') return 'border-emerald-700 bg-emerald-50'
    if (state === 'selected-wrong') return 'border-red-700 bg-red-50'
    if (state === 'correct') return 'border-emerald-500 bg-emerald-50/60'
    return 'border-slate-900 bg-white'
}

function OptionRow({ option, selected }: { option: UniversalReviewOption; selected: Set<string> }) {
    const state = optionState(option, selected)
    const isSelected = selected.has(option.id)
    return (
        <div className={cn('border-2 p-3.5', optionClass(state))}>
            <div className="flex items-start gap-3">
                <span className={cn(
                    'flex h-8 min-w-8 items-center justify-center border-2 border-slate-900 text-xs font-black',
                    state === 'selected-correct' || state === 'correct'
                        ? 'bg-emerald-100 text-emerald-800'
                        : state === 'selected-wrong'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                )}>
                    {option.key}
                </span>
                <div className="min-w-0 flex-1 space-y-2 text-sm font-semibold leading-relaxed text-slate-800 md:text-base">
                    {option.imageUrl && (
                        <Image src={option.imageUrl} alt={`Pilihan ${option.key}`} width={640} height={360} unoptimized className="max-h-52 w-auto max-w-full object-contain" />
                    )}
                    <MathRenderer text={option.content} />
                    <div className="flex flex-wrap gap-2 text-[11px] font-black">
                        {isSelected && <span className="st-pill bg-blue-100 text-blue-700">Jawaban kamu</span>}
                        {option.isCorrect && <span className="st-pill bg-emerald-100 text-emerald-800">Jawaban benar</span>}
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
                    <article key={item.questionId} className="st-card p-5 md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-black uppercase tracking-wide text-blue-700">{item.subjectCode} · {item.responseType}</div>
                                <h3 className="st-heading mt-1 text-xl">Soal {item.position}</h3>
                            </div>
                            <div className={cn(
                                'st-pill',
                                item.isCorrect === true ? 'bg-emerald-100 text-emerald-800' : item.isCorrect === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600',
                            )}>
                                {item.isCorrect === true ? <CheckCircle2 size={16}/> : item.isCorrect === false ? <XCircle size={16}/> : null}
                                {item.isCorrect === true ? 'Benar' : item.isCorrect === false ? 'Belum tepat' : answered ? 'Dinilai' : 'Kosong'}
                                <span>{item.scoreAwarded}/{item.maxScore}</span>
                            </div>
                        </div>

                        {item.stimulus && (
                            <section className="st-warning mt-5 p-4">
                                {item.stimulus.title && <h4 className="st-heading mb-2">{item.stimulus.title}</h4>}
                                {item.stimulus.imageUrl && (
                                    <Image src={item.stimulus.imageUrl} alt="Stimulus soal" width={900} height={500} unoptimized className="mb-3 max-h-72 w-auto max-w-full object-contain" />
                                )}
                                <div className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700 md:text-base"><MathRenderer text={item.stimulus.content} /></div>
                            </section>
                        )}

                        <div className="mt-5 whitespace-pre-wrap text-lg font-bold leading-relaxed text-slate-950">
                            <MathRenderer text={item.stem} />
                        </div>

                        <div className="mt-5 space-y-3">
                            {item.responseType === 'category' ? (
                                groupedOptions(item).map(([group, options]) => (
                                    <section key={group} className="space-y-2 border-l-4 border-blue-300 bg-slate-50 p-3">
                                        <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">{group}</h4>
                                        {options.map((option) => <OptionRow key={option.id} option={option} selected={selected} />)}
                                    </section>
                                ))
                            ) : (
                                item.options.map((option) => <OptionRow key={option.id} option={option} selected={selected} />)
                            )}
                        </div>

                        <section className="mt-6 border-t-2 border-dashed border-slate-200 pt-5">
                            <h4 className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">Pembahasan</h4>
                            <div className="mt-2 whitespace-pre-wrap font-semibold leading-relaxed text-slate-700">
                                {item.explanation ? <MathRenderer text={item.explanation} /> : 'Pembahasan belum tersedia.'}
                            </div>
                        </section>
                    </article>
                )
            })}
        </div>
    )
}
