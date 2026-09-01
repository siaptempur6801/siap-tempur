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
    if (state === 'selected-correct') return 'border-emerald-300 bg-emerald-50'
    if (state === 'selected-wrong') return 'border-red-300 bg-red-50'
    if (state === 'correct') return 'border-emerald-200 bg-emerald-50/60'
    return 'border-slate-200 bg-white'
}

function OptionRow({ option, selected }: { option: UniversalReviewOption; selected: Set<string> }) {
    const state = optionState(option, selected)
    const isSelected = selected.has(option.id)
    return (
        <div className={cn('rounded-2xl border p-3.5', optionClass(state))}>
            <div className="flex items-start gap-3">
                <span className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-lg border text-xs font-bold',
                    state === 'selected-correct' || state === 'correct'
                        ? 'border-emerald-300 bg-white text-emerald-700'
                        : state === 'selected-wrong'
                            ? 'border-red-300 bg-white text-red-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                )}>
                    {option.key}
                </span>
                <div className="min-w-0 flex-1 space-y-2 text-sm font-medium leading-relaxed text-slate-800 md:text-base">
                    {option.imageUrl && (
                        <Image src={option.imageUrl} alt={`Pilihan ${option.key}`} width={640} height={360} unoptimized className="max-h-52 w-auto max-w-full rounded-xl object-contain" />
                    )}
                    <MathRenderer text={option.content} />
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                        {isSelected && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Jawaban kamu</span>}
                        {option.isCorrect && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Jawaban benar</span>}
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
                    <article key={item.questionId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)] md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{item.subjectCode} · {item.responseType}</div>
                                <h3 className="mt-1 text-xl font-bold text-slate-950">Soal {item.position}</h3>
                            </div>
                            <div className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold',
                                item.isCorrect === true ? 'bg-emerald-50 text-emerald-700' : item.isCorrect === false ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600',
                            )}>
                                {item.isCorrect === true ? <CheckCircle2 size={16}/> : item.isCorrect === false ? <XCircle size={16}/> : null}
                                {item.isCorrect === true ? 'Benar' : item.isCorrect === false ? 'Belum tepat' : answered ? 'Dinilai' : 'Kosong'}
                                <span>{item.scoreAwarded}/{item.maxScore}</span>
                            </div>
                        </div>

                        {item.stimulus && (
                            <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                {item.stimulus.title && <h4 className="mb-2 font-bold text-slate-950">{item.stimulus.title}</h4>}
                                {item.stimulus.imageUrl && (
                                    <Image src={item.stimulus.imageUrl} alt="Stimulus soal" width={900} height={500} unoptimized className="mb-3 max-h-72 w-auto max-w-full rounded-xl object-contain" />
                                )}
                                <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700 md:text-base"><MathRenderer text={item.stimulus.content} /></div>
                            </section>
                        )}

                        <div className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed text-slate-950">
                            <MathRenderer text={item.stem} />
                        </div>

                        <div className="mt-5 space-y-3">
                            {item.responseType === 'category' ? (
                                groupedOptions(item).map(([group, options]) => (
                                    <section key={group} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h4>
                                        {options.map((option) => <OptionRow key={option.id} option={option} selected={selected} />)}
                                    </section>
                                ))
                            ) : (
                                item.options.map((option) => <OptionRow key={option.id} option={option} selected={selected} />)
                            )}
                        </div>

                        <section className="mt-6 border-t border-slate-100 pt-5">
                            <h4 className="text-sm font-semibold text-slate-500">Pembahasan</h4>
                            <div className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">
                                {item.explanation ? <MathRenderer text={item.explanation} /> : 'Pembahasan belum tersedia.'}
                            </div>
                        </section>
                    </article>
                )
            })}
        </div>
    )
}
